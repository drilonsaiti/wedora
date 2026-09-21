import {NextRequest, NextResponse} from "next/server";

import {authorizePhotoZipWedding, getPhotoZipActor, PhotoZipHttpError,} from "@/lib/photo-zip-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportRow = {
    id: string;
    wedding_id: string;
    filter: "all" | "favourites";
    status: "queued" | "processing" | "ready" | "failed";
    requested_photo_count: number;
    archive_photo_count: number | null;
    storage_path: string | null;
    error_code: string | null;
    completed_at: string | null;
    expires_at: string;
};

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

export async function GET(
    _request: NextRequest,
    {
        params,
    }: {
        params: Promise<{
            exportId: string;
        }>;
    }
) {
    try {
        const {exportId} = await params;

        const actor = await getPhotoZipActor();

        /*
         * Generated DB types will not know this
         * migration until they are regenerated.
         */
        const queueDb = actor.service as any;

        const {data, error} = await queueDb
            .from("photo_zip_exports")
            .select(
                `
                    id,
                    wedding_id,
                    filter,
                    status,
                    requested_photo_count,
                    archive_photo_count,
                    storage_path,
                    error_code,
                    completed_at,
                    expires_at
                `
            )
            .eq("id", exportId)
            .maybeSingle();

        if (error) {
            console.error("ZIP export status lookup error:", error);

            return jsonError(500, "EXPORT_LOOKUP_FAILED", "Unable to load export");
        }

        if (!data) {
            return jsonError(404, "EXPORT_NOT_FOUND", "Export not found");
        }

        const job = data as ExportRow;

        const {service} = await authorizePhotoZipWedding(actor, job.wedding_id);

        if (new Date(job.expires_at).getTime() <= Date.now()) {
            return NextResponse.json(
                {
                    status: "failed",
                    errorCode: "EXPORT_EXPIRED",
                },
                {
                    status: 410,
                    headers: {
                        "Cache-Control": "no-store",
                    },
                }
            );
        }

        if (job.status === "failed") {
            return NextResponse.json(
                {
                    status: "failed",
                    errorCode: job.error_code ?? "EXPORT_FAILED",
                },
                {
                    headers: {
                        "Cache-Control": "no-store",
                    },
                }
            );
        }

        if (job.status !== "ready") {
            return NextResponse.json(
                {
                    status: job.status,
                    photoCount: job.requested_photo_count,
                    retryAfterSeconds: 2,
                },
                {
                    headers: {
                        "Cache-Control": "no-store",
                        "Retry-After": "2",
                    },
                }
            );
        }

        if (!job.storage_path) {
            return NextResponse.json(
                {
                    status: "failed",
                    errorCode: "ARCHIVE_MISSING",
                },
                {
                    headers: {
                        "Cache-Control": "no-store",
                    },
                }
            );
        }

        const label = job.filter === "favourites" ? "favourites" : "all-photos";

        const date = (job.completed_at ?? new Date().toISOString()).slice(0, 10);

        const filename = `wedding-photos-${label}-${date}.zip`;

        const {data: signed, error: signError} = await service.storage
            .from("photo-exports")
            .createSignedUrl(job.storage_path, 300, {
                download: filename,
            });

        if (signError || !signed?.signedUrl) {
            console.error("ZIP export signing error:", signError);

            return jsonError(
                500,
                "EXPORT_SIGN_FAILED",
                "Unable to prepare export download"
            );
        }

        return NextResponse.json(
            {
                status: "ready",
                downloadUrl: signed.signedUrl,
                filename,
                photoCount: job.archive_photo_count ?? job.requested_photo_count,
                expiresInSeconds: 300,
            },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    } catch (error) {
        if (error instanceof PhotoZipHttpError) {
            return jsonError(error.status, error.code, error.message);
        }

        console.error("ZIP export status route error:", error);

        return jsonError(500, "UNEXPECTED_ERROR", "Unable to load export");
    }
}
