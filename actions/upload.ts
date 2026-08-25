"use server";

import { createHmac } from "node:crypto";

import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { v4 as uuidv4 } from "uuid";

import { createServiceClient } from "@/lib/supabase/server";
import { processImage } from "@/lib/sharp";
import { serverUploadSchema } from "@/schemas";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const RATE_LIMIT_WINDOW_SECONDS = 60;

const SESSION_RATE_LIMIT_MAX = 5;

/*
 * Several wedding guests can share the same venue Wi-Fi.
 * Keep the IP bucket looser than the browser-session bucket.
 */
const IP_RATE_LIMIT_MAX = 30;

const CLEANUP_STALE_AFTER_SECONDS = 10 * 60;

const CLEANUP_BATCH_SIZE = 10;

export type UploadPhotoErrorCode =
    | "INVALID_FILE"
    | "FILE_TOO_LARGE"
    | "PHOTO_LIMIT_REACHED"
    | "WEDDING_LIMIT_REACHED"
    | "RATE_LIMITED"
    | "UPLOAD_DISABLED"
    | "INVALID_EVENT"
    | "STORAGE_ERROR"
    | "DATABASE_ERROR"
    | "UNKNOWN";

export type UploadResult =
    | {
    success: true;
    photoId: string;
}
    | {
    success: false;
    code: UploadPhotoErrorCode;
    retryAfterSeconds?: number;
};

type ServiceClient = ReturnType<typeof createServiceClient>;

type RpcError = {
    message: string;
    code?: string;
};

type RpcClient = {
    rpc<T>(
        name: string,
        args?: Record<string, unknown>
    ): Promise<{
        data: T | null;
        error: RpcError | null;
    }>;
};

type BeginUploadRow = {
    ok: boolean;
    wedding_id: string | null;
    code: string | null;
    retry_after_seconds: number | null;
};

type FinalizeUploadRow = {
    ok: boolean;
    code: string | null;
};

type CleanupJob = {
    photo_id: string;
    original_path: string;
    thumbnail_path: string;
};

function getRpcClient(supabase: ServiceClient): RpcClient {
    /*
     * These RPCs are added by the migration shipped with this file.
     * This cast keeps the action compiling before generated Supabase
     * types are refreshed. After regenerating types it can be removed.
     */
    return supabase as unknown as RpcClient;
}

function failure(
    code: UploadPhotoErrorCode,
    retryAfterSeconds?: number
): UploadResult {
    return retryAfterSeconds === undefined
        ? {
            success: false,
            code,
        }
        : {
            success: false,
            code,
            retryAfterSeconds,
        };
}

function isUploadErrorCode(value: unknown): value is UploadPhotoErrorCode {
    return (
        value === "INVALID_FILE" ||
        value === "FILE_TOO_LARGE" ||
        value === "PHOTO_LIMIT_REACHED" ||
        value === "WEDDING_LIMIT_REACHED" ||
        value === "RATE_LIMITED" ||
        value === "UPLOAD_DISABLED" ||
        value === "INVALID_EVENT" ||
        value === "STORAGE_ERROR" ||
        value === "DATABASE_ERROR" ||
        value === "UNKNOWN"
    );
}

function normalizeRpcRows<T>(data: T[] | T | null): T[] {
    if (!data) {
        return [];
    }

    return Array.isArray(data) ? data : [data];
}

function getRateLimitSecret(): string {
    const secret =
        process.env.UPLOAD_RATE_LIMIT_SECRET ??
        process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secret) {
        throw new Error("Missing UPLOAD_RATE_LIMIT_SECRET");
    }

    return secret;
}

function hashRateLimitKey(value: string): string {
    return createHmac("sha256", getRateLimitSecret()).update(value).digest("hex");
}

async function getClientIpHash(): Promise<string | null> {
    const requestHeaders = await headers();

    const forwardedFor = requestHeaders
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim();

    const ip =
        requestHeaders.get("cf-connecting-ip") ??
        requestHeaders.get("x-real-ip") ??
        forwardedFor ??
        null;

    if (!ip) {
        return null;
    }

    return hashRateLimitKey(`ip:${ip}`);
}

async function completeCleanupJob(
    supabase: ServiceClient,
    photoId: string
): Promise<boolean> {
    const rpc = getRpcClient(supabase);

    const { error } = await rpc.rpc<null>("complete_photo_upload_cleanup_job", {
        p_photo_id: photoId,
    });

    if (error) {
        console.error("Cleanup marker removal failed:", error);

        return false;
    }

    return true;
}

