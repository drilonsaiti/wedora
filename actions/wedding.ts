'use server'

import {createServiceClient} from '@/lib/supabase/server'
import {unstable_cache} from 'next/cache'
import {redirect} from "next/navigation";
import {CreateWeddingInput, createWeddingSchema} from "@/schemas";
import { createClient } from '@/lib/supabase/server'
import {generateWeddingTheme} from "@/lib/theme";

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


export async function createWedding(input: CreateWeddingInput) {
    const parsed = createWeddingSchema.safeParse(input);

    if (!parsed.success) {
        return {
            success: false as const,
            error: parsed.error.issues[0]?.message ?? 'Të dhëna të pavlefshme',
        };
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false as const, error: 'Duhet të jeni të kyçur' };
    }

    const { data: existing } = await supabase
        .from('weddings')
        .select('id')
        .eq('owner_user_id', user.id)
        .maybeSingle();

    if (existing) {
        return { success: false as const, error: 'Ju keni tashmë një dasmë të krijuar' };
    }

    const { data: slugTaken } = await supabase
        .from('weddings')
        .select('id')
        .eq('slug', parsed.data.slug)
        .maybeSingle();

    if (slugTaken) {
        return { success: false as const, error: 'Kjo URL është e zënë, provoni një tjetër' };
    }

    const { data: wedding, error } = await supabase
        .from('weddings')
        .insert({
            owner_user_id: user.id,
            groom_name: parsed.data.groom_name,
            bride_name: parsed.data.bride_name,
            slug: parsed.data.slug,
        })
        .select()
        .single();

    if (error) {
        return { success: false as const, error: 'Dështoi krijimi i dasmës' };
    }

    const theme = generateWeddingTheme(parsed.data.theme_hue);
    const { error: settingsError } = await supabase
        .from('wedding_settings')
        .insert({ wedding_id: wedding.id,theme_color: JSON.stringify(theme), });

    if (settingsError) {
        await supabase.from('weddings').delete().eq('id', wedding.id);
        return { success: false as const, error: 'Dështoi krijimi i dasmës' };
    }

    redirect('/admin');
}