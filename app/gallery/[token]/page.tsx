import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { GallerySlideshow } from './slideshow-client'

export const dynamic = 'force-dynamic'

type GalleryPageProps = {
  params: Promise<{ token: string }>
}

type GalleryTokenRow = {
  id: string
  event_id: string
  show_messages: boolean
  expires_at: string | null
  label: string | null
}

type GalleryPhotoRow = {
  id: string
  guest_name: string | null
  message: string | null
  thumbnail_path: string
  original_path: string
  created_at: string
  width: number | null
  height: number | null
}

export async function generateMetadata({
                                         params,
                                       }: GalleryPageProps): Promise<Metadata> {
  await params

  return {
    title: 'Wedding Gallery',
    description: 'A collection of memories from our special day',
    robots: 'noindex',
  }
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { token } = await params
  const supabase = await createServiceClient()

  const tokenResult = await supabase
      .from('gallery_tokens')
      .select('id, event_id, show_messages, expires_at, label')
      .eq('token', token)
      .single()

  const galleryToken = tokenResult.data as GalleryTokenRow | null

  if (tokenResult.error || !galleryToken) notFound()

  if (galleryToken.expires_at && new Date(galleryToken.expires_at) < new Date()) {
    return (
        <main className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-light text-[hsl(var(--dark))] mb-3">
              Gallery Expired
            </h1>
            <p className="font-sans text-sm text-muted-foreground">
              This gallery link is no longer active.
            </p>
          </div>
        </main>
    )
  }

  const photosResult = await supabase
      .from('photos')
      .select('id, guest_name, message, thumbnail_path, original_path, created_at, width, height', { count: 'exact' })
      .eq('event_id', galleryToken.event_id)
      .eq('approved', true)
      .eq('hidden', false)
      .order('created_at', { ascending: true })
      .range(0, 49)

  const photos = photosResult.data as GalleryPhotoRow[] | null
  const total = photosResult.count ?? 0

  if (photosResult.error || !photos || photos.length === 0) {
    return (
        <main className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-light text-[hsl(var(--dark))] mb-3">
              No Photos Yet
            </h1>
            <p className="font-sans text-sm text-muted-foreground">
              Check back soon, memories are on their way.
            </p>
          </div>
        </main>
    )
  }

  const thumbPaths = photos.map((p) => p.thumbnail_path)
  const { data: signedThumbs } = await supabase.storage
      .from('thumbnails')
      .createSignedUrls(thumbPaths, 86400)

  const thumbUrlMap: Record<string, string> = {}
  signedThumbs?.forEach((s) => {
    if (s.signedUrl) {
      const photo = photos.find((p) => p.thumbnail_path === s.path)
      if (photo) thumbUrlMap[photo.id] = s.signedUrl
    }
  })

  const origPaths = photos.map((p) => p.original_path)
  const { data: signedOriginals } = await supabase.storage
      .from('photos')
      .createSignedUrls(origPaths, 86400)

  const origUrlMap: Record<string, string> = {}
  signedOriginals?.forEach((s) => {
    if (s.signedUrl) {
      const photo = photos.find((p) => p.original_path === s.path)
      if (photo) origUrlMap[photo.id] = s.signedUrl
    }
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

  return (
    <GallerySlideshow
      initialPhotos={photoData}
      totalCount={total}
      label={galleryToken.label}
      eventId={galleryToken.event_id}
      showMessages={galleryToken.show_messages}
    />
  )
}