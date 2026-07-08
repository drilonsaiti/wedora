'use server'

import { createServiceClient } from '@/lib/supabase/server'
import {GALLERY_PAGE_SIZE} from "@/types/seating";

export async function getGalleryPhotosAction(token: string, offset: number) {
    const supabase = createServiceClient()

    const tokenResult = await supabase
        .from('gallery_tokens')
        .select('id, event_id, show_messages, expires_at, photo_filter')
        .eq('token', token)
        .single()

    if (tokenResult.error || !tokenResult.data) {
        return { photos: [], error: 'Invalid gallery link' }
    }

    // @ts-ignore
    const galleryToken = tokenResult.data

    if (galleryToken.expires_at && new Date(galleryToken.expires_at) < new Date()) {
        return { photos: [], error: 'Gallery expired' }
    }

    let query = supabase
        .from('photos')
        .select('id, guest_name, message, thumbnail_path, original_path, created_at, width, height')
        .eq('event_id', galleryToken.event_id)
        .eq('approved', true)
        .eq('is_public', true)
        .eq('hidden', false)

    if (galleryToken.photo_filter === 'favourites') {
        console.log('Filtering favourites')
        query = query.eq('favourite', true)
    }

    const { data: photos, error } = await query
        .order('created_at', { ascending: true })
        .range(offset, offset + GALLERY_PAGE_SIZE - 1)

    if (error || !photos) return { photos: [], error: 'Failed to load photos' }

    // @ts-ignore
    const thumbPaths = photos.map((p) => p.thumbnail_path)
    // @ts-ignore
    const origPaths = photos.map((p) => p.original_path)

    const [{ data: signedThumbs }, { data: signedOriginals }] = await Promise.all([
        supabase.storage.from('thumbnails').createSignedUrls(thumbPaths, 86400),
        supabase.storage.from('photos').createSignedUrls(origPaths, 86400),
    ])

    const thumbUrlMap: Record<string, string> = {}
    signedThumbs?.forEach((s) => {
        // @ts-ignore
        const photo = photos.find((p) => p.thumbnail_path === s.path)
        // @ts-ignore
        if (s.signedUrl && photo) thumbUrlMap[photo.id] = s.signedUrl
    })

    const origUrlMap: Record<string, string> = {}
    signedOriginals?.forEach((s) => {
        // @ts-ignore
        const photo = photos.find((p) => p.original_path === s.path)
        // @ts-ignore
        if (s.signedUrl && photo) origUrlMap[photo.id] = s.signedUrl
    })

    const photoData = photos.map((p) => ({
        // @ts-ignore
        id: p.id,
        // @ts-ignore
        guest_name: p.guest_name,
        // @ts-ignore
        message: galleryToken.show_messages ? p.message : null,
        // @ts-ignore
        created_at: p.created_at,
        // @ts-ignore
        width: p.width,
        // @ts-ignore
        height: p.height,
        // @ts-ignore
        thumbUrl: thumbUrlMap[p.id] ?? null,
        // @ts-ignore
        originalUrl: origUrlMap[p.id] ?? null,
    }))

    return { photos: photoData }
}