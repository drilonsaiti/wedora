import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { GallerySlideshow } from './slideshow-client'

export const dynamic = 'force-dynamic'

interface GalleryPageProps {
  params: { token: string }
}

export async function generateMetadata({
  params,
}: GalleryPageProps): Promise<Metadata> {
  return {
    title: 'Wedding Gallery',
    description: 'A collection of memories from our special day',
    robots: 'noindex', // token-gated, don't index
  }
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { token } = params
  const supabase = createServiceClient()

  // Validate token
  const { data: galleryToken, error: tokenError } = await supabase
    .from('gallery_tokens')
    .select('id, event_id, show_messages, expires_at, label')
    .eq('token', token)
    .single()

  if (tokenError || !galleryToken) notFound()

  // Check expiry
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

  // Fetch approved, non-hidden photos for this event
  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select('id, guest_name, message, thumbnail_path, original_path, created_at, width, height')
    .eq('event_id', galleryToken.event_id)
    .eq('approved', true)
    .eq('hidden', false)
    .order('created_at', { ascending: true })

  if (photosError || !photos || photos.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-light text-[hsl(var(--dark))] mb-3">
            No Photos Yet
          </h1>
          <p className="font-sans text-sm text-muted-foreground">
            Check back soon — memories are on their way.
          </p>
        </div>
      </main>
    )
  }

  // Generate signed thumbnail URLs (server-side, 24h)
  // We batch-sign thumbnails here; originals are signed on demand in the client
  const thumbPaths = photos.map((p) => p.thumbnail_path)
  const { data: signedThumbs } = await supabase.storage
    .from('thumbnails')
    .createSignedUrls(thumbPaths, 86400) // 24h

  const thumbUrlMap: Record<string, string> = {}
  signedThumbs?.forEach((s) => {
    if (s.signedUrl) {
      // Match back by path
      const photo = photos.find((p) => p.thumbnail_path === s.path)
      if (photo) thumbUrlMap[photo.id] = s.signedUrl
    }
  })

  // Sign original URLs too (needed for slideshow fullscreen)
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

  return <GallerySlideshow photos={photoData} label={galleryToken.label} />
}
