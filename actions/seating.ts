'use server'

import {createClient, createServiceClient} from '@/lib/supabase/server'
import {revalidatePath, revalidateTag, unstable_cache} from 'next/cache'
import {Table, VenueElement} from '@/types/seating'
import {guestSchema, SeatSides, tableSchema} from '@/schemas'
import {redirect} from 'next/navigation'
import {generateSeatPositions} from "@/lib/seat-generator";

async function requireAdmin() {
    const supabase = await createClient()
    const {
        data: {user},
    } = await supabase.auth.getUser()

    if (!user) redirect('/admin/login')

    const {data: admin} = await supabase
        .from('admins')
        .select('id')
        .eq('id', user.id)
        .single()

    if (!admin) redirect('/admin/login')

    const {data: wedding} = await supabase
        .from('weddings')
        .select('id')
        .eq('owner_user_id', user.id)
        .single()

    if (!wedding) {
        // Handle case where admin has no wedding yet (should not happen after migration)
        throw new Error('No wedding found for this admin')
    }

    // Return the regular supabase client to enforce RLS
    return {user, supabase, weddingId: wedding.id}
}

// --- Guests ---

export async function getGuests(weddingId: string) {
    return unstable_cache(
        async (wId: string) => {
            const supabase = createServiceClient()
            const {data, error} = await supabase
                .from('guests')
                .select('*, tables(id, number, shape), table_seats(seat_index)')
                .eq('wedding_id', wId)
                .order('created_at', {ascending: false})

            if (error) throw new Error(error.message)
            return data
        },
        ['guests', weddingId],
        {tags: [`guests-${weddingId}`]}
    )(weddingId)
}

export async function addGuest(formData: { first_name: string; last_name: string; table_id?: string | null }) {
    const {supabase, weddingId} = await requireAdmin()

    const parsed = guestSchema.safeParse(formData)
    if (!parsed.success) {
        throw new Error('Invalid input: ' + parsed.error.errors[0].message)
    }

    // Initials are handled by DB trigger
    const {error} = await supabase
        .from('guests')
        // @ts-ignore
        .insert([{
            first_name: parsed.data.first_name,
            last_name: parsed.data.last_name,
            table_id: parsed.data.table_id || null,
            wedding_id: weddingId
        }])

    if (error) throw new Error(error.message)
    revalidateTag(`guests-${weddingId}`, 'max')
    revalidatePath('/admin/seating')
}

export async function updateGuest(id: string, formData: {
    first_name: string;
    last_name: string;
    table_id?: string | null
}) {
    const {supabase, weddingId} = await requireAdmin()

    const parsed = guestSchema.safeParse(formData)
    if (!parsed.success) {
        throw new Error('Invalid input: ' + parsed.error.errors[0].message)
    }

    const {error} = await supabase
        .from('guests')
        .update({
            first_name: parsed.data.first_name,
            last_name: parsed.data.last_name,
            table_id: parsed.data.table_id || null
        })
        .eq('id', id)
        .eq('wedding_id', weddingId)

    if (error) throw new Error(error.message)
    revalidateTag(`guests-${weddingId}`, 'max')
    revalidatePath('/admin/seating')
}

export async function deleteGuest(id: string) {
    const {supabase, weddingId} = await requireAdmin()

    const {error} = await supabase
        .from('guests')
        .delete()
        .eq('id', id)
        .eq('wedding_id', weddingId)

    if (error) throw new Error(error.message)
    revalidateTag(`guests-${weddingId}`, 'max')
    revalidatePath('/admin/seating')
}

export async function assignGuestToTable(guestId: string, tableId: string | null) {
    const {supabase, weddingId} = await requireAdmin()
    const {error} = await supabase
        .from('guests')
        .update({table_id: tableId, seat_id: null})
        .eq('id', guestId)
        .eq('wedding_id', weddingId)

    if (error) throw new Error(error.message)
    revalidateTag(`guests-${weddingId}`, 'max')
    revalidatePath('/admin/seating')
}

// --- Tables ---

export async function getTables(weddingId: string) {
    return unstable_cache(
        async (wId: string) => {
            const supabase = createServiceClient()
            const {data, error} = await supabase
                .from('tables')
                .select('*, table_seats(*)')
                .eq('wedding_id', wId)
                .order('number', {ascending: true})

            if (error) throw new Error(error.message)
            return data as Table[]
        },
        ['tables', weddingId],
        {tags: [`tables-${weddingId}`]}
    )(weddingId)
}

export async function addTable(input: {
    weddingId: string
    number: number
    seats: number
    label?: string
    shape: 'round' | 'rectangle' | 'square'
    seatSides?: SeatSides
}) {
    const supabase = await createClient()

    const dimensions = {
        round: {width: 128, height: 128},
        square: {width: 140, height: 140},
        rectangle: {width: 240, height: 100},
    }[input.shape]

    const {data: table, error} = await supabase
        .from('tables')
        .insert({
            wedding_id: input.weddingId,
            number: input.number,
            seats: input.seats,
            label: input.label ?? null,
            shape: input.shape,
            pos_x: 200,
            pos_y: 200,
            ...dimensions,
        })
        .select()
        .single()

    if (error || !table) throw error ?? new Error('Dështoi krijimi i tavolinës')

    if (input.shape !== 'round') {
        const positions = generateSeatPositions(
            input.shape,
            input.seats,
            dimensions.width,
            dimensions.height,
            input.seatSides
        )
        const seatRows = positions.map((p) => ({
            table_id: table.id,
            seat_index: p.seat_index,
            relative_x: p.relative_x,
            relative_y: p.relative_y,
        }))
        await supabase.from('table_seats').insert(seatRows)
    }

    revalidateTag(`tables-${input.weddingId}`, 'max')
    revalidatePath('/admin/seating')
    return table
}

