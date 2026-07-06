'use server';

import { getGuests } from '@/actions/seating';
import { FindSeatClient } from '@/components/find-seat-client';
import { BottomNav } from '@/components/bottom-nav';

export default async function FindSeatPage() {
  const guests = await getGuests();

  return (
    <>
      <FindSeatClient guests={guests || []} />
      <BottomNav />
    </>
  );
}
