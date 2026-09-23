import { createServiceClient } from "@/lib/supabase/server";
import { getGalleryPhotosAction } from "@/actions/gallery";
import { GalleryUnavailable } from "@/components/gallery/gallery-unavailable";
import { GallerySlideshow } from "@/app/[locale]/gallery/[token]/slideshow-client";
import { getWeddingEntitlements } from "@/lib/plans";

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
            `,
        )
        .eq("token", token)
        .maybeSingle();

    if (tokenError || !galleryToken) {
        return <GalleryUnavailable reason="invalid" />;
    }

    /*
     * Re-check the entitlement at read time, not just when the link was
     * created -- a wedding can be downgraded to a plan that no longer
     * includes public gallery sharing after tokens already exist, and
     * those existing links should stop working rather than keep serving
     * photos to whoever already has the URL.
     */
    const { data: weddingRow, error: weddingError } = await supabase
        .from("weddings")
        .select("plan, addons")
        .eq("id", galleryToken.wedding_id)
        .maybeSingle();

    if (weddingError || !weddingRow) {
        return <GalleryUnavailable reason="invalid" />;
    }

    const entitlements = getWeddingEntitlements(
        weddingRow.plan,
        weddingRow.addons,
    );

    if (!entitlements.publicGallery) {
        return <GalleryUnavailable reason="invalid" />;
    }

    // `force-dynamic` means this Server Component already runs fresh
    // per request -- it has no client-side re-render/memoization for
    // react-hooks/purity to protect, but the rule's static check can't
    // tell a Server Component from a memoizable client one, so it flags
    // this regardless of hoisting the call out to its own line.
    // eslint-disable-next-line react-hooks/purity -- see comment above
    const requestTimeMs = Date.now();

    if (
        galleryToken.expires_at &&
        new Date(galleryToken.expires_at).getTime() <= requestTimeMs
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
        console.error("Gallery photos error:", result.error);

        return <GalleryUnavailable reason="error" />;
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
