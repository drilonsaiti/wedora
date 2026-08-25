"use server";

import { createServiceClient } from "@/lib/supabase/server";

import { GALLERY_PAGE_SIZE } from "@/types/seating";

export async function getGalleryPhotosAction(token: string, offset: number) {
    const supabase = createServiceClient();

    const { data: galleryToken, error: tokenError } = await supabase
        .from("gallery_tokens")
        .select(
            `
                id,
                event_id,
                wedding_id,
                show_messages,
                expires_at,
                photo_filter
            `
        )
        .eq("token", token)
        .maybeSingle();

    if (tokenError || !galleryToken) {
        return {
            photos: [],
            error: "Invalid gallery link",
        };
    }


    if (
        galleryToken.expires_at &&
        new Date(galleryToken.expires_at).getTime() <= Date.now()
    ) {
        return {
            photos: [],
            error: "Gallery expired",
        };
    }


    let query = supabase
        .from("photos")
        .select(
            `
                id,
                guest_name,
                message,
                thumbnail_path,
                original_path,
                created_at,
                width,
                height
            `
        )
        .eq("wedding_id", galleryToken.wedding_id)
        .eq("approved", true)
        .eq("is_public", true)
        .eq("hidden", false);

    if (galleryToken.photo_filter === "favourites") {
        query = query.eq("favourite", true);
    }

    const { data: photos, error } = await query
        .order("created_at", {
            ascending: true,
        })
        .range(offset, offset + GALLERY_PAGE_SIZE - 1);

    if (error) {
        console.error("Gallery photo query error:", error);

        return {
            photos: [],
            error: error.message,
        };
    }

    if (!photos || photos.length === 0) {
        return {
            photos: [],
        };
    }


    const thumbPaths = photos
        .map((photo) => photo.thumbnail_path)
        .filter((path): path is string => Boolean(path));

    const originalPaths = photos
        .map((photo) => photo.original_path)
        .filter((path): path is string => Boolean(path));


    const [thumbResult, originalResult] = await Promise.all([
        thumbPaths.length
            ? supabase.storage.from("thumbnails").createSignedUrls(thumbPaths, 86400)
            : Promise.resolve({
                data: [],
                error: null,
            }),

        originalPaths.length
            ? supabase.storage.from("photos").createSignedUrls(originalPaths, 86400)
            : Promise.resolve({
                data: [],
                error: null,
            }),
    ]);

    if (thumbResult.error) {
        console.error("Thumbnail signing error:", thumbResult.error);
    }

    if (originalResult.error) {
        console.error("Original signing error:", originalResult.error);
    }

    const thumbUrlMap: Record<string, string> = {};

    for (const signed of thumbResult.data ?? []) {
        const photo = photos.find((item) => item.thumbnail_path === signed.path);

        if (photo && signed.signedUrl) {
            thumbUrlMap[photo.id] = signed.signedUrl;
        }
    }

    const originalUrlMap: Record<string, string> = {};

    for (const signed of originalResult.data ?? []) {
        const photo = photos.find((item) => item.original_path === signed.path);

        if (photo && signed.signedUrl) {
            originalUrlMap[photo.id] = signed.signedUrl;
        }
    }


    return {
        photos: photos.map((photo) => ({
            id: photo.id,

            guest_name: galleryToken.show_messages ? photo.guest_name : null,

            message: galleryToken.show_messages ? photo.message : null,

            created_at: photo.created_at,

            width: photo.width,

            height: photo.height,

            thumbUrl: thumbUrlMap[photo.id] ?? null,

            originalUrl: originalUrlMap[photo.id] ?? null,
        })),
    };
}
