'use server'

import {createServiceClient} from '@/lib/supabase/server'
import {revalidatePath, unstable_cache} from 'next/cache'
import {redirect} from "next/navigation";
import {CreateWeddingInput, createWeddingSchema} from "@/schemas";
import { createClient } from '@/lib/supabase/server'
import {generateWeddingTheme} from "@/lib/theme";
import {generateRandomPassword} from "@/lib/generate-password";
import {WeddingSettingsUpdate, WeddingUpdate} from "@/types/database";

export async function getWeddingBySlug(slug: string) {
    return unstable_cache(
        async (s: string) => {
            const supabase = createServiceClient()
            const {data, error} = await supabase
                .from('weddings')
                .select('*, wedding_settings(*)')
                .eq('slug', s)
                .single()

            if (error) return null
            return data
        },
        ['wedding', slug],
        {tags: [`wedding-${slug}`], revalidate: 3600}
    )(slug)
}

export async function getWeddingById(id: string) {
    return unstable_cache(
        async (wId: string) => {
            const supabase = createServiceClient()
            const {data, error} = await supabase
                .from('weddings')
                .select('*, wedding_settings(*)')
                .eq('id', wId)
                .single()

            if (error) return null
            return data
        },
        ['wedding-id', id],
        {tags: [`wedding-id-${id}`], revalidate: 3600}
    )(id)
}


interface CoupleCredential {
    email: string
    password: string
    role: 'groom' | 'bride'
}

export async function createWedding(input: CreateWeddingInput){
    const parsed = createWeddingSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false as const, error: parsed.error.issues[0]?.message ?? 'Të dhëna të pavlefshme' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false as const, error: 'Duhet të jeni të kyçur' }

    const { data: slugTaken } = await supabase
        .from('weddings').select('id').eq('slug', parsed.data.slug).maybeSingle()
    if (slugTaken) return { success: false as const, error: 'Kjo URL është e zënë, provoni një tjetër' }

    const theme = generateWeddingTheme(parsed.data.theme_hue)

    const { data: wedding, error } = await supabase
        .from('weddings')
        .insert({
            owner_user_id: user.id,
            groom_name: parsed.data.groom_name,
            bride_name: parsed.data.bride_name,
            groom_email: parsed.data.groom_email,
            bride_email: parsed.data.bride_email || null,
            slug: parsed.data.slug,
            wedding_date: parsed.data.wedding_date,
        })
        .select()
        .single()

    if (error || !wedding) return { success: false as const, error: 'Dështoi krijimi i dasmës' }

    const { error: settingsError } = await supabase.from('wedding_settings').insert({
        wedding_id: wedding.id,
        theme_color: JSON.stringify(theme),
        enable_find_seat: parsed.data.enable_find_seat,
        enable_photo_upload: parsed.data.enable_photo_upload,
    })

    if (settingsError) {
        await supabase.from('weddings').delete().eq('id', wedding.id)
        return { success: false as const, error: 'Dështoi krijimi i dasmës' }
    }

    // Krijo llogaritë e çiftit — app_metadata (jo user_metadata) mban wedding_id + role.
    // Vetëm service role mund ta ndryshojë app_metadata, kështu useri s'mund ta manipulojë vetë.
    const serviceSupabase = createServiceClient()
    const credentials: CoupleCredential[] = []
    const emailsToCreate: { email: string; role: 'groom' | 'bride' }[] = [
        { email: parsed.data.groom_email, role: 'groom' },
    ]
    if (parsed.data.bride_email) emailsToCreate.push({ email: parsed.data.bride_email, role: 'bride' })

    for (const { email, role } of emailsToCreate) {
        const password = generateRandomPassword()
        const { data: authUser, error: authError } = await serviceSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            app_metadata: { wedding_id: wedding.id, role: 'couple', couple_role: role },
        })
        if (authError || !authUser.user) continue
        credentials.push({ email, password, role })
    }

    if (credentials.length > 0) {
        await serviceSupabase.from('wedding_settings').update({ enable_couple_login: true }).eq('wedding_id', wedding.id)
    }

    revalidatePath('/admin/weddings')
    return { success: true as const, weddingId: wedding.id as string, credentials }
}

export async function updateWedding(weddingId: string, input: Partial<CreateWeddingInput>) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false as const, error: 'Duhet të jeni të kyçur' }

    const updates: WeddingUpdate = {}
    if (input.groom_name) updates.groom_name = input.groom_name
    if (input.bride_name) updates.bride_name = input.bride_name
    if (input.groom_email) updates.groom_email = input.groom_email
    if (input.bride_email !== undefined) updates.bride_email = input.bride_email || null
    if (input.wedding_date) updates.wedding_date = input.wedding_date

    if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('weddings').update(updates).eq('id', weddingId)
        if (error) return { success: false as const, error: 'Dështoi ruajtja e ndryshimeve' }
    }

    if (input.theme_hue !== undefined || input.enable_find_seat !== undefined || input.enable_photo_upload !== undefined) {
        const settingsUpdates: WeddingSettingsUpdate = {}
        if (input.theme_hue !== undefined) settingsUpdates.theme_color = JSON.stringify(generateWeddingTheme(input.theme_hue))
        if (input.enable_find_seat !== undefined) settingsUpdates.enable_find_seat = input.enable_find_seat
        if (input.enable_photo_upload !== undefined) settingsUpdates.enable_photo_upload = input.enable_photo_upload

        const { error } = await supabase.from('wedding_settings').update(settingsUpdates).eq('wedding_id', weddingId)
        if (error) return { success: false as const, error: 'Dështoi ruajtja e cilësimeve' }
    }

    revalidatePath(`/admin/weddings/${weddingId}`)
    revalidatePath(`/admin/weddings/${weddingId}/settings`)
    return { success: true as const }
}