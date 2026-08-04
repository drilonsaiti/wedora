import {getGuests, getTables, getVenueElements} from '@/actions/seating';
import {FindSeatClient} from '@/components/find-seat-client';
import {BottomNav} from '@/components/bottom-nav';
import {getWeddingBySlug} from '@/actions/wedding';


export default async function FindSeatPage() {
    const wedding = await getWeddingBySlug('sara-drilon');
    const weddingId = wedding?.id || '';

    const [guests, tables, venueElements] = await Promise.all([
        getGuests(weddingId),
        getTables(weddingId),
        getVenueElements(weddingId)
    ])

    return (
        <>
            <FindSeatClient
                guests={guests || []}
                tables={tables || []}
                venueElements={venueElements || []}
            />
            <BottomNav/>
        </>
    );
}