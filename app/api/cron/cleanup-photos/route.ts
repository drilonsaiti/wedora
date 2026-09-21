import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function safeEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left)
    const rightBuffer = Buffer.from(right)
    if (leftBuffer.length !== rightBuffer.length) return false
    return timingSafeEqual(leftBuffer, rightBuffer)
}

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET

    // Fail closed: never compare against "Bearer undefined" if the
    // secret was not configured for this deployment.
    if (!cronSecret) {
        console.error('CRON_SECRET is not configured; refusing request')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authHeader = request.headers.get('authorization') ?? ''
    if (!safeEqual(authHeader, `Bearer ${cronSecret}`)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    const { data: weddings, error: weddingsError } = await supabase
        .from('weddings')
        .select('id, wedding_date, wedding_settings(photo_retention_days)')

    if (weddingsError) {
        return NextResponse.json({ error: weddingsError.message }, { status: 500 })
    }

    const now = new Date()
    let totalDeleted = 0
    const results: { weddingId: string; deletedCount: number; error?: string }[] = []

    for (const wedding of weddings ?? []) {
        const retentionDays = wedding.wedding_settings?.photo_retention_days ?? 90
        if (!wedding.wedding_date) continue

        const expiryDate = new Date(wedding.wedding_date)
        expiryDate.setDate(expiryDate.getDate() + retentionDays)

        if (now < expiryDate) continue

        const { data: photos, error: photosError } = await supabase
            .from('photos')
            .select('id, original_path, thumbnail_path')
            .eq('wedding_id', wedding.id)

        if (photosError || !photos || photos.length === 0) continue

        const originalPaths = photos.map((p) => p.original_path)
        const thumbnailPaths = photos.map((p) => p.thumbnail_path)

        await supabase.storage.from('photos').remove(originalPaths)
        await supabase.storage.from('thumbnails').remove(thumbnailPaths)

        const { error: deleteError } = await supabase
            .from('photos')
            .delete()
            .eq('wedding_id', wedding.id)

        if (deleteError) {
            results.push({ weddingId: wedding.id, deletedCount: 0, error: deleteError.message })
            continue
        }

        totalDeleted += photos.length
        results.push({ weddingId: wedding.id, deletedCount: photos.length })
    }

    return NextResponse.json({
        success: true,
        totalDeleted,
        weddingsProcessed: results.length,
        results,
    })
}