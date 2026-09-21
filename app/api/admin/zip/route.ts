import {NextRequest, NextResponse} from "next/server";
import {Zip, ZipPassThrough} from "fflate";

import {createClient, createServiceClient} from "@/lib/supabase/server";

// Node runtime is required for the ZIP stream.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SYNC_PHOTOS = 120;

type PhotoRow = {
    id: string;
    original_path: string;
    guest_name: string | null;
    created_at: string;
};

type ExportRole = "admin" | "owner" | "couple";

function jsonError(status: number, code: string, message: string) {
    return NextResponse.json(
        {
            error: message,
            code,
        },
        {
            status,
            headers: {
                "Cache-Control": "no-store",
            },
        }
    );
}

function buildPhotoFilename(photo: PhotoRow, index: number) {
    const order = String(index + 1).padStart(3, "0");

    const guestSlug = photo.guest_name
        ? `-${photo.guest_name
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/gi, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 30)}`
        : "";

    return `${order}${guestSlug}.webp`;
}

export async function GET(request: NextRequest) {
    /*
     * ============================================
     * AUTHENTICATION
     * ============================================
     */
    const authClient = await createClient();

    const {
        data: {user},
        error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
        return jsonError(401, "UNAUTHORIZED", "Unauthorized");
    }

    /*
     * ============================================
     * INPUT
     * ============================================
     */
    const {searchParams} = new URL(request.url);

    const weddingId = searchParams.get("weddingId");

    const rawFilter = searchParams.get("filter") ?? "all";

    if (!weddingId) {
        return jsonError(400, "MISSING_WEDDING_ID", "Missing weddingId");
    }

    if (rawFilter !== "all" && rawFilter !== "favourites") {
        return jsonError(400, "INVALID_FILTER", "Invalid ZIP filter");
    }

    const filter: "all" | "favourites" = rawFilter;

    const service = createServiceClient();

    /*
     * ============================================
     * EXACT WEDDING AUTHORIZATION
     *
     * Allowed:
     * - global admin
     * - owner of this exact wedding
     * - assigned couple of this exact wedding
     *
     * Service role is used only AFTER the
     * authenticated user is resolved.
     * ============================================
     */
    const [adminResult, weddingResult] = await Promise.all([
        service.from("admins").select("id").eq("id", user.id).maybeSingle(),

        service
            .from("weddings")
            .select("id, owner_user_id")
            .eq("id", weddingId)
            .maybeSingle(),
    ]);

    if (adminResult.error) {
        console.error("ZIP admin lookup error:", adminResult.error);

        return jsonError(500, "AUTHORIZATION_FAILED", "Unable to verify access");
    }

    if (weddingResult.error) {
        console.error("ZIP wedding lookup error:", weddingResult.error);

        return jsonError(500, "WEDDING_LOOKUP_FAILED", "Unable to load wedding");
    }

    const wedding = weddingResult.data;

    if (!wedding) {
        return jsonError(404, "WEDDING_NOT_FOUND", "Wedding not found");
    }

    let role: ExportRole | null = null;

    /*
     * GLOBAL ADMIN
     */
    if (adminResult.data) {
        role = "admin";
    }

    /*
     * OWNER
     */
    if (!role && wedding.owner_user_id === user.id) {
        role = "owner";
    }

    /*
     * ASSIGNED COUPLE
     */
    if (!role) {
        const appMetadata = user.app_metadata as {
            role?: string;
            wedding_id?: string;
        };

        if (
            appMetadata.role === "couple" &&
            appMetadata.wedding_id === wedding.id
        ) {
            const {data: settings, error: settingsError} = await service
                .from("wedding_settings")
                .select("enable_couple_login")
                .eq("wedding_id", wedding.id)
                .maybeSingle();

            if (settingsError) {
                console.error("ZIP couple settings lookup error:", settingsError);

                return jsonError(
                    500,
                    "AUTHORIZATION_FAILED",
                    "Unable to verify access"
                );
            }

            if (settings?.enable_couple_login) {
                role = "couple";
            }
        }
    }

    if (!role) {
        return jsonError(403, "FORBIDDEN", "Forbidden");
    }

    /*
     * ============================================
     * PHOTO QUERY
     *
     * Preserve the existing export behaviour:
     * - approved
     * - not hidden
     * - optionally favourites only
     *
     * is_public is deliberately NOT required:
     * this is an authenticated management export,
     * not the public shared gallery.
     * ============================================
     */
    let query = service
        .from("photos")
        .select(
            `
                id,
                original_path,
                guest_name,
                created_at
            `
        )
        .eq("wedding_id", wedding.id)
        .eq("hidden", false)
        .eq("approved", true)
        .not("original_path", "is", null)
        .order("created_at", {
            ascending: true,
        })
        /*
         * Fetch one extra row so we can
         * safely reject oversized synchronous
         * exports without running an additional
         * count query.
         */
        .limit(MAX_SYNC_PHOTOS + 1);

    if (filter === "favourites") {
        query = query.eq("favourite", true);
    }

    const {data, error: photoQueryError} = await query;

    if (photoQueryError) {
        console.error("ZIP photo query error:", photoQueryError);

        return jsonError(500, "PHOTO_QUERY_FAILED", "Unable to load photos");
    }

    const photos = (data ?? []) as PhotoRow[];

    if (photos.length === 0) {
        return jsonError(404, "NO_PHOTOS", "No photos found");
    }

    if (photos.length > MAX_SYNC_PHOTOS) {
        return jsonError(
            413,
            "EXPORT_TOO_LARGE",
            `This album contains more than ${MAX_SYNC_PHOTOS} photos and requires a queued export`
        );
    }

    /*
     * ============================================
     * STORAGE DOWNLOAD
     *
     * Use the authorized service client directly.
     * No signed URL needs to be generated or
     * exposed for ZIP generation.
     * ============================================
     */
    const downloadPhoto = async (photo: PhotoRow): Promise<Uint8Array | null> => {
        try {
            const {data: blob, error: storageError} = await service.storage
                .from("photos")
                .download(photo.original_path);

            if (storageError || !blob) {
                console.error("ZIP storage download failed:", {
                    photoId: photo.id,
                    path: photo.original_path,
                    error: storageError,
                });

                return null;
            }

            const buffer = await blob.arrayBuffer();

            if (buffer.byteLength === 0) {
                console.error("ZIP storage object is empty:", {
                    photoId: photo.id,
                    path: photo.original_path,
                });

                return null;
            }

            return new Uint8Array(buffer);
        } catch (error) {
            console.error("ZIP photo download exception:", {
                photoId: photo.id,
                path: photo.original_path,
                error,
            });

            return null;
        }
    };

    /*
     * Download one valid photo before response
     * headers are sent. This prevents returning
     * a technically valid but completely empty ZIP
     * when every Storage object is unavailable.
     */
    let firstSuccessful: {
        index: number;
        bytes: Uint8Array;
    } | null = null;

    for (let i = 0; i < photos.length; i++) {
        const bytes = await downloadPhoto(photos[i]);

        if (bytes) {
            firstSuccessful = {
                index: i,
                bytes,
            };

            break;
        }
    }

    if (!firstSuccessful) {
        return jsonError(
            502,
            "PHOTO_DOWNLOAD_FAILED",
            "The photos could not be loaded from storage"
        );
    }

    /*
     * ============================================
     * ZIP STREAM
     * ============================================
     */
    const readable = new ReadableStream<Uint8Array>({
        start(controller) {
            let finished = false;

            const zip = new Zip((error, chunk, final) => {
                if (finished) {
                    return;
                }

                if (error) {
                    finished = true;

                    console.error("ZIP stream error:", error);

                    controller.error(error);

                    return;
                }

                if (chunk.length > 0) {
                    controller.enqueue(chunk);
                }

                if (final) {
                    finished = true;

                    controller.close();
                }
            });

            const addPhoto = (photo: PhotoRow, index: number, bytes: Uint8Array) => {
                const file = new ZipPassThrough(buildPhotoFilename(photo, index));

                zip.add(file);

                file.push(bytes, true);
            };

            void (async () => {
                /*
                 * Add the photo we already
                 * downloaded during preflight.
                 */
                addPhoto(
                    photos[firstSuccessful!.index],
                    firstSuccessful!.index,
                    firstSuccessful!.bytes
                );


                for (let i = firstSuccessful!.index + 1; i < photos.length; i++) {
                    const bytes = await downloadPhoto(photos[i]);

                    if (!bytes) {
                        continue;
                    }

                    addPhoto(photos[i], i, bytes);
                }

                zip.end();
            })().catch((error) => {
                if (finished) {
                    return;
                }

                finished = true;

                console.error("ZIP processing error:", error);

                controller.error(error);
            });
        },
    });

    const label = filter === "favourites" ? "favourites" : "all-photos";

    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(readable, {
        status: 200,

        headers: {
            "Content-Type": "application/zip",

            "Content-Disposition": `attachment; filename="wedding-photos-${label}-${date}.zip"`,

            "Cache-Control": "private, no-store, max-age=0",

            "X-Content-Type-Options": "nosniff",

            "X-Wedora-Export-Role": role,
        },
    });
}
