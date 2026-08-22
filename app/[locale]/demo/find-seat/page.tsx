import {notFound} from 'next/navigation'
import {getWeddingBySlug} from '@/actions/wedding'
import {getGuests, getTables, getVenueElements} from '@/actions/seating'
import {FindSeatClient} from '@/components/find-seat-client'
import {BottomNav} from '@/components/bottom-nav'

const DEMO_WEDDING_SLUG = 'sara-drilon';
const DEMO_NAV_SLUG = 'demo';

export default async function DemoFindSeatPage() {
    const wedding = await getWeddingBySlug(DEMO_WEDDING_SLUG)
    if (!wedding) notFound()

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
                slug={DEMO_NAV_SLUG}
                enableFindSeat={wedding.wedding_settings?.enable_find_seat}
                enablePhotoUpload={wedding.wedding_settings?.enable_photo_upload}
            />
        </>
    )
}