async function markCleanupFailure(
    supabase: ServiceClient,
    photoId: string,
    message: string
): Promise<void> {
    const rpc = getRpcClient(supabase);

    const { error } = await rpc.rpc<null>("mark_photo_upload_cleanup_failed", {
        p_photo_id: photoId,
        p_error: message,
    });

    if (error) {
        console.error("Failed to record cleanup failure:", error);
    }
}

async function cleanupStorageArtifacts(
    supabase: ServiceClient,
    job: CleanupJob
): Promise<boolean> {
    const [originalResult, thumbnailResult] = await Promise.all([
        supabase.storage.from("photos").remove([job.original_path]),

        supabase.storage.from("thumbnails").remove([job.thumbnail_path]),
    ]);

    const errors = [originalResult.error, thumbnailResult.error].filter(
        Boolean
    ) as Array<{
        message: string;
    }>;

    if (errors.length > 0) {
        const message = errors.map((error) => error.message).join(" | ");

        console.error("Storage rollback failed:", message);

        await markCleanupFailure(supabase, job.photo_id, message);

        return false;
    }

    await completeCleanupJob(supabase, job.photo_id);

    return true;
}

async function drainStaleCleanupJobs(supabase: ServiceClient): Promise<void> {
    const rpc = getRpcClient(supabase);

    const { data, error } = await rpc.rpc<CleanupJob[]>(
        "get_stale_photo_upload_cleanup_jobs",
        {
            p_limit: CLEANUP_BATCH_SIZE,
            p_older_than_seconds: CLEANUP_STALE_AFTER_SECONDS,
        }
    );

    if (error) {
        console.error("Stale cleanup lookup failed:", error);

        return;
    }

    const jobs = normalizeRpcRows(data);

    for (const job of jobs) {
        await cleanupStorageArtifacts(supabase, job);
    }
}

async function registerCleanupJob(
    supabase: ServiceClient,
    job: CleanupJob
): Promise<boolean> {
    const rpc = getRpcClient(supabase);

    const { error } = await rpc.rpc<null>("register_photo_upload_cleanup_job", {
        p_photo_id: job.photo_id,
        p_original_path: job.original_path,
        p_thumbnail_path: job.thumbnail_path,
    });

    if (error) {
        console.error("Cleanup marker creation failed:", error);

        return false;
    }

    return true;
}

async function runUploadPreflight(
    supabase: ServiceClient,
    eventId: string,
    sessionId: string
): Promise<
    | {
    ok: true;
    weddingId: string;
}
    | {
    ok: false;
    code: UploadPhotoErrorCode;
    retryAfterSeconds?: number;
}
> {
    const rpc = getRpcClient(supabase);

    const sessionKeyHash = hashRateLimitKey(`session:${sessionId}`);

    const ipKeyHash = await getClientIpHash();

    const { data, error } = await rpc.rpc<BeginUploadRow[]>(
        "begin_guest_photo_upload",
        {
            p_event_id: eventId,
            p_session_id: sessionId,
            p_session_key_hash: sessionKeyHash,
            p_ip_key_hash: ipKeyHash,
            p_session_limit: SESSION_RATE_LIMIT_MAX,
            p_ip_limit: IP_RATE_LIMIT_MAX,
            p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
        }
    );

    if (error) {
        console.error("Upload preflight failed:", error);

        return {
            ok: false,
            code: "DATABASE_ERROR",
        };
    }

    const row = normalizeRpcRows(data)[0];

    if (!row) {
        return {
            ok: false,
            code: "DATABASE_ERROR",
        };
    }

    if (!row.ok) {
        const code = isUploadErrorCode(row.code) ? row.code : "UNKNOWN";

        return row.retry_after_seconds != null
            ? {
                ok: false,
                code,
                retryAfterSeconds: row.retry_after_seconds,
            }
            : {
                ok: false,
                code,
            };
    }

    if (!row.wedding_id) {
        return {
            ok: false,
            code: "DATABASE_ERROR",
        };
    }

    return {
        ok: true,
        weddingId: row.wedding_id,
    };
}

