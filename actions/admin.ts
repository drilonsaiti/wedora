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

    // Try to find an owned wedding; platform admins may not own any.
    const {data: wedding} = await supabase
        .from('weddings')
        .select('id')
        .eq('owner_user_id', user.id)
        .maybeSingle()

    return {user, supabase: createServiceClient(), weddingId: wedding?.id ?? null}
}

async function requireWeddingAdmin() {
    const context = await requireAdmin()

    const {data: wedding, error} = await context.supabase
        .from('weddings')
        .select('id')
        .eq('owner_user_id', context.user.id)
        .maybeSingle()

    if (error) {
        throw new Error(error.message)
    }

    if (!wedding) {
        throw new Error('No wedding configured')
    }

    return {
        ...context,
        weddingId: wedding.id,
    }
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

        const {supabase, weddingId} = await requireAdmin()

        const {approved, hidden, favourite} = parsed.data
        const payload: PhotoUpdate = {}

        if (approved !== undefined) payload.approved = approved
        if (hidden !== undefined) payload.hidden = hidden
        if (favourite !== undefined) payload.favourite = favourite


        const {error} = await supabase
            .from('photos')
            .update(payload)
            .eq('id', id)
            // Rely on RLS: platform admins can update any; owners only their own wedding photos

        if (error) return {success: false, error: error.message}

        if (weddingId) {
            revalidateTag(`gallery-photos-${weddingId}`, 'max')
        }
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
        const {supabase, weddingId} = await requireAdmin()

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

        if (weddingId) {
            revalidateTag(`gallery-photos-${weddingId}`, 'max')
        }
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

export async function getPhotosAction(
    weddingId: string | null,
    filters?: {
        favourite?: boolean
        hidden?: boolean
        approved?: boolean
    },
    limit?: number,
    offset?: number
) {
    try {
        const {supabase} = await requireWeddingAdmin()

        if (!weddingId) {
            return {
                photos: [],
                total: 0,
                error: undefined,
            }
        }

        let query = supabase
            .from('photos')
            .select('*', {count: 'exact'})
            .eq('wedding_id', weddingId)
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

        if (error) {
            return {
                photos: [],
                total: 0,
                error: error.message,
            }
        }

        return {
            photos: data ?? [],
            total: count ?? 0,
        }
    } catch (error) {
        return {
            photos: [],
            total: 0,
            error: error instanceof Error
                ? error.message
                : 'Unexpected error',
        }
    }
}

// ============================================================
// GALLERY TOKEN
// ============================================================

export interface GalleryTokenOptions {
    eventId?: string
    label?: string
    showMessages?: boolean
    expiresInDays?: number
    photoFilter?: 'all' | 'favourites'
}

export async function createGalleryTokenAction(
    opts: GalleryTokenOptions
): Promise<{ token?: string; url?: string; error?: string }> {
    try {
        const {user, supabase, weddingId} = await requireAdmin()
        if (!weddingId) return {error: 'Unexpected error'}

        let eventId = opts.eventId

        if (!eventId) {
            const {data: event, error: eventError} = await supabase
                .from('events')
                .select('id')
                .eq('wedding_id', weddingId)
                .maybeSingle()

            if (eventError || !event) {
                return {error: 'No event found for this wedding'}
            }

            eventId = event.id
        }

        const expiresAt = opts.expiresInDays
            ? new Date(Date.now() + opts.expiresInDays * 86_400_000).toISOString()
            : null

        const payload = {
            event_id: eventId,
            label: opts.label ?? null,
            show_messages: opts.showMessages ?? true,
            expires_at: expiresAt,
            created_by: user.id,
            photo_filter: opts.photoFilter ?? 'all',
            wedding_id: weddingId
        }

        const result = await supabase.from('gallery_tokens')
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
        const {supabase, weddingId} = await requireAdmin()
        if (!weddingId) return {tokens: [], error: 'Unexpected error'}
        const {data, error} = await supabase
            .from('gallery_tokens')
            .select('id, token, label, expires_at, created_at, photo_filter')
            .eq('wedding_id', weddingId)
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
        const {supabase, weddingId} = await requireAdmin()
        if (!weddingId) return {success: false, error: 'Unexpected error'};
        const {error} = await supabase
            .from('gallery_tokens')
            .delete()
            .eq('id', id)
            .eq('wedding_id', weddingId)

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

export async function getAdminDashboardStats() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Nëse admin platforme (te tabela admins), sheh të gjitha dasmat; përndryshe vetëm të vetat.
    // is_admin() te RLS tashmë e trajton këtë — thjesht bëjmë select() normal.
    const { data: weddings } = await supabase
        .from('weddings')
        .select('id, groom_name, bride_name, slug, created_at')

    if (!weddings || weddings.length === 0) {
        return { weddings: [], totalGuests: 0, totalPhotos: 0, pendingPhotos: 0 }
    }

    const weddingIds = weddings.map((w) => w.id)

    const [{ count: totalGuests }, { count: totalPhotos }, { count: pendingPhotos }] = await Promise.all([
        supabase.from('guests').select('id', { count: 'exact', head: true }).in('wedding_id', weddingIds),
        supabase.from('photos').select('id', { count: 'exact', head: true }).in('wedding_id', weddingIds),
        supabase.from('photos').select('id', { count: 'exact', head: true }).in('wedding_id', weddingIds).eq('approved', false),
    ])

    return {
        weddings,
        totalGuests: totalGuests ?? 0,
        totalPhotos: totalPhotos ?? 0,
        pendingPhotos: pendingPhotos ?? 0,
    }
}