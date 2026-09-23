import { notFound } from "next/navigation";

import { getWeddingBySlug } from "@/actions/wedding";
import {
    getGuestByToken,
    getTables,
    getVenueElements,
} from "@/actions/seating";
import { GuestPersonalLinkClient } from "@/components/guest-personal-link-client";
import { BottomNav } from "@/components/bottom-nav";

type Props = {
    params: Promise<{
        slug: string;
        token: string;
    }>;
};

/*
 * Public, unauthenticated personal-link page: /{locale}/{slug}/g/{token}.
 *
 * Unlike /{slug}/find-seat, this resolves and shows exactly ONE guest --
 * the one the token belongs to -- never the rest of the roster. See
 * actions/seating.ts#getGuestByToken for the authorization gate (same
 * wedding_settings.enable_find_seat public-access check the find-seat
 * page uses) and why a bad token, a disabled wedding, and a missing
 * wedding all fall through to the same not-found result here.
 */
export default async function GuestPersonalLinkPage({ params }: Props) {
    const { slug, token } = await params;

    const wedding = await getWeddingBySlug(slug);

    if (!wedding) notFound();

    if (!wedding.wedding_settings?.enable_find_seat) notFound();

    const resolved = await getGuestByToken(slug, token);

    if (!resolved) notFound();

    const [tables, venueElements] = await Promise.all([
        getTables(wedding.id),
        getVenueElements(wedding.id),
    ]);

    return (
        <>
            <GuestPersonalLinkClient
                guest={resolved.guest}
                weddingSlug={slug}
                token={token}
                tables={tables ?? []}
                venueElements={venueElements ?? []}
                groomName={wedding.groom_name ?? ""}
                brideName={wedding.bride_name ?? ""}
            />

            <BottomNav
                slug={slug}
                enableFindSeat={wedding.wedding_settings?.enable_find_seat}
                enablePhotoUpload={wedding.wedding_settings?.enable_photo_upload}
            />
        </>
    );
}
