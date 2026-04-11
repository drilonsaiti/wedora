import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Zip, ZipPassThrough } from 'fflate'

// Force Node.js runtime — Edge does not support fflate streaming or sharp
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Auth check
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: admin } = await service
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse query params
  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') // 'all' | 'favourites'
  const eventId = process.env.NEXT_PUBLIC_EVENT_ID ?? ''

  // Fetch photo paths from DB
  let query = service
    .from('photos')
    .select('id, original_path, guest_name, created_at')
    .eq('hidden', false)
    .eq('approved', true)
    .order('created_at', { ascending: true })

  if (eventId) query = query.eq('event_id', eventId)
  if (filter === 'favourites') query = query.eq('favourite', true)

  const { data: photos, error } = await query

  if (error || !photos || photos.length === 0) {
    return NextResponse.json({ error: 'No photos found' }, { status: 404 })
  }

  // Stream ZIP response
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()

  const zip = new Zip((err, chunk, final) => {
    if (err) {
      writer.abort(err)
      return
    }
    writer.write(chunk)
    if (final) writer.close()
  })

  // Process photos in background
  ;(async () => {
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      try {
        // Generate a signed URL (1 hour)
        const { data: signed, error: signError } = await service.storage
          .from('photos')
          .createSignedUrl(photo.original_path, 3600)

        if (signError || !signed?.signedUrl) continue

        const response = await fetch(signed.signedUrl)
        if (!response.ok) continue

        const arrayBuffer = await response.arrayBuffer()
        const uint8 = new Uint8Array(arrayBuffer)

        // Build a clean filename
        const index = String(i + 1).padStart(3, '0')
        const guestSlug = photo.guest_name
          ? '-' + photo.guest_name.replace(/[^a-z0-9]/gi, '_').slice(0, 30)
          : ''
        const filename = `${index}${guestSlug}.webp`

        const file = new ZipPassThrough(filename)
        zip.add(file)
        file.push(uint8, true)
      } catch {
        // Skip failed photos, continue ZIP
        continue
      }
    }
    zip.end()
  })()

  const label = filter === 'favourites' ? 'favourites' : 'all-photos'
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="wedding-photos-${label}-${date}.zip"`,
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-store',
    },
  })
}
