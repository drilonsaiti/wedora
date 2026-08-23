import { redirect } from 'next/navigation'

import {
    getGuests,
    getTables,
    getVenueElements,
} from '@/actions/seating'
import { CoupleSeatingView } from '@/components/couple/couple-seating-view'
import { createClient } from '@/lib/supabase/server'

type Props = {
    params: Promise<{
        weddingId: string
    }>
}

export const dynamic = 'force-dynamic'

export default async function CoupleSeatingPage({
                                                    params,
                                                }: Props) {
    const { weddingId } = await params
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/couple/login')
    }

    const appMetadata =
        user.app_metadata as {
            role?: string
            wedding_id?: string
        }

    if (
        appMetadata.role !== 'couple' ||
        appMetadata.wedding_id !==
        weddingId
    ) {
        redirect('/couple/login')
    }

    const { data: settings } =
        await supabase
            .from('wedding_settings')
            .select(
                'enable_couple_login'
            )
            .eq(
                'wedding_id',
                weddingId
            )
            .single()

    if (
        !settings?.enable_couple_login
    ) {
        redirect('/couple/login')
    }

    const [
        guests,
        tables,
        venueElements,
    ] = await Promise.all([
        getGuests(weddingId),
        getTables(weddingId),
        getVenueElements(
            weddingId
        ),
    ])

    return (
        <CoupleSeatingView
            guests={guests ?? []}
            tables={tables ?? []}
            venueElements={
                venueElements ?? []
            }
            weddingId={weddingId}
        />
    )
}