"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

import { photoUpdateSchema } from "@/schemas";
import type { PhotoUpdate } from "@/types/database";
import { getWeddingEntitlements, type WeddingEntitlements } from "@/lib/plans";

type PhotoActorRole = "admin" | "owner" | "couple";

type PhotoActor = {
    user: User;
    supabase: ReturnType<typeof createServiceClient>;
    isAdmin: boolean;
    coupleWeddingId?: string;
};

/*
 * ============================================
 * AUTH / ACCESS HELPERS
 * ============================================
 */
async function getPhotoActor(): Promise<PhotoActor> {
    const authClient = await createClient();

    const {
        data: { user },
        error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
        throw new Error("Unauthorized");
    }

    const supabase = createServiceClient();

    const { data: admin, error: adminError } = await supabase
        .from("admins")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

    if (adminError) {
        console.error("Admin lookup failed:", adminError);

        throw new Error("Failed to verify access");
    }

    const metadata = user.app_metadata as {
        role?: string;
        wedding_id?: string;
    };

    return {
        user,
        supabase,
        isAdmin: Boolean(admin),
        coupleWeddingId:
            metadata.role === "couple" ? metadata.wedding_id : undefined,
    };
}

async function requireWeddingPhotoAccess(
    weddingId: string,
    actor?: PhotoActor,
): Promise<
    PhotoActor & {
    weddingId: string;
    role: PhotoActorRole;
    entitlements: WeddingEntitlements;
}
> {
    const context = actor ?? (await getPhotoActor());

    const { user, supabase } = context;

    const { data: wedding, error: weddingError } = await supabase
        .from("weddings")
        .select("id, owner_user_id, plan, addons")
        .eq("id", weddingId)
        .maybeSingle();

    if (weddingError) {
        console.error("Wedding access lookup failed:", weddingError);

        throw new Error("Failed to verify wedding access");
    }

    if (!wedding) {
        throw new Error("Wedding not found");
    }

    const entitlements = getWeddingEntitlements(wedding.plan, wedding.addons);

    /* Global admin */
    if (context.isAdmin) {
        return {
            ...context,
            weddingId,
            role: "admin",
            entitlements,
        };
    }

    /* Assigned couple */
    if (context.coupleWeddingId === weddingId) {
        const { data: settings, error: settingsError } = await supabase
            .from("wedding_settings")
            .select("enable_couple_login")
            .eq("wedding_id", weddingId)
            .maybeSingle();

        if (settingsError) {
            console.error("Couple settings lookup failed:", settingsError);

            throw new Error("Failed to verify couple access");
        }

        if (!settings?.enable_couple_login) {
            throw new Error("Couple access disabled");
        }

        return {
            ...context,
            weddingId,
            role: "couple",
            entitlements,
        };
    }

    /* Wedding owner */
    if (wedding.owner_user_id === user.id) {
        return {
            ...context,
            weddingId,
            role: "owner",
            entitlements,
        };
    }

    throw new Error("Forbidden");
}

async function requirePhotoAccess(
    photoId: string,
    expectedWeddingId?: string,
    actor?: PhotoActor,
) {
    const context = actor ?? (await getPhotoActor());

    const { data: photo, error: photoError } = await context.supabase
        .from("photos")
        .select(
            `
                id,
                wedding_id,
                original_path,
                thumbnail_path
            `,
        )
        .eq("id", photoId)
        .maybeSingle();

    if (photoError) {
        console.error("Photo lookup failed:", photoError);

        throw new Error("Failed to load photo");
    }

    if (!photo) {
        throw new Error("Photo not found");
    }

    if (expectedWeddingId && photo.wedding_id !== expectedWeddingId) {
        throw new Error("Photo does not belong to this wedding");
    }

    const access = await requireWeddingPhotoAccess(photo.wedding_id, context);

    return {
        ...access,
        photo,
    };
}

