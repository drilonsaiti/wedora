'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Grid,
  Maximize2,
  X,
  Heart,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface GalleryPhoto {
  id: string
  guest_name: string | null
  message: string | null
  created_at: string
  width: number | null
  height: number | null
  thumbUrl: string | null
  originalUrl: string | null
}

interface GallerySlideshowProps {
  photos: GalleryPhoto[]
  label: string | null
}

type ViewMode = 'grid' | 'slideshow'

export function GallerySlideshow({ photos, label }: GallerySlideshowProps) {
  const [mode, setMode] = useState<ViewMode>('grid')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({})
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const SLIDE_DURATION = 4000

  const goTo = useCallback((index: number) => {
    setCurrentIndex(((index % photos.length) + photos.length) % photos.length)
    setImageLoaded((prev) => ({ ...prev })) // keep loaded state
  }, [photos.length])

  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo])
  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo])

  // Autoplay
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(goNext, SLIDE_DURATION)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, goNext])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (mode !== 'slideshow') return
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === ' ') { e.preventDefault(); setIsPlaying((p) => !p) }
      if (e.key === 'Escape') setMode('grid')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, goPrev, goNext])

  // Fullscreen API
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      await document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const openSlideshow = (index: number) => {
    setCurrentIndex(index)
    setMode('slideshow')
  }

  const currentPhoto = photos[currentIndex]

  return (
    <div className="min-h-screen bg-background" ref={containerRef}>
      {/* ── HEADER ── */}
      <header className="px-6 pt-10 pb-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="h-px w-12 bg-[hsl(var(--gold))] opacity-60" />
          <Heart className="w-3 h-3 text-[hsl(var(--primary))] fill-current" />
          <div className="h-px w-12 bg-[hsl(var(--gold))] opacity-60" />
        </div>
        <h1 className="font-serif text-4xl font-light text-[hsl(var(--dark))]">
          {label ?? 'Our Wedding Gallery'}
        </h1>
        <p className="font-sans text-xs tracking-widest uppercase text-muted-foreground mt-2">
          {photos.length} memories shared
        </p>
      </header>

      {/* ── CONTROLS ── */}
      <div className="flex items-center justify-center gap-3 pb-6">
        <button
          onClick={() => setMode('grid')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full font-sans text-xs font-medium transition-colors',
            mode === 'grid'
              ? 'bg-[hsl(var(--primary))] text-white'
              : 'bg-secondary text-secondary-foreground hover:bg-muted'
          )}
        >
          <Grid className="w-3.5 h-3.5" />
          Grid
        </button>
        <button
          onClick={() => openSlideshow(currentIndex)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full font-sans text-xs font-medium transition-colors',
            mode === 'slideshow'
              ? 'bg-[hsl(var(--primary))] text-white'
              : 'bg-secondary text-secondary-foreground hover:bg-muted'
          )}
        >
          <Play className="w-3.5 h-3.5" />
          Slideshow
        </button>
      </div>

      {/* ── GRID MODE ── */}
      {mode === 'grid' && (
        <div className="max-w-6xl mx-auto px-4 pb-16">
          <div className="photo-grid">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => openSlideshow(i)}
                className="group relative aspect-square rounded-xl overflow-hidden bg-muted focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              >
                {photo.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.thumbUrl}
                    alt={photo.guest_name ?? `Photo ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onLoad={() =>
                      setImageLoaded((prev) => ({ ...prev, [photo.id]: true }))
                    }
                  />
                ) : (
                  <div className="w-full h-full shimmer" />
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />

                {/* Guest name */}
                {photo.guest_name && (
                  <div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <p className="text-white font-sans text-xs truncate">
                      {photo.guest_name}
                    </p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── SLIDESHOW MODE ── */}
      {mode === 'slideshow' && currentPhoto && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Top bar */}
          <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 pt-4 pb-8 bg-gradient-to-b from-black/70 to-transparent">
            <button
              onClick={() => { setMode('grid'); setIsPlaying(false) }}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Progress dots */}
            <div className="flex gap-1.5 max-w-[200px] overflow-hidden">
              {photos.length <= 20
                ? photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      className={cn(
                        'h-1 rounded-full transition-all duration-300',
                        i === currentIndex
                          ? 'w-6 bg-white'
                          : 'w-1.5 bg-white/40 hover:bg-white/60'
                      )}
                    />
                  ))
                : (
                  <span className="text-white/70 font-sans text-xs">
                    {currentIndex + 1} / {photos.length}
                  </span>
                )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main image */}
          <div className="flex-1 flex items-center justify-center relative select-none">
            {currentPhoto.originalUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={currentPhoto.id}
                src={currentPhoto.originalUrl}
                alt={currentPhoto.guest_name ?? 'Wedding photo'}
                className="max-w-full max-h-full object-contain animate-fade-in"
                style={{ maxHeight: 'calc(100vh - 180px)' }}
              />
            ) : currentPhoto.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={currentPhoto.id + '_thumb'}
                src={currentPhoto.thumbUrl}
                alt={currentPhoto.guest_name ?? 'Wedding photo'}
                className="max-w-full max-h-full object-contain animate-fade-in"
                style={{ maxHeight: 'calc(100vh - 180px)' }}
              />
            ) : (
              <div className="w-64 h-64 shimmer rounded-2xl" />
            )}

            {/* Side nav */}
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom bar: guest name, message, controls */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-6 pt-12 pb-8">
            <div className="flex items-end justify-between gap-4 max-w-2xl mx-auto">
              <div className="flex-1 min-w-0">
                {currentPhoto.guest_name && (
                  <p className="font-serif text-white text-lg font-light truncate">
                    {currentPhoto.guest_name}
                  </p>
                )}
                {currentPhoto.message && (
                  <p className="font-serif italic text-white/70 text-sm mt-0.5 line-clamp-2">
                    &ldquo;{currentPhoto.message}&rdquo;
                  </p>
                )}
              </div>

              {/* Play/pause */}
              <button
                onClick={() => setIsPlaying((p) => !p)}
                className="shrink-0 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm border border-white/20"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 translate-x-0.5" />
                )}
              </button>
            </div>

            {/* Auto-advance progress bar */}
            {isPlaying && (
              <div className="mt-4 h-0.5 w-full bg-white/20 rounded-full overflow-hidden max-w-2xl mx-auto">
                <div
                  key={currentIndex + '-' + isPlaying}
                  className="h-full bg-white rounded-full"
                  style={{
                    animation: `slideProgress ${SLIDE_DURATION}ms linear`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline keyframe for progress bar */}
      <style>{`
        @keyframes slideProgress {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
    </div>
  )
}
