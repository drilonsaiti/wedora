'use server'

import {createServiceClient} from '@/lib/supabase/server'
import {GALLERY_PAGE_SIZE} from "@/types/seating";
import {unstable_cache} from "next/cache";

export async function getGalleryPhotosAction(token: string, offset: number) {
    return unstable_cache(
        async (t: string, o: number) => {
            const supabase = createServiceClient()

            const tokenResult = await supabase
                .from('gallery_tokens')
                .select('id, event_id, wedding_id, show_messages, expires_at, photo_filter')
                .eq('token', t)
                .single()

            if (tokenResult.error || !tokenResult.data) {
                return {photos: [], error: 'Invalid gallery link'}
            }

            const galleryToken = tokenResult.data
            const weddingId = galleryToken.wedding_id

            if (galleryToken.expires_at && new Date(galleryToken.expires_at) < new Date()) {
                return {photos: [], error: 'Gallery expired'}
            }

            let query = supabase
                .from('photos')
                .select('id, guest_name, message, thumbnail_path, original_path, created_at, width, height')
                .eq('wedding_id', weddingId)
                .eq('approved', true)
                .eq('is_public', true)
                .eq('hidden', false)

            if (galleryToken.photo_filter === 'favourites') {
                query = query.eq('favourite', true)
            }

            const {data: photos, error} = await query
                .order('created_at', {ascending: true})
                .range(o, o + GALLERY_PAGE_SIZE - 1)

            if (error || !photos) return {photos: [], error: 'Failed to load photos'}

            const thumbPaths = photos.map((p) => p.thumbnail_path)
            const origPaths = photos.map((p) => p.original_path)

            const [{data: signedThumbs}, {data: signedOriginals}] = await Promise.all([
                supabase.storage.from('thumbnails').createSignedUrls(thumbPaths, 86400),
                supabase.storage.from('photos').createSignedUrls(origPaths, 86400),
            ])

            const thumbUrlMap: Record<string, string> = {}
            signedThumbs?.forEach((s) => {
                const photo = photos.find((p) => p.thumbnail_path === s.path)
                if (s.signedUrl && photo) thumbUrlMap[photo.id] = s.signedUrl
            })

            const origUrlMap: Record<string, string> = {}
            signedOriginals?.forEach((s) => {
                const photo = photos.find((p) => p.original_path === s.path)
                if (s.signedUrl && photo) origUrlMap[photo.id] = s.signedUrl
            })

            const photoData = photos.map((p) => ({
                id: p.id,
                guest_name: p.guest_name,
                message: galleryToken.show_messages ? p.message : null,
                created_at: p.created_at,
                width: p.width,
                height: p.height,
                thumbUrl: thumbUrlMap[p.id] ?? null,
                originalUrl: origUrlMap[p.id] ?? null,
            }))

            return {photos: photoData}
        },
        ['gallery-photos', token, offset.toString()],
        {tags: ['gallery-photos', `gallery-${token}`], revalidate: 3600}
    )(token, offset)
}