async function requirePhotoPathAccess(
    path: string,
    bucket: "photos" | "thumbnails",
) {
    const actor = await getPhotoActor();

    let query = actor.supabase.from("photos").select(`
                id,
                wedding_id,
                original_path,
                thumbnail_path
            `);

    query =
        bucket === "thumbnails"
            ? query.eq("thumbnail_path", path)
            : query.eq("original_path", path);

    const { data: photo, error: photoError } = await query.maybeSingle();

    if (photoError) {
        console.error("Photo path lookup failed:", photoError);

        throw new Error("Failed to load photo");
    }

    if (!photo) {
        throw new Error("Photo not found");
    }

    const access = await requireWeddingPhotoAccess(photo.wedding_id, actor);

    return {
        ...access,
        photo,
    };
}

function revalidateWeddingPhotos(weddingId: string) {
    /* Current public-gallery tag. */
    revalidateTag("gallery-photos", "max");

    /* Preferred wedding-scoped tag. */
    revalidateTag(`gallery-wedding-${weddingId}`, "max");

    /* Legacy compatibility while old caches disappear. */
    revalidateTag(`gallery-photos-${weddingId}`, "max");

    revalidatePath(`/admin/weddings/${weddingId}/photos`);

    revalidatePath(`/couple/weddings/${weddingId}/photos`);

    revalidatePath("/admin/photos");
}

/*
 * ============================================
 * PHOTO MUTATIONS
 * ============================================
 */
export async function updatePhotoAction(
    id: string,
    weddingId: string,
    update: Partial<PhotoUpdate>,
): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const parsed = photoUpdateSchema.safeParse({
            id,
            ...update,
        });

        if (!parsed.success) {
            return {
                success: false,
                error: "Invalid input",
            };
        }

        const { supabase } = await requirePhotoAccess(id, weddingId);

        const { approved, hidden, favourite } = parsed.data;

        const payload: PhotoUpdate = {};

        if (approved !== undefined) {
            payload.approved = approved;
        }

        if (hidden !== undefined) {
            payload.hidden = hidden;
        }

        if (favourite !== undefined) {
            payload.favourite = favourite;
        }

        const { data: updatedPhoto, error } = await supabase
            .from("photos")
            .update(payload)
            .eq("id", id)
            .eq("wedding_id", weddingId)
            .select("id")
            .maybeSingle();

        if (error) {
            console.error("Photo update failed:", error);

            return {
                success: false,
                error: "Failed to update photo",
            };
        }

        if (!updatedPhoto) {
            return {
                success: false,
                error: "Photo not found",
            };
        }

        revalidateWeddingPhotos(weddingId);

        return {
            success: true,
        };
    } catch (error) {
        console.error("Update photo action failed:", error);

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

export async function deletePhotoAction(
    id: string,
    weddingId: string,
): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const { supabase, photo } = await requirePhotoAccess(id, weddingId);

        /*
         * Delete the DB row first.
         *
         * If Storage cleanup later fails, we only leave
         * private orphan objects. We never leave a live DB
         * row pointing at files that have already vanished.
         */
        const { data: deletedPhoto, error: dbError } = await supabase
            .from("photos")
            .delete()
            .eq("id", id)
            .eq("wedding_id", weddingId)
            .select("id")
            .maybeSingle();

        if (dbError) {
            console.error("Photo DB delete failed:", dbError);

            return {
                success: false,
                error: "Failed to delete photo",
            };
        }

        if (!deletedPhoto) {
            return {
                success: false,
                error: "Photo not found",
            };
        }

        const [originalCleanup, thumbnailCleanup] = await Promise.all([
            supabase.storage.from("photos").remove([photo.original_path]),

            supabase.storage.from("thumbnails").remove([photo.thumbnail_path]),
        ]);

        if (originalCleanup.error || thumbnailCleanup.error) {
            /*
             * DB delete already succeeded. The user-facing
             * delete is complete; log orphan cleanup failures
             * instead of pretending the photo still exists.
             */
            console.error("Photo storage cleanup incomplete:", {
                original: originalCleanup.error,
                thumbnail: thumbnailCleanup.error,
                photoId: id,
                weddingId,
            });
        }

        revalidateWeddingPhotos(weddingId);

        return {
            success: true,
        };
    } catch (error) {
        console.error("Delete photo action failed:", error);

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/*
 * ============================================
 * SIGNED URLS
 * ============================================
 */
export async function getSignedUrlAction(
    path: string,
    bucket: "photos" | "thumbnails",
): Promise<{
    url?: string;
    error?: string;
}> {
    try {
        const { supabase } = await requirePhotoPathAccess(path, bucket);

        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 3600);

        if (error) {
            console.error("Signed URL creation failed:", error);

            return {
                error: "Failed to generate URL",
            };
        }

        return {
            url: data.signedUrl,
        };
    } catch (error) {
        console.error("Signed URL action failed:", error);

        return {
            error: "Failed to generate URL",
        };
    }
}

