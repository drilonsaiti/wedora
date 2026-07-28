'use server'

import {createClient, createServiceClient} from '@/lib/supabase/server'
import {revalidatePath, revalidateTag, unstable_cache} from 'next/cache'
import {Table, VenueElement, VenueElementType} from '@/types/seating'
import {guestSchema, tableSchema} from '@/schemas'
import {redirect} from 'next/navigation'

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

    return {user, supabase: createServiceClient()}
}

// --- Guests ---

export async function getGuests() {
    return unstable_cache(
        async () => {
            const supabase = createServiceClient()
            const {data, error} = await supabase
                .from('guests')
                .select('id, first_name, last_name, initials, table_id, tables(id, number)')
                .order('created_at', {ascending: false})

            if (error) throw new Error(error.message)
            return data
        },
        ['guests'],
        {tags: ['guests']}
    )()
}

export async function addGuest(formData: { first_name: string; last_name: string; table_id?: string | null }) {
    const {supabase} = await requireAdmin()

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
        }])

    if (error) throw new Error(error.message)
    revalidateTag('guests', 'max')
    revalidatePath('/admin/seating')
}

export async function updateGuest(id: string, formData: {
    first_name: string;
    last_name: string;
    table_id?: string | null
}) {
    const {supabase} = await requireAdmin()

    const parsed = guestSchema.safeParse(formData)
    if (!parsed.success) {
        throw new Error('Invalid input: ' + parsed.error.errors[0].message)
    }

    const {error} = await supabase
        .from('guests')
        // @ts-ignore
        .update({
            first_name: parsed.data.first_name,
            last_name: parsed.data.last_name,
            table_id: parsed.data.table_id || null
        })
        .eq('id', id)

    if (error) throw new Error(error.message)
    revalidateTag('guests', 'max')
    revalidatePath('/admin/seating')
}

export async function deleteGuest(id: string) {
    const {supabase} = await requireAdmin()

    const {error} = await supabase
        .from('guests')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
    revalidateTag('guests', 'max')
    revalidatePath('/admin/seating')
}

export async function assignGuestToTable(guestId: string, tableId: string | null) {
    const {supabase} = await requireAdmin()

    const {error} = await supabase
        .from('guests')
        // @ts-ignore
        .update({table_id: tableId})
        .eq('id', guestId)

    if (error) throw new Error(error.message)
    revalidateTag('guests', 'max')
    revalidatePath('/admin/seating')
}

// --- Tables ---

export async function getTables() {
    return unstable_cache(
        async () => {
            const supabase = createServiceClient()
            const {data, error} = await supabase
                .from('tables')
                .select('id, number, seats, label, pos_x, pos_y')
                .order('number', {ascending: true})

            if (error) throw new Error(error.message)
            return data as Table[]
        },
        ['tables'],
        {tags: ['tables']}
    )()
}

export async function addTable(formData: { number: number; seats: number; label?: string | null }) {
    const {supabase} = await requireAdmin()

    const parsed = tableSchema.safeParse(formData)
    if (!parsed.success) {
        throw new Error('Invalid input: ' + parsed.error.errors[0].message)
    }

    const {error} = await supabase
        .from('tables')
        // @ts-ignore
        .insert([parsed.data])

    if (error) throw new Error(error.message)
    revalidateTag('tables', 'max')
    revalidatePath('/admin/seating')
}

export async function updateTable(id: string, formData: { number: number; seats: number; label?: string | null }) {
    const {supabase} = await requireAdmin()

    const parsed = tableSchema.safeParse(formData)
    if (!parsed.success) {
        throw new Error('Invalid input: ' + parsed.error.errors[0].message)
    }

    const {error} = await supabase
        .from('tables')
        // @ts-ignore
        .update(parsed.data)
        .eq('id', id)

    if (error) throw new Error(error.message)
    revalidateTag('tables', 'max')
    revalidatePath('/admin/seating')
}

export async function deleteTable(id: string) {
    const {supabase} = await requireAdmin()

    const {error} = await supabase
        .from('tables')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
    revalidateTag('tables', 'max')
    revalidatePath('/admin/seating')
}

export async function updateTablePosition(id: string, pos_x: number, pos_y: number) {
    const {supabase} = await requireAdmin()

    const {error} = await supabase
        .from('tables')
        // @ts-ignore
        .update({pos_x, pos_y})
        .eq('id', id)

    if (error) throw new Error(error.message)
    revalidateTag('tables', 'max')
}

export async function createVenueElement(type: VenueElementType, posX: number, posY: number) {
    const defaults: Record<VenueElementType, { width: number; height: number; label: string }> = {
        pool: {
            width: 160,
            height: 100,
            label: 'Pishina'
        },
        couple_table: {width: 140, height: 80, label: 'Vendi i Çiftit'},
        music: {width: 90, height: 90, label: 'Muzika'},
        bar: {width: 140, height: 70, label: 'Bar'},
        toilet: {width: 70, height: 70, label: 'Tualeti'},
        entrance: {width: 70, height: 70, label: 'Hyrja'},
    };
    const d = defaults[type];
    const {supabase} = await requireAdmin();
    // @ts-ignore
    const {data, error} = await supabase.from('venue_elements').insert({
        type,
        label: d.label,
        pos_x: posX,
        pos_y: posY,
        width: d.width,
        height: d.height,
    }).select().single();
    if (error) throw error;
    revalidateTag('venue-elements', 'max')
    return data;
}

export async function updateVenueElementPosition(id: string, posX: number, posY: number) {
    const {supabase} = await requireAdmin();
    // @ts-ignore
    const {error} = await supabase.from('venue_elements').update({pos_x: posX, pos_y: posY,}).eq('id', id);
    if (error) throw error;
    revalidateTag('venue-elements', 'max')
}

export async function deleteVenueElement(id: string) {
    const {supabase} = await requireAdmin();

    const {error} = await supabase.from('venue_elements').delete().eq('id', id);
    if (error) throw error;
    revalidateTag('venue-elements', 'max')
}

export async function getVenueElements() {
    return unstable_cache(
        async () => {
            const supabase = createServiceClient();

            const {data, error} = await supabase
                .from('venue_elements')
                .select('id, type, label, pos_x, pos_y, width, height')
                .order('created_at', {ascending: true});

            if (error) {
                throw new Error(error.message);
            }

            return data as VenueElement[];
        },
        ['venue-elements'],
        {tags: ['venue-elements']}
    )()
}