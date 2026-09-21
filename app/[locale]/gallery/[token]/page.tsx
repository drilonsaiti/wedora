import { createServiceClient } from "@/lib/supabase/server";
import { getGalleryPhotosAction } from "@/actions/gallery";
import { GalleryUnavailable } from "@/components/gallery/gallery-unavailable";
import { GallerySlideshow } from "@/app/[locale]/gallery/[token]/slideshow-client";

type Props = {
    params: Promise<{
        token: string;
    }>;
};

export const dynamic = "force-dynamic";

export default async function GalleryPage({ params }: Props) {
    const { token } = await params;

    const supabase = createServiceClient();

    const { data: galleryToken, error: tokenError } = await supabase
        .from("gallery_tokens")
        .select(
            `
                id,
                token,
                wedding_id,
                event_id,
                label,
                show_messages,
                expires_at,
                photo_filter
            `
        )
        .eq("token", token)
        .maybeSingle();


    if (tokenError || !galleryToken) {
        return <GalleryUnavailable reason="invalid" />;
    }

    const now = new Date().getTime();

    if (
        galleryToken.expires_at &&
        new Date(galleryToken.expires_at).getTime() <= now
    ) {
        return <GalleryUnavailable reason="expired" />;
    }


    let countQuery = supabase
        .from("photos")
        .select("id", {
            count: "exact",
            head: true,
        })
        .eq("wedding_id", galleryToken.wedding_id)
        .eq("approved", true)
        .eq("is_public", true)
        .eq("hidden", false);

    if (galleryToken.photo_filter === "favourites") {
        countQuery = countQuery.eq("favourite", true);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
        console.error("Gallery photo count error:", countError);
    }


    const result = await getGalleryPhotosAction(token, 0);


    if (result.error === "Invalid gallery link") {
        return <GalleryUnavailable reason="invalid" />;
    }

    if (result.error === "Gallery expired") {
        return <GalleryUnavailable reason="expired" />;
    }

    if (result.error) {
        throw new Error(result.error);
    }

    return (
        <GallerySlideshow
            initialPhotos={result.photos ?? []}
            totalCount={count ?? 0}
            label={galleryToken.label}
            eventId={galleryToken.event_id}
            showMessages={galleryToken.show_messages ?? true}
            token={token}
        />
    );
}