export async function assignGuestToSeat(guestId: string, seatId: string | null, tableId: string | null) {
    const supabase = await createClient()

    const {error} = await supabase
        .from('guests')
        .update({table_id: tableId, seat_id: seatId})
        .eq('id', guestId)

    if (error) throw error
}

export async function updateTable(
    id: string,
    formData: {
        number: number;
        seats: number;
        label?: string | null;
        shape: 'round' | 'rectangle' | 'square';
        seatSides?: SeatSides
    }
) {
    const {supabase, weddingId} = await requireAdmin()

    const parsed = tableSchema.safeParse(formData)
    if (!parsed.success) {
        throw new Error('Invalid input: ' + parsed.error.errors[0].message)
    }

    const {seatSides, ...tableData} = parsed.data

    const dimensions = {
        round: {width: 128, height: 128},
        square: {width: 140, height: 140},
        rectangle: {width: 240, height: 100},
    }[tableData.shape]

    const {data: table, error} = await supabase
        .from('tables')
        .update({...tableData, ...dimensions})
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .select()
        .single()

    if (error || !table) throw new Error(error?.message ?? 'Dështoi përditësimi i tavolinës')

    // Rikrijo table_seats nëse forma s'është round
    await supabase.from('table_seats').delete().eq('table_id', id)

    if (tableData.shape !== 'round') {
        const positions = generateSeatPositions(
            tableData.shape,
            tableData.seats,
            dimensions.width,
            dimensions.height,
            seatSides
        )
        const seatRows = positions.map((p) => ({
            table_id: id,
            seat_index: p.seat_index,
            relative_x: p.relative_x,
            relative_y: p.relative_y,
        }))
        await supabase.from('table_seats').insert(seatRows)
    }

    revalidateTag(`tables-${weddingId}`, 'max')
    revalidatePath('/admin/seating')
    return table
}

export async function deleteTable(id: string) {
    const {supabase, weddingId} = await requireAdmin()

    const {error} = await supabase
        .from('tables')
        .delete()
        .eq('id', id)
        .eq('wedding_id', weddingId)

    if (error) throw new Error(error.message)
    revalidateTag(`tables-${weddingId}`, 'max')
    revalidatePath('/admin/seating')
}

export async function updateTablePosition(id: string, pos_x: number, pos_y: number) {
    const {supabase, weddingId} = await requireAdmin()

    const {error} = await supabase
        .from('tables')
        .update({pos_x, pos_y})
        .eq('id', id)
        .eq('wedding_id', weddingId)

    if (error) throw new Error(error.message)
    revalidateTag(`tables-${weddingId}`, 'max')
}

export async function createVenueElement(input: {
    weddingId: string
    type: string
    label: string
    icon: string
    shape: 'circle' | 'square' | 'rectangle'
    color: string
    posX?: number
    posY?: number
}) {
    const supabase = await createClient()

    const dimensions: Record<string, { width: number; height: number }> = {
        circle: {width: 90, height: 90},
        square: {width: 100, height: 100},
        rectangle: {width: 160, height: 90},
    }
    const {width, height} = dimensions[input.shape]

    const {data, error} = await supabase
        .from('venue_elements')
        .insert({
            wedding_id: input.weddingId,
            type: input.type,
            label: input.label,
            icon: input.icon,
            shape: input.shape,
            color: input.color,
            pos_x: input.posX ?? 200,
            pos_y: input.posY ?? 200,
            width,
            height,
        })
        .select()
        .single()

    if (error) throw error
    revalidateTag(`venue-elements-${input.weddingId}`, 'max')
    return data
}

export async function updateVenueElementPosition(id: string, posX: number, posY: number) {
    const {supabase, weddingId} = await requireAdmin();
    const {error} = await supabase
        .from('venue_elements')
        .update({
            pos_x: posX,
            pos_y: posY,
        } satisfies Partial<{
            pos_x: number
            pos_y: number
            icon: string
            shape: string
            color: string
            label: string
            type: string
            width: number
            height: number
        }>)
        .eq('id', id)
        .eq('wedding_id', weddingId);
    if (error) throw error;
    revalidateTag(`venue-elements-${weddingId}`, 'max')
}

export async function deleteVenueElement(id: string) {
    const {supabase, weddingId} = await requireAdmin();

    const {error} = await supabase.from('venue_elements').delete().eq('id', id).eq('wedding_id', weddingId);
    if (error) throw error;
    revalidateTag(`venue-elements-${weddingId}`, 'max')
}

export async function getVenueElements(weddingId: string) {
    return unstable_cache(
        async (wId: string) => {
            const supabase = createServiceClient();

            const {data, error} = await supabase
                .from('venue_elements')
                .select('id, type, label, pos_x, pos_y, width, height')
                .eq('wedding_id', wId)
                .order('created_at', {ascending: true});

            if (error) {
                throw new Error(error.message);
            }

            return data as VenueElement[];
        },
        ['venue-elements', weddingId],
        {tags: [`venue-elements-${weddingId}`]}
    )(weddingId)
}

