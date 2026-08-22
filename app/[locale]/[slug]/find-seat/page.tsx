import {notFound} from 'next/navigation'
import {getWeddingBySlug} from '@/actions/wedding'
import {getGuests, getTables, getVenueElements} from '@/actions/seating'
import {FindSeatClient} from '@/components/find-seat-client'
import {BottomNav} from "@/components/bottom-nav";

type Props = { params: Promise<{ slug: string }> }

export default async function PublicFindSeatPage({params}: Props) {
    const {slug} = await params
    const wedding = await getWeddingBySlug(slug)
    if (!wedding) notFound()
    if (!wedding.wedding_settings?.enable_find_seat) notFound()

    const [guests, tables, venueElements] = await Promise.all([
        getGuests(wedding.id),
        getTables(wedding.id),
        getVenueElements(wedding.id),
    ])

    return (
        <>
            <FindSeatClient
                guests={guests ?? []}
                tables={tables ?? []}
                venueElements={venueElements ?? []}
                groomName={wedding.groom_name ?? ''}
                brideName={wedding.bride_name ?? ''}
            />
            <BottomNav
                slug={slug}
                enableFindSeat={wedding.wedding_settings?.enable_find_seat}
                enablePhotoUpload={wedding.wedding_settings?.enable_photo_upload}
            />
        </>
    )
}