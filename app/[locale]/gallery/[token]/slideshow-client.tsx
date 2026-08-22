'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import Image from 'next/image'
import {
    ChevronLeft,
    ChevronRight,
    Grid,
    Heart,
    Loader2,
    Maximize2,
    Pause,
    Play,
    X,
} from 'lucide-react'
import {cn} from '@/lib/utils'
import {getGalleryPhotosAction} from '@/actions/gallery'
import {useTranslations} from 'next-intl'

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
    initialPhotos: GalleryPhoto[]
    totalCount: number
    label: string | null
    eventId: string
    showMessages: boolean
    token: string
}

type ViewMode = 'grid' | 'slideshow'

export function GallerySlideshow({
                                     initialPhotos,
                                     totalCount,
                                     label,
                                     eventId,
                                     showMessages,
                                     token,
                                 }: GallerySlideshowProps) {
    const t = useTranslations('gallery')

    const [photos, setPhotos] = useState<GalleryPhoto[]>(initialPhotos)
    const [total, setTotal] = useState(totalCount)
    const [loadingMore, setLoadingMore] = useState(false)
    const [mode, setMode] = useState<ViewMode>('grid')
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({})

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const SLIDE_DURATION = 4000

    const goTo = useCallback(
        (index: number) => {
            if (photos.length === 0) return

            setCurrentIndex(
                ((index % photos.length) + photos.length) % photos.length
            )

            setImageLoaded((prev) => ({...prev}))
        },
        [photos.length]
    )

    const goPrev = useCallback(
        () => goTo(currentIndex - 1),
        [currentIndex, goTo]
    )

    const goNext = useCallback(
        () => goTo(currentIndex + 1),
        [currentIndex, goTo]
    )

    // Autoplay
    useEffect(() => {
        if (isPlaying) {
            intervalRef.current = setInterval(
                goNext,
                SLIDE_DURATION
            )
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [isPlaying, goNext])

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (mode !== 'slideshow') return

            if (e.key === 'ArrowLeft') {
                goPrev()
            }

            if (e.key === 'ArrowRight') {
                goNext()
            }

            if (e.key === ' ') {
                e.preventDefault()
                setIsPlaying((p) => !p)
            }

            if (e.key === 'Escape') {
                setMode('grid')
                setIsPlaying(false)
            }
        }

        window.addEventListener('keydown', handler)

        return () => {
            window.removeEventListener('keydown', handler)
        }
    }, [mode, goPrev, goNext])

    // Fullscreen API
    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await containerRef.current?.requestFullscreen?.()
                setIsFullscreen(true)
            } else {
                await document.exitFullscreen?.()
                setIsFullscreen(false)
            }
        } catch (error) {
            console.error('Fullscreen error:', error)
        }
    }

    useEffect(() => {
        const handler = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }

        document.addEventListener('fullscreenchange', handler)

        return () => {
            document.removeEventListener('fullscreenchange', handler)
        }
    }, [])

    const openSlideshow = (index: number) => {
        setCurrentIndex(index)
        setMode('slideshow')
    }

    const handleLoadMore = async () => {
        if (loadingMore || photos.length >= total) return

        setLoadingMore(true)

        try {
            const result = await getGalleryPhotosAction(
                token,
                photos.length
            )

            if (result.photos) {
                setPhotos((prev) => [...prev, ...result.photos])
                setTotal((prev) => Math.max(prev, photos.length + result.photos.length))
            }

            if (result.error) {
                console.error('Load more error:', result.error)
            }
        } catch (err) {
            console.error('Load more error:', err)
        } finally {
            setLoadingMore(false)
        }
    }

    const currentPhoto = photos[currentIndex]

    return (
        <div
            className="min-h-screen bg-background"
            ref={containerRef}
        >
            {/* HEADER */}
            <header className="px-6 pt-10 pb-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="h-px w-12 bg-[hsl(var(--gold))] opacity-60"/>

                    <Heart
                        className="w-3 h-3 text-[hsl(var(--primary))]"
                        fill="currentColor"
                    />

                    <div className="h-px w-12 bg-[hsl(var(--gold))] opacity-60"/>
                </div>

                <h1 className="font-serif text-4xl font-light text-foreground">
                    {label ?? t('title')}
                </h1>

                <p className="font-sans text-xs tracking-widest uppercase text-muted-foreground mt-2">
                    {t('memoriesShared', {
                        count: photos.length,
                    })}
                </p>
            </header>

            {/* CONTROLS */}
            <div className="flex items-center justify-center gap-3 pb-6">
                <button
                    type="button"
                    onClick={() => setMode('grid')}
                    aria-pressed={mode === 'grid'}
                    className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-full font-sans text-xs font-medium transition-colors',
                        mode === 'grid'
                            ? 'bg-[hsl(var(--primary))] text-white'
                            : 'bg-secondary text-secondary-foreground hover:bg-muted'
                    )}
                >
                    <Grid className="w-3.5 h-3.5"/>
                    {t('grid')}
                </button>

                <button
                    type="button"
                    onClick={() => openSlideshow(currentIndex)}
                    aria-pressed={mode === 'slideshow'}
                    className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-full font-sans text-xs font-medium transition-colors',
                        mode === 'slideshow'
                            ? 'bg-[hsl(var(--primary))] text-white'
                            : 'bg-secondary text-secondary-foreground hover:bg-muted'
                    )}
                >
                    <Play className="w-3.5 h-3.5"/>
                    {t('slideshow')}
                </button>
            </div>

            {/* GRID MODE */}
            {mode === 'grid' && (
                <div className="max-w-6xl mx-auto px-4 pb-16">
                    <div className="photo-grid">
                        {photos.map((photo, i) => (
                            <button
                                type="button"
                                key={photo.id}
                                onClick={() => openSlideshow(i)}
                                aria-label={t('openPhoto', {
                                    number: i + 1,
                                })}
                                className="group relative aspect-square rounded-xl overflow-hidden bg-muted focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                            >
                                {photo.thumbUrl ? (
                                    <Image
                                        src={photo.thumbUrl}
                                        alt={
                                            photo.guest_name ??
                                            t('photoAlt', {
                                                number: i + 1,
                                            })
                                        }
                                        fill
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        onLoad={() =>
                                            setImageLoaded((prev) => ({
                                                ...prev,
                                                [photo.id]: true,
                                            }))
                                        }
                                    />
                                ) : (
                                    <div className="w-full h-full shimmer"/>
                                )}

                                {/* Hover overlay */}
                                <div
                                    className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200"
                                />

                                {/* Guest name */}
                                {photo.guest_name && (
                                    <div
                                        className="absolute bottom-0 inset-x-0 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                    >
                                        <p className="text-white font-sans text-xs truncate">
                                            {photo.guest_name}
                                        </p>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Load more */}
                    {photos.length < total && (
                        <div className="mt-12 flex justify-center pb-12">
                            <button
                                type="button"
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="px-8 py-3 rounded-full border border-[hsl(var(--gold))] text-[hsl(var(--primary))] font-sans text-sm hover:bg-[hsl(var(--accent))] transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {loadingMore ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin"/>
                                        {t('loading')}
                                    </>
                                ) : (
                                    t('loadMore')
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* SLIDESHOW MODE */}
            {mode === 'slideshow' && currentPhoto && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col">
                    {/* Top bar */}
                    <div
                        className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 pt-4 pb-8 bg-gradient-to-b from-black/70 to-transparent"
                    >
                        <button
                            type="button"
                            onClick={() => {
                                setMode('grid')
                                setIsPlaying(false)
                            }}
                            aria-label={t('closeSlideshow')}
                            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                        >
                            <X className="w-4 h-4"/>
                        </button>

                        {/* Progress dots */}
                        <div className="flex gap-1.5 max-w-[200px] overflow-hidden">
                            {photos.length <= 20 ? (
                                photos.map((_, i) => (
                                    <button
                                        type="button"
                                        key={i}
                                        onClick={() => goTo(i)}
                                        aria-label={t('goToPhoto', {
                                            number: i + 1,
                                        })}
                                        className={cn(
                                            'h-1 rounded-full transition-all duration-300',
                                            i === currentIndex
                                                ? 'w-6 bg-white'
                                                : 'w-1.5 bg-white/40 hover:bg-white/60'
                                        )}
                                    />
                                ))
                            ) : (
                                <span className="text-white/70 font-sans text-xs">
                                    {t('photoCounter', {
                                        current: currentIndex + 1,
                                        total: photos.length,
                                    })}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={toggleFullscreen}
                                aria-label={
                                    isFullscreen
                                        ? t('exitFullscreen')
                                        : t('fullscreen')
                                }
                                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                            >
                                <Maximize2 className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>

                    {/* Main image */}
                    <div className="flex-1 flex items-center justify-center relative select-none">
                        {currentPhoto.originalUrl ? (
                            <Image
                                key={currentPhoto.id}
                                src={currentPhoto.originalUrl}
                                alt={
                                    currentPhoto.guest_name ??
                                    t('weddingPhoto')
                                }
                                fill
                                priority
                                className="object-contain animate-fade-in"
                                sizes="100vw"
                            />
                        ) : currentPhoto.thumbUrl ? (
                            <Image
                                key={`${currentPhoto.id}_thumb`}
                                src={currentPhoto.thumbUrl}
                                alt={
                                    currentPhoto.guest_name ??
                                    t('weddingPhoto')
                                }
                                fill
                                priority
                                className="object-contain animate-fade-in"
                                sizes="100vw"
                            />
                        ) : (
                            <div className="w-64 h-64 shimmer rounded-2xl"/>
                        )}

                        {/* Previous */}
                        <button
                            type="button"
                            onClick={goPrev}
                            aria-label={t('previousPhoto')}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                        >
                            <ChevronLeft className="w-6 h-6"/>
                        </button>

                        {/* Next */}
                        <button
                            type="button"
                            onClick={goNext}
                            aria-label={t('nextPhoto')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                        >
                            <ChevronRight className="w-6 h-6"/>
                        </button>
                    </div>

                    {/* Bottom bar */}
                    <div
                        className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-6 pt-12 pb-8"
                    >
                        <div className="flex items-end justify-between gap-4 max-w-2xl mx-auto">
                            <div className="flex-1 min-w-0">
                                {currentPhoto.guest_name && (
                                    <p className="font-serif text-white text-lg font-light truncate">
                                        {currentPhoto.guest_name}
                                    </p>
                                )}

                                {showMessages && currentPhoto.message && (
                                    <p className="font-serif italic text-white/70 text-sm mt-0.5 line-clamp-2">
                                        &ldquo;{currentPhoto.message}&rdquo;
                                    </p>
                                )}
                            </div>

                            {/* Play/pause */}
                            <button
                                type="button"
                                onClick={() =>
                                    setIsPlaying((p) => !p)
                                }
                                aria-label={
                                    isPlaying
                                        ? t('pauseSlideshow')
                                        : t('playSlideshow')
                                }
                                className="shrink-0 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm border border-white/20"
                            >
                                {isPlaying ? (
                                    <Pause className="w-5 h-5"/>
                                ) : (
                                    <Play className="w-5 h-5 translate-x-0.5"/>
                                )}
                            </button>
                        </div>

                        {/* Auto-advance progress */}
                        {isPlaying && (
                            <div
                                className="mt-4 h-0.5 w-full bg-white/20 rounded-full overflow-hidden max-w-2xl mx-auto"
                            >
                                <div
                                    key={`${currentIndex}-${isPlaying}`}
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

            <style>{`
                @keyframes slideProgress {
                    from {
                        width: 0%;
                    }

                    to {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    )
}