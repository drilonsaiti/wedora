import { timingSafeEqual } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { once } from "node:events";

import { NextRequest, NextResponse } from "next/server";
import { Zip, ZipPassThrough } from "fflate";

import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const EXPORT_BUCKET = "photo-exports";
const MAX_ATTEMPTS = 3;

type QueueJob = {
    id: string;
    wedding_id: string;
    requested_by: string;
    filter: "all" | "favourites";
    status: "processing";
    requested_photo_count: number;
    attempts: number;
};

type PhotoRow = {
    id: string;
    original_path: string;
    guest_name: string | null;
    created_at: string;
};

function safeEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left);

    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
}

function authorizeWorker(request: NextRequest) {
    const secret = process.env.ZIP_WORKER_SECRET ?? process.env.CRON_SECRET;

    if (!secret) {
        return false;
    }

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
        return false;
    }

    return safeEqual(authorization.slice("Bearer ".length), secret);
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

async function cleanupExpiredExports(
    service: ReturnType<typeof createServiceClient>
) {
    const queueDb = service as any;

    const { data, error } = await queueDb
        .from("photo_zip_exports")
        .select("id, storage_path")
        .eq("status", "ready")
        .lt("expires_at", new Date().toISOString())
        .limit(20);

    if (error) {
        console.error("ZIP expiry cleanup lookup error:", error);

        return;
    }

    for (const row of data ?? []) {
        try {
            if (row.storage_path) {
                await service.storage.from(EXPORT_BUCKET).remove([row.storage_path]);
            }

            await queueDb.from("photo_zip_exports").delete().eq("id", row.id);
        } catch (cleanupError) {
            console.error("ZIP expiry cleanup error:", {
                exportId: row.id,
                error: cleanupError,
            });
        }
    }
}

async function downloadPhoto(
    service: ReturnType<typeof createServiceClient>,
    photo: PhotoRow
) {
    try {
        const { data: blob, error } = await service.storage
            .from("photos")
            .download(photo.original_path);

        if (error || !blob) {
            console.error("Queued ZIP photo download failed:", {
                photoId: photo.id,
                path: photo.original_path,
                error,
            });

            return null;
        }

        const buffer = await blob.arrayBuffer();

        if (buffer.byteLength === 0) {
            return null;
        }

        return new Uint8Array(buffer);
    } catch (error) {
        console.error("Queued ZIP photo download exception:", {
            photoId: photo.id,
            error,
        });

        return null;
    }
}

async function writeArchiveToTemp(
    service: ReturnType<typeof createServiceClient>,
    photos: PhotoRow[],
    exportId: string
) {
    const directory = await mkdtemp(join(tmpdir(), "wedora-zip-"));

    const filePath = join(directory, `${exportId}.zip`);

    const output = createWriteStream(filePath, {
        flags: "w",
    });

    let drainPromise: Promise<void> | null = null;

    let settled = false;

    let rejectZip: ((reason?: unknown) => void) | null = null;

    const completed = new Promise<void>((resolve, reject) => {
        rejectZip = reject;

        output.on("error", reject);

        output.on("finish", () => {
            settled = true;
            resolve();
        });
    });

    const zip = new Zip((error, chunk, final) => {
        if (settled) {
            return;
        }

        if (error) {
            settled = true;
            output.destroy(error);
            rejectZip?.(error);
            return;
        }

        if (chunk.length > 0) {
            const canContinue = output.write(Buffer.from(chunk));

            if (!canContinue && !drainPromise) {
                drainPromise = once(output, "drain").then(() => {
                    drainPromise = null;
                });
            }
        }

        if (final) {
            output.end();
        }
    });

    let addedPhotos = 0;

    try {
        for (let i = 0; i < photos.length; i++) {
            if (drainPromise) {
                await drainPromise;
            }

            const bytes = await downloadPhoto(service, photos[i]);

            if (!bytes) {
                continue;
            }

            const file = new ZipPassThrough(buildPhotoFilename(photos[i], i));

            zip.add(file);

            file.push(bytes, true);

            addedPhotos++;

            /*
             * The caller updates heartbeat after
             * groups of photos, so this function
             * remains focused on archive creation.
             */
        }

        zip.end();

        await completed;

        return {
            directory,
            filePath,
            addedPhotos,
        };
    } catch (error) {
        output.destroy();

        await rm(directory, {
            recursive: true,
            force: true,
        });

        throw error;
    }
}

async function uploadArchive(filePath: string, storagePath: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Supabase storage environment is incomplete");
    }

    const fileStats = await stat(filePath);

    const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");

    const nodeStream = createReadStream(filePath);

    const body = Readable.toWeb(nodeStream);

    const requestInit: RequestInit & {
        duplex: "half";
    } = {
        method: "POST",
        headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/zip",
            "Content-Length": String(fileStats.size),
            "x-upsert": "true",
        },
        body: body as unknown as BodyInit,
        duplex: "half",
    };

    const response = await fetch(
        `${supabaseUrl}/storage/v1/object/${EXPORT_BUCKET}/${encodedPath}`,
        requestInit
    );

    if (!response.ok) {
        const detail = await response.text().catch(() => "");

        throw new Error(
            `Archive upload failed (${response.status}): ${detail.slice(0, 300)}`
        );
    }
}

