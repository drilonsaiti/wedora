'use server'

import {createServiceClient} from '@/lib/supabase/server'
import {unstable_cache} from 'next/cache'
import {redirect} from "next/navigation";
import {CreateWeddingInput, createWeddingSchema} from "@/schemas";
import { createClient } from '@/lib/supabase/server'
import {generateWeddingTheme} from "@/lib/theme";
import {generateRandomPassword} from "@/lib/generate-password";

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

export async function createWedding(input: CreateWeddingInput) {
    const parsed = createWeddingSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false as const, error: parsed.error.issues[0]?.message ?? 'Të dhëna të pavlefshme' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false as const, error: 'Duhet të jeni të kyçur' }
    }

    const { data: slugTaken } = await supabase
        .from('weddings')
        .select('id')
        .eq('slug', parsed.data.slug)
        .maybeSingle()

    if (slugTaken) {
        return { success: false as const, error: 'Kjo URL është e zënë, provoni një tjetër' }
    }

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
        })
        .select()
        .single()

    if (error || !wedding) {
        return { success: false as const, error: 'Dështoi krijimi i dasmës' }
    }

    const { error: settingsError } = await supabase
        .from('wedding_settings')
        .insert({ wedding_id: wedding.id, theme_color: JSON.stringify(theme) })

    if (settingsError) {
        await supabase.from('weddings').delete().eq('id', wedding.id)
        return { success: false as const, error: 'Dështoi krijimi i dasmës' }
    }

    // Krijo llogaritë e çiftit — groom gjithmonë, bride vetëm nëse email është dhënë
    const serviceSupabase = createServiceClient()
    const credentials: CoupleCredential[] = []
    const emailsToCreate: { email: string; role: 'groom' | 'bride' }[] = [
        { email: parsed.data.groom_email, role: 'groom' },
    ]
    if (parsed.data.bride_email) {
        emailsToCreate.push({ email: parsed.data.bride_email, role: 'bride' })
    }

    for (const { email, role } of emailsToCreate) {
        const password = generateRandomPassword()

        const { data: authUser, error: authError } = await serviceSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        })

        if (authError || !authUser.user) {
            continue
        }

        /*await serviceSupabase.from('wedding_members').insert({
            wedding_id: wedding.id,
            user_id: authUser.user.id,
            role: 'couple',
            invited_email: email,
            accepted_at: new Date().toISOString(),
        })*/

        credentials.push({ email, password, role })
    }

    if (credentials.length > 0) {
        await serviceSupabase
            .from('wedding_settings')
            .update({ enable_couple_login: true })
            .eq('wedding_id', wedding.id)
    }

    return {
        success: true as const,
        weddingId: wedding.id as string,
        credentials,
    }
}