async function verifyPhotoCommit(
    supabase: ServiceClient,
    photoId: string
): Promise<"committed" | "not_committed" | "unknown"> {
    const { data, error } = await supabase
        .from("photos")
        .select("id")
        .eq("id", photoId)
        .maybeSingle();

    if (error) {
        console.error("Photo commit verification failed:", error);

        return "unknown";
    }

    return data ? "committed" : "not_committed";
}

async function finalizeUpload(
    supabase: ServiceClient,
    input: {
        photoId: string;
        eventId: string;
        weddingId: string;
        sessionId: string;
        guestName: string | null;
        message: string | null;
        originalPath: string;
        thumbnailPath: string;
        fileSize: number;
        width: number;
        height: number;
        isPublic: boolean;
    }
): Promise<
    | {
    ok: true;
}
    | {
    ok: false;
    code: UploadPhotoErrorCode;
}
> {
    const rpc = getRpcClient(supabase);

    const { data, error } = await rpc.rpc<FinalizeUploadRow[]>(
        "finalize_guest_photo_upload",
        {
            p_photo_id: input.photoId,
            p_event_id: input.eventId,
            p_wedding_id: input.weddingId,
            p_session_id: input.sessionId,
            p_guest_name: input.guestName,
            p_message: input.message,
            p_original_path: input.originalPath,
            p_thumbnail_path: input.thumbnailPath,
            p_file_size: input.fileSize,
            p_width: input.width,
            p_height: input.height,
            p_is_public: input.isPublic,
        }
    );

    if (error) {
        console.error("Photo finalization failed:", error);

        return {
            ok: false,
            code: "DATABASE_ERROR",
        };
    }

    const row = normalizeRpcRows(data)[0];

    if (!row) {
        return {
            ok: false,
            code: "DATABASE_ERROR",
        };
    }

    if (!row.ok) {
        return {
            ok: false,
            code: isUploadErrorCode(row.code) ? row.code : "DATABASE_ERROR",
        };
    }

    return {
        ok: true,
    };
}

