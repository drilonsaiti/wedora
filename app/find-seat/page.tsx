'use server';

import {getGuests, getTables, getVenueElements} from '@/actions/seating';
import {FindSeatClient} from '@/components/find-seat-client';
import {BottomNav} from '@/components/bottom-nav';

export default async function FindSeatPage() {
    const [guests, tables, venueElements] = await Promise.all([
        getGuests(),
        getTables(),
        getVenueElements()
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