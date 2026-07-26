import {NextRequest, NextResponse} from 'next/server'
import {createServiceClient} from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const {searchParams} = new URL(request.url)
        const token = searchParams.get('token')
        const offset = parseInt(searchParams.get('offset') || '0', 10)
        const limit = parseInt(searchParams.get('limit') || '50', 10)
        const showMessages = searchParams.get('showMessages') === 'true'

        if (!token) {
            return NextResponse.json({error: 'Missing token'}, {status: 400})
        }

        const supabase = await createServiceClient()

        // 1. Validate token
        const {data: galleryToken, error: tokenError} = await supabase
            .from('gallery_tokens')
            .select('id, event_id, expires_at')
            .eq('token', token)
            .single()

        if (tokenError || !galleryToken) {
            return NextResponse.json({error: 'Invalid token'}, {status: 403})
        }

        // @ts-ignore
        if (galleryToken.expires_at && new Date(galleryToken.expires_at) < new Date()) {
            return NextResponse.json({error: 'Token expired'}, {status: 403})
        }
        // @ts-ignore
        const eventId = galleryToken.event_id

        // 2. Fetch photos
        const {data: photos, error, count} = await supabase
            .from('photos')
            .select('id, guest_name, message, thumbnail_path, original_path, created_at, width, height', {count: 'exact'})
            .eq('event_id', eventId)
            .eq('approved', true)
            .eq('hidden', false)
            .order('created_at', {ascending: true})
            .range(offset, offset + limit - 1)

        if (error) {
            return NextResponse.json({error: error.message}, {status: 500})
        }

        if (!photos || photos.length === 0) {
            return NextResponse.json({photos: [], total: count ?? 0})
        }

        // Get signed URLs for thumbnails and originals
        // @ts-ignore
        const thumbPaths = photos.map((p) => p.thumbnail_path)
        const {data: signedThumbs} = await supabase.storage
            .from('thumbnails')
            .createSignedUrls(thumbPaths, 86400)

        const thumbUrlMap: Record<string, string> = {}
        signedThumbs?.forEach((s) => {
            if (s.signedUrl) {
                // @ts-ignore
                const photo = photos.find((p) => p.thumbnail_path === s.path)
                // @ts-ignore
                if (photo) thumbUrlMap[photo.id] = s.signedUrl
            }
        })

        // @ts-ignore
        const origPaths = photos.map((p) => p.original_path)
        const {data: signedOriginals} = await supabase.storage
            .from('photos')
            .createSignedUrls(origPaths, 86400)

        const origUrlMap: Record<string, string> = {}
        signedOriginals?.forEach((s) => {
            if (s.signedUrl) {
                // @ts-ignore
                const photo = photos.find((p) => p.original_path === s.path)
                // @ts-ignore
                if (photo) origUrlMap[photo.id] = s.signedUrl
            }
        })


        const photoData = photos.map((p) => ({
            // @ts-ignore
            id: p.id,
            // @ts-ignore
            guest_name: p.guest_name,
            // @ts-ignore
            message: showMessages ? p.message : null,
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

        return NextResponse.json({photos: photoData, total: count ?? 0})
    } catch (err: any) {
        return NextResponse.json({error: err.message}, {status: 500})
    }
}
