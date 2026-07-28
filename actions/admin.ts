'use server'

import {revalidatePath, revalidateTag} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient, createServiceClient} from '@/lib/supabase/server'
import {photoUpdateSchema} from '@/schemas'
import {PhotoUpdate} from '@/types/database'


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

export async function updatePhotoAction(
    id: string,
    update: Partial<PhotoUpdate>
): Promise<{ success: boolean; error?: string }> {
    try {
        const parsed = photoUpdateSchema.safeParse({id, ...update})
        if (!parsed.success) {
            return {success: false, error: 'Invalid input'}
        }

        const {supabase} = await requireAdmin()

        const {approved, hidden, favourite} = parsed.data
        const payload: PhotoUpdate = {}

        if (approved !== undefined) payload.approved = approved
        if (hidden !== undefined) payload.hidden = hidden
        if (favourite !== undefined) payload.favourite = favourite


        const {error} = await supabase
            .from('photos')
            // @ts-ignore
            .update(payload)
            .eq('id', id)

        if (error) return {success: false, error: error.message}

        revalidateTag('gallery-photos', 'max')
        revalidatePath('/admin/photos')
        return {success: true}
    } catch {
        return {success: false, error: 'Unexpected error'}
    }
}

export async function deletePhotoAction(
    id: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const {supabase} = await requireAdmin()

        const result = await supabase
            .from('photos')
            .select('original_path, thumbnail_path')
            .eq('id', id)
            .single()

        const photo = result.data as {
            original_path: string
            thumbnail_path: string
        } | null

        if (result.error || !photo) {
            return {success: false, error: 'Photo not found'}
        }

        await supabase.storage.from('photos').remove([photo.original_path])
        await supabase.storage.from('thumbnails').remove([photo.thumbnail_path])

        const {error: dbError} = await supabase
            .from('photos')
            .delete()
            .eq('id', id)

        if (dbError) return {success: false, error: dbError.message}

        revalidateTag('gallery-photos', 'max')
        revalidatePath('/admin/photos')
        return {success: true}
    } catch {
        return {success: false, error: 'Unexpected error'}
    }
}

export async function getSignedUrlAction(
    path: string,
    bucket: 'photos' | 'thumbnails'
): Promise<{ url?: string; error?: string }> {
    try {
        await requireAdmin()
        const supabase = createServiceClient()

        const {data, error} = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 3600)

        if (error) return {error: error.message}
        return {url: data.signedUrl}
    } catch {
        return {error: 'Failed to generate URL'}
    }
}

// Returns signed URLs for all visible photos — used by gallery token creation
export async function getBatchSignedUrlsAction(
    photoIds: string[]
): Promise<{ urls: Record<string, { thumb: string; original: string }>; error?: string }> {
    try {
        await requireAdmin()
        const supabase = createServiceClient()

        const result = await supabase
            .from('photos')
            .select('id, original_path, thumbnail_path')
            .in('id', photoIds)

        const photos = result.data as Array<{
            id: string
            original_path: string
            thumbnail_path: string
        }> | null

        if (result.error || !photos) {
            return {urls: {}, error: result.error?.message}
        }

        const urls: Record<string, { thumb: string; original: string }> = {}

        await Promise.all(
            photos.map(async (p) => {
                const [thumbRes, origRes] = await Promise.all([
                    supabase.storage.from('thumbnails').createSignedUrl(p.thumbnail_path, 3600),
                    supabase.storage.from('photos').createSignedUrl(p.original_path, 3600),
                ])

                if (thumbRes.data && origRes.data) {
                    urls[p.id] = {
                        thumb: thumbRes.data.signedUrl,
                        original: origRes.data.signedUrl,
                    }
                }
            })
        )

        return {urls}
    } catch {
        return {urls: {}, error: 'Unexpected error'}
    }
}

export async function getPhotosAction(filters?: {
    favourite?: boolean
    hidden?: boolean
    approved?: boolean
}, limit?: number, offset?: number) {
    try {
        const {supabase} = await requireAdmin()

        let query = supabase
            .from('photos')
            .select('id, event_id, guest_name, message, thumbnail_path, approved, hidden, favourite, created_at', {count: 'exact'})
            .order('created_at', {ascending: false})

        if (filters?.favourite !== undefined) {
            query = query.eq('favourite', filters.favourite)
        }
        if (filters?.hidden !== undefined) {
            query = query.eq('hidden', filters.hidden)
        }
        if (filters?.approved !== undefined) {
            query = query.eq('approved', filters.approved)
        }

        if (limit !== undefined) {
            const from = offset ?? 0
            const to = from + limit - 1
            query = query.range(from, to)
        }

        const {data, error, count} = await query

        if (error) return {photos: [], error: error.message}
        return {photos: data ?? [], total: count ?? 0}
    } catch {
        return {photos: [], error: 'Unexpected error'}
    }
}

// ============================================================
// GALLERY TOKEN
// ============================================================

export interface GalleryTokenOptions {
    eventId: string
    label?: string
    showMessages?: boolean
    expiresInDays?: number
    photoFilter?: 'all' | 'favourites'
}

export async function createGalleryTokenAction(
    opts: GalleryTokenOptions
): Promise<{ token?: string; url?: string; error?: string }> {
    try {
        const {user, supabase} = await requireAdmin()

        const expiresAt = opts.expiresInDays
            ? new Date(Date.now() + opts.expiresInDays * 86_400_000).toISOString()
            : null

        const payload = {
            event_id: opts.eventId,
            label: opts.label ?? null,
            show_messages: opts.showMessages ?? true,
            expires_at: expiresAt,
            created_by: user.id,
            photo_filter: opts.photoFilter ?? 'all',
        }

        const result = await supabase.from('gallery_tokens')
            // @ts-ignore
            .insert(payload)
            .select('token')
            .single()

        const data = result.data as { token: string } | null
        const error = result.error as { message: string } | null

        if (error || !data) {
            return {error: error?.message ?? 'Failed to create token'}
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

        return {
            token: data.token,
            url: `${appUrl}/gallery/${data.token}`,
        }
    } catch {
        return {error: 'Unexpected error'}
    }
}

export async function listGalleryTokensAction(): Promise<{
    tokens: Array<{
        id: string
        token: string
        label: string | null
        expires_at: string | null
        created_at: string
        photo_filter: string
    }>
    error?: string
}> {
    try {
        const {supabase} = await requireAdmin()
        const {data, error} = await supabase
            .from('gallery_tokens')
            .select('id, token, label, expires_at, created_at, photo_filter')
            .order('created_at', {ascending: false})


        if (error) return {tokens: [], error: error.message}
        return {tokens: data ?? []}
    } catch {
        return {tokens: [], error: 'Unexpected error'}
    }
}

export async function deleteGalleryTokenAction(
    id: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const {supabase} = await requireAdmin()
        const {error} = await supabase
            .from('gallery_tokens')
            .delete()
            .eq('id', id)

        if (error) return {success: false, error: error.message}
        revalidatePath('/admin/photos')
        return {success: true}
    } catch {
        return {success: false, error: 'Unexpected error'}
    }
}

export async function signOutAction() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/admin/login')
}