export async function uploadPhotoAction(
    formData: FormData
): Promise<UploadResult> {
    try {
        /*
         * ============================================
         * FILE
         * ============================================
         */
        const fileEntry = formData.get("file");

        if (!(fileEntry instanceof File) || fileEntry.size === 0) {
            return failure("INVALID_FILE");
        }

        const file = fileEntry;

        if (file.size > MAX_FILE_BYTES) {
            return failure("FILE_TOO_LARGE");
        }

        /*
         * ============================================
         * INPUT VALIDATION
         * ============================================
         */
        const parsed = serverUploadSchema.safeParse({
            eventId: formData.get("eventId"),

            guestName: formData.get("guestName") || null,

            message: formData.get("message") || null,

            isPublic: formData.get("isPublic") === "true",

            sessionId: formData.get("sessionId"),

            mimeType: file.type,

            fileSize: file.size,
        });

        if (!parsed.success) {
            const fieldErrors = parsed.error.flatten().fieldErrors as Record<
                string,
                string[] | undefined
            >;

            if (fieldErrors.fileSize?.length) {
                return failure("FILE_TOO_LARGE");
            }

            if (fieldErrors.mimeType?.length) {
                return failure("INVALID_FILE");
            }

            if (fieldErrors.eventId?.length) {
                return failure("INVALID_EVENT");
            }

            console.error("Upload validation failed:", parsed.error.flatten());

            return failure("UNKNOWN");
        }

        const { eventId, guestName, message, isPublic, sessionId } = parsed.data;

        const supabase = createServiceClient();

        /*
         * ============================================
         * PREFLIGHT + REAL SERVER-SIDE RATE LIMIT
         * ============================================
         */
        const preflight = await runUploadPreflight(supabase, eventId, sessionId);

        if (!preflight.ok) {
            return preflight.retryAfterSeconds != null
                ? failure(preflight.code, preflight.retryAfterSeconds)
                : failure(preflight.code);
        }

        const weddingId = preflight.weddingId;

        /*
         * Opportunistically recover orphaned objects from an earlier
         * crashed upload. This is maintenance only; a cleanup failure
         * must not block the current guest upload.
         */
        await drainStaleCleanupJobs(supabase);

        /*
         * ============================================
         * IMAGE PROCESSING
         * ============================================
         */
        let optimizedBuffer: Buffer;
        let thumbnailBuffer: Buffer;
        let width: number;
        let height: number;

        try {
            const arrayBuffer = await file.arrayBuffer();

            const buffer = Buffer.from(arrayBuffer);

            const processed = await processImage(buffer);

            optimizedBuffer = processed.optimizedBuffer;

            thumbnailBuffer = processed.thumbnailBuffer;

            width = processed.width;

            height = processed.height;
        } catch (error) {
            console.error("Image processing failed:", error);

            return failure("INVALID_FILE");
        }

        /*
         * ============================================
         * STORAGE + DATABASE COMMIT
         * ============================================
         */
        const photoId = uuidv4();

        const originalPath = `${eventId}/${photoId}/original.webp`;

        const thumbnailPath = `${eventId}/${photoId}/thumbnail.webp`;

        const cleanupJob: CleanupJob = {
            photo_id: photoId,
            original_path: originalPath,
            thumbnail_path: thumbnailPath,
        };

        const markerCreated = await registerCleanupJob(supabase, cleanupJob);

        if (!markerCreated) {
            /*
             * Never write storage objects unless crash recovery has
             * already been armed in the database.
             */
            return failure("DATABASE_ERROR");
        }

        let committed = false;

        /*
         * When a database RPC response is ambiguous (for example a
         * network interruption after PostgreSQL committed), immediate
         * Storage deletion could destroy a valid photo. In that case
         * we leave the cleanup marker in place and let stale cleanup
         * reconcile it safely later.
         */
        let deferCleanup = false;

        try {
            const { error: originalError } = await supabase.storage
                .from("photos")
                .upload(originalPath, optimizedBuffer, {
                    contentType: "image/webp",
                    upsert: false,
                });

            if (originalError) {
                console.error("Original upload failed:", originalError);

                return failure("STORAGE_ERROR");
            }

            const { error: thumbnailError } = await supabase.storage
                .from("thumbnails")
                .upload(thumbnailPath, thumbnailBuffer, {
                    contentType: "image/webp",
                    upsert: false,
                });

            if (thumbnailError) {
                console.error("Thumbnail upload failed:", thumbnailError);

                return failure("STORAGE_ERROR");
            }

            /*
             * The authoritative photo limits are checked here under
             * a PostgreSQL advisory lock. Concurrent requests cannot
             * both sneak past the final count anymore.
             */
            const finalizeResult = await finalizeUpload(supabase, {
                photoId,
                eventId,
                weddingId,
                sessionId,
                guestName: guestName ?? null,
                message: message ?? null,
                originalPath,
                thumbnailPath,
                fileSize: optimizedBuffer.length,
                width,
                height,
                isPublic,
            });

            if (!finalizeResult.ok) {
                if (finalizeResult.code === "DATABASE_ERROR") {
                    const commitState = await verifyPhotoCommit(supabase, photoId);

                    if (commitState === "committed") {
                        /*
                         * PostgreSQL committed, but the RPC response
                         * was lost/ambiguous. Treat the upload as a
                         * success and preserve its Storage objects.
                         */
                        committed = true;
                    } else if (commitState === "unknown") {
                        /*
                         * We cannot prove whether the DB committed.
                         * Do NOT delete Storage now. The durable marker
                         * will reconcile this safely after it becomes
                         * stale.
                         */
                        deferCleanup = true;

                        return failure("DATABASE_ERROR");
                    } else {
                        return failure("DATABASE_ERROR");
                    }
                } else {
                    return failure(finalizeResult.code);
                }
            }

            /*
             * From this point the database row is canonical. Never
             * roll back storage because a later cache/UI step fails.
             */
            committed = true;

            const markerRemoved = await completeCleanupJob(supabase, photoId);

            if (!markerRemoved) {
                /*
                 * Safe to ignore. The stale-job RPC sees that the
                 * photo exists and removes only the marker later.
                 */
                console.warn("Committed photo still has cleanup marker:", photoId);
            }

            try {
                revalidateTag(`gallery-photos-${weddingId}`, "max");

                revalidateTag("gallery-photos", "max");
            } catch (error) {
                console.error("Gallery cache revalidation failed:", error);
            }

            return {
                success: true,
                photoId,
            };
        } finally {
            if (!committed && !deferCleanup) {
                /*
                 * Compensating transaction for Storage. Because the
                 * cleanup marker was created before Storage writes,
                 * a server crash is also recoverable on a later run.
                 */
                await cleanupStorageArtifacts(supabase, cleanupJob);
            }
        }
    } catch (error) {
        console.error("Upload action failed:", error);

        return failure("UNKNOWN");
    }
}