export async function getPhotoSignedUrlsAction(photoId: string): Promise<{
    urls?: {
        thumb: string;
        original: string;
    };
    error?: string;
}> {
    try {
        const { supabase, photo } = await requirePhotoAccess(photoId);

        const [thumbResult, originalResult] = await Promise.all([
            supabase.storage
                .from("thumbnails")
                .createSignedUrl(photo.thumbnail_path, 3600),

            supabase.storage
                .from("photos")
                .createSignedUrl(photo.original_path, 3600),
        ]);

        if (thumbResult.error || originalResult.error) {
            console.error("Photo signed URL creation failed:", {
                thumbnail: thumbResult.error,
                original: originalResult.error,
                photoId,
            });

            return {
                error: "Failed to generate URLs",
            };
        }

        return {
            urls: {
                thumb: thumbResult.data.signedUrl,
                original: originalResult.data.signedUrl,
            },
        };
    } catch (error) {
        console.error("Photo signed URLs action failed:", error);

        return {
            error: "Failed to generate URLs",
        };
    }
}

/*
 * Retained for compatibility with any existing caller.
 * Every requested photo is now authorized before URLs are
 * signed, so this is no longer an admin-only shortcut.
 */
export async function getBatchSignedUrlsAction(photoIds: string[]): Promise<{
    urls: Record<
        string,
        {
            thumb: string;
            original: string;
        }
    >;
    error?: string;
}> {
    try {
        const uniqueIds = Array.from(new Set(photoIds.filter(Boolean)));

        if (uniqueIds.length === 0) {
            return {
                urls: {},
            };
        }

        if (uniqueIds.length > 100) {
            return {
                urls: {},
                error: "Too many photos requested",
            };
        }

        const actor = await getPhotoActor();

        const { data: photos, error: photoError } = await actor.supabase
            .from("photos")
            .select(
                `
                    id,
                    wedding_id,
                    original_path,
                    thumbnail_path
                `,
            )
            .in("id", uniqueIds);

        if (photoError) {
            console.error("Batch photo lookup failed:", photoError);

            return {
                urls: {},
                error: "Failed to load photos",
            };
        }

        if (!photos || photos.length !== uniqueIds.length) {
            return {
                urls: {},
                error: "One or more photos were not found",
            };
        }

        const weddingIds = Array.from(
            new Set(photos.map((photo) => photo.wedding_id)),
        );

        await Promise.all(
            weddingIds.map((weddingId) =>
                requireWeddingPhotoAccess(weddingId, actor),
            ),
        );

        const thumbPaths = photos.map((photo) => photo.thumbnail_path);

        const originalPaths = photos.map((photo) => photo.original_path);

        const [thumbResult, originalResult] = await Promise.all([
            actor.supabase.storage
                .from("thumbnails")
                .createSignedUrls(thumbPaths, 3600),

            actor.supabase.storage
                .from("photos")
                .createSignedUrls(originalPaths, 3600),
        ]);

        if (thumbResult.error || originalResult.error) {
            console.error("Batch signed URL creation failed:", {
                thumbnails: thumbResult.error,
                originals: originalResult.error,
            });

            return {
                urls: {},
                error: "Failed to generate URLs",
            };
        }

        const thumbByPath = new Map(
            (thumbResult.data ?? []).map((item) => [item.path, item.signedUrl]),
        );

        const originalByPath = new Map(
            (originalResult.data ?? []).map((item) => [item.path, item.signedUrl]),
        );

        const urls: Record<
            string,
            {
                thumb: string;
                original: string;
            }
        > = {};

        for (const photo of photos) {
            const thumb = thumbByPath.get(photo.thumbnail_path);

            const original = originalByPath.get(photo.original_path);

            if (thumb && original) {
                urls[photo.id] = {
                    thumb,
                    original,
                };
            }
        }

        return {
            urls,
        };
    } catch (error) {
        console.error("Batch signed URL action failed:", error);

        return {
            urls: {},
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/*
 * ============================================
 * PHOTO LISTING
 * ============================================
 */
export async function getPhotosAction(
    weddingId: string | null,
    filters?: {
        favourite?: boolean;
        hidden?: boolean;
        approved?: boolean;
    },
    limit?: number,
    offset?: number,
) {
    try {
        if (!weddingId) {
            return {
                photos: [],
                total: 0,
                error: undefined,
            };
        }

        const { supabase } = await requireWeddingPhotoAccess(weddingId);

        let query = supabase
            .from("photos")
            .select("*", {
                count: "exact",
            })
            .eq("wedding_id", weddingId)
            .order("created_at", {
                ascending: false,
            });

        if (filters?.favourite !== undefined) {
            query = query.eq("favourite", filters.favourite);
        }

        if (filters?.hidden !== undefined) {
            query = query.eq("hidden", filters.hidden);
        }

        if (filters?.approved !== undefined) {
            query = query.eq("approved", filters.approved);
        }

        if (limit !== undefined) {
            const from = Math.max(0, offset ?? 0);

            const safeLimit = Math.min(Math.max(1, limit), 100);

            query = query.range(from, from + safeLimit - 1);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("Photo listing failed:", error);

            return {
                photos: [],
                total: 0,
                error: "Failed to load photos",
            };
        }

        return {
            photos: data ?? [],
            total: count ?? 0,
        };
    } catch (error) {
        console.error("Get photos action failed:", error);

        return {
            photos: [],
            total: 0,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/*
 * ============================================
 * GALLERY TOKENS
 * ============================================
 */
export interface GalleryTokenOptions {
    weddingId: string;
    eventId?: string;
    label?: string;
    showMessages?: boolean;
    expiresInDays?: number;
    photoFilter?: "all" | "favourites";
}

export async function createGalleryTokenAction(
    opts: GalleryTokenOptions,
): Promise<{
    token?: string;
    url?: string;
    error?: string;
}> {
    try {
        const { user, supabase, weddingId, entitlements } =
            await requireWeddingPhotoAccess(opts.weddingId);

        if (!entitlements.publicGallery) {
            return {
                error: "Your plan does not include public gallery sharing",
            };
        }

        let eventId = opts.eventId;

        if (eventId) {
            const { data: event, error: eventError } = await supabase
                .from("events")
                .select("id")
                .eq("id", eventId)
                .eq("wedding_id", weddingId)
                .maybeSingle();

            if (eventError || !event) {
                return {
                    error: "Invalid event",
                };
            }
        } else {
            const { data: event, error: eventError } = await supabase
                .from("events")
                .select("id")
                .eq("wedding_id", weddingId)
                .order("created_at", {
                    ascending: true,
                })
                .limit(1)
                .maybeSingle();

            if (eventError || !event) {
                return {
                    error: "No event found for this wedding",
                };
            }

            eventId = event.id;
        }

        const expiresAt = opts.expiresInDays
            ? new Date(Date.now() + opts.expiresInDays * 86_400_000).toISOString()
            : null;

        const { data, error } = await supabase
            .from("gallery_tokens")
            .insert({
                event_id: eventId,
                label: opts.label ?? null,
                show_messages: opts.showMessages ?? true,
                expires_at: expiresAt,
                created_by: user.id,
                photo_filter: opts.photoFilter ?? "all",
                wedding_id: weddingId,
            })
            .select("token")
            .single();

        if (error || !data) {
            console.error("Gallery token creation failed:", error);

            return {
                error: "Failed to create gallery link",
            };
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

        return {
            token: data.token,
            url: `${appUrl}/gallery/${data.token}`,
        };
    } catch (error) {
        console.error("Create gallery token action failed:", error);

        return {
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

export async function listGalleryTokensAction(weddingId: string): Promise<{
    tokens: Array<{
        id: string;
        token: string;
        label: string | null;
        expires_at: string | null;
        created_at: string;
        photo_filter: string;
    }>;
    error?: string;
}> {
    try {
        const { supabase } = await requireWeddingPhotoAccess(weddingId);

        const { data, error } = await supabase
            .from("gallery_tokens")
            .select(
                `
                    id,
                    token,
                    label,
                    expires_at,
                    created_at,
                    photo_filter
                `,
            )
            .eq("wedding_id", weddingId)
            .order("created_at", {
                ascending: false,
            });

        if (error) {
            console.error("Gallery token listing failed:", error);

            return {
                tokens: [],
                error: "Failed to load gallery links",
            };
        }

        return {
            tokens: data ?? [],
        };
    } catch (error) {
        console.error("List gallery tokens action failed:", error);

        return {
            tokens: [],
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

export async function deleteGalleryTokenAction(
    id: string,
    weddingId: string,
): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const { supabase } = await requireWeddingPhotoAccess(weddingId);

        const { data: tokenRecord, error: tokenLookupError } = await supabase
            .from("gallery_tokens")
            .select("id, token")
            .eq("id", id)
            .eq("wedding_id", weddingId)
            .maybeSingle();

        if (tokenLookupError) {
            console.error("Gallery token lookup failed:", tokenLookupError);

            return {
                success: false,
                error: "Failed to delete gallery link",
            };
        }

        if (!tokenRecord) {
            return {
                success: false,
                error: "Gallery link not found",
            };
        }

        const { data: deletedToken, error } = await supabase
            .from("gallery_tokens")
            .delete()
            .eq("id", id)
            .eq("wedding_id", weddingId)
            .select("id")
            .maybeSingle();

        if (error) {
            console.error("Gallery token delete failed:", error);

            return {
                success: false,
                error: "Failed to delete gallery link",
            };
        }

        if (!deletedToken) {
            return {
                success: false,
                error: "Gallery link not found",
            };
        }

        revalidateTag(`gallery-${tokenRecord.token}`, "max");

        revalidateWeddingPhotos(weddingId);

        return {
            success: true,
        };
    } catch (error) {
        console.error("Delete gallery token action failed:", error);

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/*
 * ============================================
 * SESSION
 * ============================================
 */
export async function signOutAction(destination: "admin" | "couple" = "admin") {
    const supabase = await createClient();

    await supabase.auth.signOut();

    redirect(destination === "couple" ? "/couple/login" : "/admin/login");
}

/*
 * ============================================
 * ADMIN DASHBOARD STATS
 * ============================================
 *
 * Kept separate from the photo-management access layer.
 * Existing RLS continues to determine which weddings a
 * non-global-admin account can see here.
 */
export async function getAdminDashboardStats() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data: weddings } = await supabase.from("weddings").select(`
                id,
                groom_name,
                bride_name,
                slug,
                created_at
            `);

    if (!weddings || weddings.length === 0) {
        return {
            weddings: [],
            totalGuests: 0,
            totalPhotos: 0,
            pendingPhotos: 0,
        };
    }

    const weddingIds = weddings.map((wedding) => wedding.id);

    const [
        { count: totalGuests },
        { count: totalPhotos },
        { count: pendingPhotos },
    ] = await Promise.all([
        supabase
            .from("guests")
            .select("id", {
                count: "exact",
                head: true,
            })
            .in("wedding_id", weddingIds),

        supabase
            .from("photos")
            .select("id", {
                count: "exact",
                head: true,
            })
            .in("wedding_id", weddingIds),

        supabase
            .from("photos")
            .select("id", {
                count: "exact",
                head: true,
            })
            .in("wedding_id", weddingIds)
            .eq("approved", false),
    ]);

    return {
        weddings,
        totalGuests: totalGuests ?? 0,
        totalPhotos: totalPhotos ?? 0,
        pendingPhotos: pendingPhotos ?? 0,
    };
}
