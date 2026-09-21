import type {User} from "@supabase/supabase-js";

import {createClient, createServiceClient} from "@/lib/supabase/server";

export type PhotoZipRole = "admin" | "owner" | "couple";

export class PhotoZipHttpError extends Error {
    status: number;
    code: string;

    constructor(status: number, code: string, message: string) {
        super(message);
        this.name = "PhotoZipHttpError";
        this.status = status;
        this.code = code;
    }
}

export async function getPhotoZipActor() {
    const authClient = await createClient();

    const {
        data: {user},
        error,
    } = await authClient.auth.getUser();

    if (error || !user) {
        throw new PhotoZipHttpError(401, "UNAUTHORIZED", "Unauthorized");
    }

    return {
        user,
        service: createServiceClient(),
    };
}

export async function authorizePhotoZipWedding(
    actor: {
        user: User;
        service: ReturnType<typeof createServiceClient>;
    },
    weddingId: string
) {
    const {user, service} = actor;

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

        throw new PhotoZipHttpError(
            500,
            "AUTHORIZATION_FAILED",
            "Unable to verify access"
        );
    }

    if (weddingResult.error) {
        console.error("ZIP wedding lookup error:", weddingResult.error);

        throw new PhotoZipHttpError(
            500,
            "WEDDING_LOOKUP_FAILED",
            "Unable to load wedding"
        );
    }

    const wedding = weddingResult.data;

    if (!wedding) {
        throw new PhotoZipHttpError(404, "WEDDING_NOT_FOUND", "Wedding not found");
    }

    let role: PhotoZipRole | null = null;

    if (adminResult.data) {
        role = "admin";
    }

    if (!role && wedding.owner_user_id === user.id) {
        role = "owner";
    }

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

                throw new PhotoZipHttpError(
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
        throw new PhotoZipHttpError(403, "FORBIDDEN", "Forbidden");
    }

    return {
        ...actor,
        wedding,
        role,
    };
}