async function processOneJob() {
    const service = createServiceClient();

    await cleanupExpiredExports(service);

    const queueDb = service as any;

    const { data, error: claimError } = await queueDb.rpc(
        "claim_photo_zip_export"
    );

    if (claimError) {
        throw new Error(`Unable to claim ZIP job: ${claimError.message}`);
    }

    const job = (data?.[0] ?? null) as QueueJob | null;

    if (!job) {
        return {
            processed: false,
        };
    }

    const storagePath = `${job.wedding_id}/${job.id}.zip`;

    let tempDirectory: string | null = null;

    try {
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
            .eq("wedding_id", job.wedding_id)
            .eq("hidden", false)
            .eq("approved", true)
            .not("original_path", "is", null)
            .order("created_at", {
                ascending: true,
            });

        if (job.filter === "favourites") {
            query = query.eq("favourite", true);
        }

        const { data: photoData, error: photoError } = await query;

        if (photoError) {
            throw new Error(`Photo query failed: ${photoError.message}`);
        }

        const photos = (photoData ?? []) as PhotoRow[];

        if (photos.length === 0) {
            await queueDb
                .from("photo_zip_exports")
                .update({
                    status: "failed",
                    error_code: "NO_PHOTOS",
                    error_detail:
                        "No matching photos remained when the export was processed",
                    heartbeat_at: null,
                })
                .eq("id", job.id);

            return {
                processed: true,
                exportId: job.id,
                status: "failed",
            };
        }

        const heartbeat = async () => {
            await queueDb
                .from("photo_zip_exports")
                .update({
                    heartbeat_at: new Date().toISOString(),
                })
                .eq("id", job.id)
                .eq("status", "processing");
        };

        await heartbeat();

        /*
         * Build the archive on local temporary disk.
         * WebP/JPEG files are already compressed, so
         * ZipPassThrough avoids wasting CPU.
         */
        const archive = await writeArchiveToTemp(service, photos, job.id);

        tempDirectory = archive.directory;

        if (archive.addedPhotos === 0) {
            throw new Error("All matching Storage objects failed to download");
        }

        await heartbeat();

        await uploadArchive(archive.filePath, storagePath);

        const { error: readyError } = await queueDb
            .from("photo_zip_exports")
            .update({
                status: "ready",
                storage_path: storagePath,
                archive_photo_count: archive.addedPhotos,
                completed_at: new Date().toISOString(),
                heartbeat_at: null,
                error_code: null,
                error_detail: null,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq("id", job.id)
            .eq("status", "processing");

        if (readyError) {
            /*
             * Do not leave an untracked archive.
             */
            await service.storage.from(EXPORT_BUCKET).remove([storagePath]);

            throw new Error(`Unable to mark ZIP ready: ${readyError.message}`);
        }

        return {
            processed: true,
            exportId: job.id,
            status: "ready",
            photos: archive.addedPhotos,
        };
    } catch (error) {
        console.error("Queued ZIP worker error:", {
            exportId: job.id,
            error,
        });

        /*
         * Remove a possibly-created archive before
         * retrying the same job path.
         */
        await service.storage
            .from(EXPORT_BUCKET)
            .remove([storagePath])
            .catch(() => undefined);

        const finalFailure = job.attempts >= MAX_ATTEMPTS;

        await queueDb
            .from("photo_zip_exports")
            .update({
                status: finalFailure ? "failed" : "queued",
                heartbeat_at: null,
                error_code: finalFailure ? "PROCESSING_FAILED" : "RETRY_PENDING",
                error_detail:
                    error instanceof Error
                        ? error.message.slice(0, 1000)
                        : "Unknown worker error",
            })
            .eq("id", job.id);

        return {
            processed: true,
            exportId: job.id,
            status: finalFailure ? "failed" : "queued",
        };
    } finally {
        if (tempDirectory) {
            await rm(tempDirectory, {
                recursive: true,
                force: true,
            }).catch(() => undefined);
        }
    }
}

async function handler(request: NextRequest) {
    if (!authorizeWorker(request)) {
        return NextResponse.json(
            {
                error: "Unauthorized",
            },
            {
                status: 401,
            }
        );
    }

    try {
        const result = await processOneJob();

        return NextResponse.json(result, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("ZIP worker route error:", error);

        return NextResponse.json(
            {
                error: "Worker failed",
            },
            {
                status: 500,
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    }
}

export const GET = handler;
export const POST = handler;
