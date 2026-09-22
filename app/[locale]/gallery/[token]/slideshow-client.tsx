"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import {
    ChevronLeft,
    ChevronRight,
    Grid3X3,
    Heart,
    ImageIcon,
    ImageOff,
    Loader2,
    Maximize2,
    Pause,
    Play,
    X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { getGalleryPhotosAction } from "@/actions/gallery";
import { cn } from "@/lib/utils";

interface GalleryPhoto {
    id: string;
    guest_name: string | null;
    message: string | null;
    created_at: string;
    width: number | null;
    height: number | null;
    thumbUrl: string | null;
    originalUrl: string | null;
}

interface GallerySlideshowProps {
    initialPhotos: GalleryPhoto[];
    totalCount: number;
    label: string | null;
    eventId: string;
    showMessages: boolean;
    token: string;
}

type ViewMode = "grid" | "slideshow";

const SLIDE_DURATION = 4000;

export function GallerySlideshow({
                                     initialPhotos,
                                     totalCount,
                                     label,
                                     showMessages,
                                     token,
                                 }: GallerySlideshowProps) {
    const t = useTranslations("gallery");

    const prefersReducedMotion = useReducedMotion();

    const [photos, setPhotos] = useState<GalleryPhoto[]>(initialPhotos);

    const [total, setTotal] = useState(totalCount);

    const [loadingMore, setLoadingMore] = useState(false);

    const [mode, setMode] = useState<ViewMode>("grid");

    const [currentIndex, setCurrentIndex] = useState(0);

    const [isPlaying, setIsPlaying] = useState(false);

    const [isFullscreen, setIsFullscreen] = useState(false);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    const goTo = useCallback(
        (index: number) => {
            if (photos.length === 0) return;

            setCurrentIndex(
                ((index % photos.length) + photos.length) % photos.length,
            );
        },
        [photos.length],
    );

    const goPrev = useCallback(
        () => goTo(currentIndex - 1),
        [currentIndex, goTo],
    );

    const goNext = useCallback(
        () => goTo(currentIndex + 1),
        [currentIndex, goTo],
    );

    /*
     * Autoplay
     *
     * Respect the user's reduced-motion
     * preference by never auto-advancing --
     * manual navigation still works.
     */
    useEffect(() => {
        if (isPlaying && !prefersReducedMotion) {
            intervalRef.current = setInterval(goNext, SLIDE_DURATION);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isPlaying, goNext, prefersReducedMotion]);

    /*
     * Keyboard navigation
     */
    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (mode !== "slideshow") return;

            if (event.key === "ArrowLeft") {
                goPrev();
            }

            if (event.key === "ArrowRight") {
                goNext();
            }

            if (event.key === " ") {
                event.preventDefault();
                setIsPlaying((current) => !current);
            }

            if (event.key === "Escape") {
                setMode("grid");
                setIsPlaying(false);
            }
        };

        window.addEventListener("keydown", handler);

        return () => {
            window.removeEventListener("keydown", handler);
        };
    }, [mode, goPrev, goNext]);

    /*
     * Fullscreen
     */
    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await containerRef.current?.requestFullscreen?.();
            } else {
                await document.exitFullscreen?.();
            }
        } catch (error) {
            console.error("Fullscreen error:", error);
        }
    };

    useEffect(() => {
        const handler = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };

        document.addEventListener("fullscreenchange", handler);

        return () => {
            document.removeEventListener("fullscreenchange", handler);
        };
    }, []);

    const openSlideshow = (index: number) => {
        setCurrentIndex(index);
        setMode("slideshow");
    };

    const closeSlideshow = () => {
        setMode("grid");
        setIsPlaying(false);
    };

    /*
     * Load more
     */
    const handleLoadMore = async () => {
        if (loadingMore || photos.length >= total) {
            return;
        }

        setLoadingMore(true);

        try {
            const result = await getGalleryPhotosAction(token, photos.length);

            if (result.photos) {
                setPhotos((current) => [...current, ...result.photos]);

                setTotal((current) =>
                    Math.max(current, photos.length + result.photos.length),
                );
            }

            if (result.error) {
                console.error("Load more error:", result.error);
            }
        } catch (error) {
            console.error("Load more error:", error);
        } finally {
            setLoadingMore(false);
        }
    };

    const currentPhoto = photos[currentIndex];

    return (
        <div ref={containerRef} className="min-h-screen bg-background">
            {/* PAGE HEADER */}
            <header className="relative overflow-hidden px-6 pb-10 pt-10 sm:pb-14 sm:pt-12">
                {/* Ambient background */}
                <div aria-hidden className="pointer-events-none absolute inset-0">
                    <div className="absolute left-1/2 top-[-220px] h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/25 blur-[130px]" />
                </div>

                <div className="relative mx-auto max-w-6xl">
                    {/* Brand */}
                    <div className="mb-14 flex items-center justify-center">
                        <div className="inline-flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white">
                                <Heart className="h-3.5 w-3.5" fill="currentColor" />
                            </div>

                            <span className="font-serif text-xl tracking-tight text-foreground">
                Wedora
              </span>
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="mx-auto max-w-2xl text-center">
                        <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.24em] text-[hsl(var(--primary))]">
                            {t("memoriesShared", {
                                count: photos.length,
                            })}
                        </p>

                        <h1 className="font-serif text-4xl font-light tracking-[-0.025em] text-foreground sm:text-5xl">
                            {label ?? t("title")}
                        </h1>
                    </div>

                    {/* View controls */}
                    {/* View controls */}
                    {photos.length > 0 && (
                        <div className="mt-8 flex justify-center">
                            <div className="inline-flex rounded-full border border-border/70 bg-card/80 p-1 shadow-sm backdrop-blur">
                                <button
                                    type="button"
                                    onClick={() => setMode("grid")}
                                    aria-pressed={mode === "grid"}
                                    className={cn(
                                        "inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-medium transition-all duration-200",
                                        mode === "grid"
                                            ? "bg-[hsl(var(--foreground))] text-background shadow-sm"
                                            : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <Grid3X3 className="h-3.5 w-3.5" />

                                    {t("grid")}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => openSlideshow(currentIndex)}
                                    aria-pressed={mode === "slideshow"}
                                    className={cn(
                                        "inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-medium transition-all duration-200",
                                        mode === "slideshow"
                                            ? "bg-[hsl(var(--foreground))] text-background shadow-sm"
                                            : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <Play className="h-3.5 w-3.5" />

                                    {t("slideshow")}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* GALLERY */}
            {mode === "grid" && (
                <section className="px-4 pb-20 sm:px-6">
                    <div className="mx-auto max-w-7xl">
                        {photos.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                                {photos.map((photo, index) => (
                                    <GalleryImage
                                        key={photo.id}
                                        photo={photo}
                                        index={index}
                                        onOpen={() => openSlideshow(index)}
                                        alt={t("photoAlt", {
                                            number: index + 1,
                                        })}
                                        openLabel={t("openPhoto", {
                                            number: index + 1,
                                        })}
                                        unavailableLabel={t("imageUnavailable.short")}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="mx-auto flex min-h-[420px] max-w-xl items-center justify-center py-8 sm:py-12">
                                <div className="relative w-full overflow-hidden rounded-[2rem] border border-border/70 bg-card px-6 py-12 text-center shadow-sm sm:px-10 sm:py-14">
                                    {/* Subtle ambient glow */}
                                    <div
                                        aria-hidden
                                        className="pointer-events-none absolute inset-0 overflow-hidden"
                                    >
                                        <div className="absolute left-1/2 top-[-180px] h-[320px] w-[420px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/25 blur-[100px]" />
                                    </div>

                                    <div className="relative">
                                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-secondary/60 text-muted-foreground">
                                            <ImageIcon className="h-6 w-6" strokeWidth={1.5} />
                                        </div>

                                        <p className="mt-6 text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                                            {t("empty.eyebrow")}
                                        </p>

                                        <h2 className="mx-auto mt-2 max-w-md font-serif text-3xl font-light tracking-[-0.025em] text-foreground sm:text-4xl">
                                            {t("empty.title")}
                                        </h2>

                                        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                                            {t("empty.description")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Load more */}
                        {photos.length < total && (
                            <div className="mt-12 flex justify-center">
                                <button
                                    type="button"
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="btn-secondary min-w-[160px]"
                                >
                                    {loadingMore ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />

                                            {t("loading")}
                                        </>
                                    ) : (
                                        t("loadMore")
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* FULLSCREEN SLIDESHOW */}
            {mode === "slideshow" && currentPhoto && (
                <section className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#090909] text-white">
                    {/* Background image */}
                    <div aria-hidden className="pointer-events-none absolute inset-0">
                        <div className="absolute inset-0 bg-[#090909]" />

                        <div className="absolute left-1/2 top-[-20%] h-[65%] w-[80%] -translate-x-1/2 rounded-full bg-white/[0.035] blur-[120px]" />
                    </div>

                    {/* TOP BAR */}
                    <div className="relative z-20 flex items-center justify-between px-4 pb-8 pt-4 sm:px-6 sm:pt-6">
                        {/* Close */}
                        <ViewerButton onClick={closeSlideshow} label={t("closeSlideshow")}>
                            <X className="h-4 w-4" />
                        </ViewerButton>

                        {/* Counter */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-[10px] font-medium tracking-[0.1em] text-white/70 backdrop-blur-md">
                {t("photoCounter", {
                    current: currentIndex + 1,
                    total: photos.length,
                })}
              </span>
                        </div>

                        {/* Fullscreen */}
                        <ViewerButton
                            onClick={toggleFullscreen}
                            label={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
                        >
                            <Maximize2 className="h-4 w-4" />
                        </ViewerButton>
                    </div>

                    {/* IMAGE */}
                    <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-3 pb-28 sm:px-14 sm:pb-32">
                        <div className="relative h-full w-full">
                            <GalleryViewerImage
                                photo={currentPhoto}
                                alt={currentPhoto.guest_name ?? t("weddingPhoto")}
                                unavailableTitle={t("imageUnavailable.title")}
                                unavailableDescription={t("imageUnavailable.description")}
                            />
                        </div>

                        {/* Previous */}
                        {photos.length > 1 && (
                            <button
                                type="button"
                                onClick={goPrev}
                                aria-label={t("previousPhoto")}
                                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white backdrop-blur-md transition hover:bg-white/15 sm:left-6 sm:h-12 sm:w-12"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                        )}

                        {/* Next */}
                        {photos.length > 1 && (
                            <button
                                type="button"
                                onClick={goNext}
                                aria-label={t("nextPhoto")}
                                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white backdrop-blur-md transition hover:bg-white/15 sm:right-6 sm:h-12 sm:w-12"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        )}
                    </div>

                    {/* BOTTOM INFO */}
                    <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent px-5 pb-6 pt-20 sm:px-8 sm:pb-8">
                        <div className="mx-auto flex max-w-3xl items-end justify-between gap-6">
                            {/* Caption */}
                            <div className="min-w-0 flex-1">
                                {currentPhoto.guest_name && (
                                    <p className="truncate font-serif text-xl font-light tracking-tight text-white">
                                        {currentPhoto.guest_name}
                                    </p>
                                )}

                                {showMessages && currentPhoto.message && (
                                    <p className="mt-1.5 max-w-xl line-clamp-2 text-sm leading-6 text-white/55">
                                        {currentPhoto.message}
                                    </p>
                                )}
                            </div>

                            {/* Play / Pause */}
                            {photos.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setIsPlaying((playing) => !playing)}
                                    aria-label={
                                        isPlaying ? t("pauseSlideshow") : t("playSlideshow")
                                    }
                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition duration-200 hover:bg-white/20"
                                >
                                    {isPlaying ? (
                                        <Pause className="h-4.5 w-4.5" />
                                    ) : (
                                        <Play className="h-4.5 w-4.5 translate-x-px" />
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Autoplay progress */}
                        {isPlaying && !prefersReducedMotion && (
                            <div className="mx-auto mt-5 h-px max-w-3xl overflow-hidden bg-white/15">
                                <div
                                    key={`${currentIndex}-${isPlaying}`}
                                    className="h-full bg-white/80"
                                    style={{
                                        animation: `slideProgress ${SLIDE_DURATION}ms linear`,
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </section>
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
    );
}

/*
 * Gallery image
 */
function GalleryImage({
                          photo,
                          index,
                          onOpen,
                          alt,
                          openLabel,
                          unavailableLabel,
                      }: {
    photo: GalleryPhoto;
    index: number;
    onOpen: () => void;
    alt: string;
    openLabel: string;
    unavailableLabel: string;
}) {
    type ImageSource = "thumbnail" | "original" | "failed";

    const getInitialSource = (): ImageSource => {
        if (photo.thumbUrl) {
            return "thumbnail";
        }

        if (photo.originalUrl) {
            return "original";
        }

        return "failed";
    };

    const [imageSource, setImageSource] = useState<ImageSource>(getInitialSource);

    const aspectRatio =
        index % 7 === 0
            ? "aspect-[4/5]"
            : index % 5 === 0
                ? "aspect-[5/4]"
                : "aspect-square";

    const src =
        imageSource === "thumbnail"
            ? photo.thumbUrl
            : imageSource === "original"
                ? photo.originalUrl
                : null;

    const unavailable = imageSource === "failed" || !src;

    const handleImageError = () => {
        /*
         * If the thumbnail URL fails in the
         * browser, try the signed original URL
         * before declaring the photo unavailable.
         */
        if (imageSource === "thumbnail" && photo.originalUrl) {
            setImageSource("original");

            return;
        }

        setImageSource("failed");
    };

    return (
        <button
            type="button"
            onClick={unavailable ? undefined : onOpen}
            disabled={unavailable}
            aria-label={unavailable ? unavailableLabel : openLabel}
            className={cn(
                "group relative overflow-hidden rounded-[1.35rem] bg-muted focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/40 focus:ring-offset-2 focus:ring-offset-background sm:rounded-[1.6rem]",
                aspectRatio,
                unavailable && "cursor-default",
            )}
        >
            {!unavailable ? (
                <Image
                    key={`${photo.id}-${imageSource}`}
                    src={src}
                    alt={photo.guest_name ?? alt}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                    onError={handleImageError}
                />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-secondary/60 px-4 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/70 text-muted-foreground">
                        <ImageOff className="h-4.5 w-4.5" strokeWidth={1.5} />
                    </div>

                    <span className="max-w-[150px] text-[10px] font-medium leading-4 text-muted-foreground">
            {unavailableLabel}
          </span>
                </div>
            )}

            {!unavailable && (
                <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    {photo.guest_name && (
                        <div className="absolute inset-x-0 bottom-0 translate-y-2 px-4 pb-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                            <p className="truncate text-left text-xs font-medium text-white">
                                {photo.guest_name}
                            </p>
                        </div>
                    )}
                </>
            )}
        </button>
    );
}

function GalleryViewerImage({
                                photo,
                                alt,
                                unavailableTitle,
                                unavailableDescription,
                            }: {
    photo: GalleryPhoto;
    alt: string;
    unavailableTitle: string;
    unavailableDescription: string;
}) {
    type ImageSource = "original" | "thumbnail" | "failed";

    const resolveInitialSource = useCallback((): ImageSource => {
        if (photo.originalUrl) {
            return "original";
        }

        if (photo.thumbUrl) {
            return "thumbnail";
        }

        return "failed";
    }, [photo.originalUrl, photo.thumbUrl]);

    const [imageSource, setImageSource] =
        useState<ImageSource>(resolveInitialSource);

    /*
     * Reset when moving to another photo.
     */
    useEffect(() => {
        setImageSource(resolveInitialSource());
    }, [photo.id, resolveInitialSource]);

    const src =
        imageSource === "original"
            ? photo.originalUrl
            : imageSource === "thumbnail"
                ? photo.thumbUrl
                : null;

    const handleImageError = () => {
        /*
         * Full resolution failed.
         * Try the thumbnail before giving up.
         */
        if (imageSource === "original" && photo.thumbUrl) {
            setImageSource("thumbnail");

            return;
        }

        setImageSource("failed");
    };

    if (!src || imageSource === "failed") {
        return (
            <div className="absolute inset-0 flex items-center justify-center px-6">
                <div className="max-w-sm text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/50">
                        <ImageOff className="h-6 w-6" strokeWidth={1.5} />
                    </div>

                    <p className="mt-5 font-serif text-2xl font-light text-white">
                        {unavailableTitle}
                    </p>

                    <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-white/50">
                        {unavailableDescription}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <Image
            key={`${photo.id}-${imageSource}`}
            src={src}
            alt={alt}
            fill
            priority
            sizes="100vw"
            className="object-contain"
            onError={handleImageError}
        />
    );
}

/*
 * Viewer button
 */
function ViewerButton({
                          children,
                          onClick,
                          label,
                      }: {
    children: React.ReactNode;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white backdrop-blur-md transition duration-200 hover:bg-white/15"
        >
            {children}
        </button>
    );
}
