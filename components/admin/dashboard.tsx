'use client'

import {
    type MouseEvent,
    type ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
    useTransition,
} from 'react'

import Image from 'next/image'
import {
    ArchiveIcon,
    Armchair,
    ArrowLeft,
    Check,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    ExternalLink,
    Eye,
    EyeOff,
    Heart,
    Images,
    Link as LinkIcon,
    Loader2,
    LogOut,
    Share2,
    Trash2,
    X,
    XCircle,
} from 'lucide-react'
import {
    useLocale,
    useTranslations,
} from 'next-intl'

import {
    createGalleryTokenAction,
    deleteGalleryTokenAction,
    deletePhotoAction,
    getPhotosAction,
    getSignedUrlAction,
    listGalleryTokensAction,
    signOutAction,
    updatePhotoAction,
} from '@/actions/admin'
import { ThemeToggle } from '@/components/theme-toggle'
import {
    Link,
    useRouter,
} from '@/lib/navigation'
import {
    cn,
    formatDate,
    invertUpdate,
} from '@/lib/utils'
import type { Photo } from '@/types/database'

interface AdminDashboardProps {
    initialPhotos: Photo[]
    initialTotal: number
    adminEmail: string
    weddingId: string
    weddingName?: string
    role: 'admin' | 'couple'
    error?: string
    activeFilter?: string
}

interface GalleryToken {
    id: string
    token: string
    label: string | null
    expires_at: string | null
    created_at: string
    photo_filter: string
}

type PhotoUpdate = {
    approved?: boolean
    hidden?: boolean
    favourite?: boolean
}

type PhotoFilter =
    | 'all'
    | 'favourites'

const PAGE_SIZE = 50

export function AdminDashboard({
                                   initialPhotos,
                                   initialTotal,
                                   adminEmail,
                                   weddingId,
                                   weddingName,
                                   role,
                                   error: initialError,
                                   activeFilter,
                               }: AdminDashboardProps) {
    const router =
        useRouter()

    const t =
        useTranslations(
            'dashboard.photos'
        )

    const tc =
        useTranslations(
            'common'
        )

    const [
        ,
        startTransition,
    ] = useTransition()

    const FILTERS = [
        {
            key: undefined,
            label: t(
                'allPhotos'
            ),
        },
        {
            key: 'favourites',
            label: t(
                'favourites'
            ),
        },
        {
            key: 'hidden',
            label: t(
                'hidden'
            ),
        },
        {
            key: 'unapproved',
            label: t(
                'unapproved'
            ),
        },
    ]

    /*
     * Photos
     */
    const [
        photos,
        setPhotos,
    ] =
        useState<Photo[]>(
            initialPhotos
        )

    const [
        total,
        setTotal,
    ] =
        useState(
            initialTotal
        )

    const [
        error,
        setError,
    ] =
        useState<
            string | undefined
        >(
            initialError
        )

    const [
        loadingMore,
        setLoadingMore,
    ] =
        useState(false)

    const [
        selectedPhoto,
        setSelectedPhoto,
    ] =
        useState<Photo | null>(
            null
        )

    const [
        signedUrls,
        setSignedUrls,
    ] =
        useState<
            Record<
                string,
                {
                    thumb: string
                    original: string
                }
            >
        >({})

    const [
        loadingUrls,
        setLoadingUrls,
    ] =
        useState<
            Record<
                string,
                boolean
            >
        >({})

    const [
        actionLoading,
        setActionLoading,
    ] =
        useState<
            Record<
                string,
                boolean
            >
        >({})

    /*
     * ZIP
     */
    const [
        zipLoading,
        setZipLoading,
    ] =
        useState<
            | 'all'
            | 'favourites'
            | null
        >(null)

    /*
     * Gallery sharing
     */
    const [
        shareOpen,
        setShareOpen,
    ] =
        useState(false)

    const [
        shareLoading,
        setShareLoading,
    ] =
        useState(false)

    const [
        shareUrl,
        setShareUrl,
    ] =
        useState<
            string | null
        >(null)

    const [
        galleryTokens,
        setGalleryTokens,
    ] =
        useState<
            GalleryToken[]
        >([])

    const [
        loadingTokens,
        setLoadingTokens,
    ] =
        useState(false)

    const [
        showCreateForm,
        setShowCreateForm,
    ] =
        useState(false)

    const [
        copied,
        setCopied,
    ] =
        useState(false)

    const [
        showMessages,
        setShowMessages,
    ] =
        useState(true)

    const [
        expiresInDays,
        setExpiresInDays,
    ] =
        useState('')

    const [
        photoFilter,
        setPhotoFilter,
    ] =
        useState<PhotoFilter>(
            'all'
        )

    const [
        galleryLabel,
        setGalleryLabel,
    ] =
        useState(
            'Wedding Gallery'
        )

    /*
     * Synchronise client state with
     * server-side filter results.
     */
    useEffect(() => {
        setPhotos(
            initialPhotos
        )

        setTotal(
            initialTotal
        )

        setError(
            initialError
        )

        setSelectedPhoto(
            null
        )
    }, [
        initialPhotos,
        initialTotal,
        initialError,
        activeFilter,
    ])

    /*
     * Signed URLs
     */
    const getSignedUrls =
        useCallback(
            async (
                photo: Photo
            ) => {
                if (
                    signedUrls[
                        photo.id
                        ]
                ) {
                    return signedUrls[
                        photo.id
                        ]
                }

                setLoadingUrls(
                    (
                        current
                    ) => ({
                        ...current,
                        [photo.id]:
                            true,
                    })
                )

                try {
                    const [
                        thumbResult,
                        originalResult,
                    ] =
                        await Promise.all(
                            [
                                getSignedUrlAction(
                                    photo.thumbnail_path,
                                    'thumbnails'
                                ),
                                getSignedUrlAction(
                                    photo.original_path,
                                    'photos'
                                ),
                            ]
                        )

                    if (
                        thumbResult.url &&
                        originalResult.url
                    ) {
                        const urls =
                            {
                                thumb:
                                thumbResult.url,
                                original:
                                originalResult.url,
                            }

                        setSignedUrls(
                            (
                                current
                            ) => ({
                                ...current,
                                [photo.id]:
                                urls,
                            })
                        )

                        return urls
                    }
                } finally {
                    setLoadingUrls(
                        (
                            current
                        ) => ({
                            ...current,
                            [photo.id]:
                                false,
                        })
                    )
                }

                return null
            },
            [signedUrls]
        )

    /*
     * Photo viewer
     */
    const openModal =
        async (
            photo: Photo
        ) => {
            setSelectedPhoto(
                photo
            )

            await getSignedUrls(
                photo
            )
        }

    const closeModal =
        () => {
            setSelectedPhoto(
                null
            )
        }

    /*
     * Update photo
     */
    const handleUpdate =
        async (
            id: string,
            update: PhotoUpdate
        ) => {
            setActionLoading(
                (
                    current
                ) => ({
                    ...current,
                    [id]:
                        true,
                })
            )

            /*
             * Optimistic update
             */
            setPhotos(
                (
                    current
                ) =>
                    current.map(
                        (
                            photo
                        ) =>
                            photo.id ===
                            id
                                ? {
                                    ...photo,
                                    ...update,
                                }
                                : photo
                    )
            )

            setSelectedPhoto(
                (
                    current
                ) =>
                    current?.id ===
                    id
                        ? {
                            ...current,
                            ...update,
                        }
                        : current
            )

            try {
                const result =
                    await updatePhotoAction(
                        id,
                        update
                    )

                if (
                    !result.success
                ) {
                    /*
                     * Revert optimistic update
                     */
                    setPhotos(
                        (
                            current
                        ) =>
                            current.map(
                                (
                                    photo
                                ) =>
                                    photo.id ===
                                    id
                                        ? {
                                            ...photo,
                                            ...invertUpdate(
                                                photo,
                                                update
                                            ),
                                        }
                                        : photo
                            )
                    )

                    setSelectedPhoto(
                        (
                            current
                        ) =>
                            current?.id ===
                            id
                                ? {
                                    ...current,
                                    ...invertUpdate(
                                        current,
                                        update
                                    ),
                                }
                                : current
                    )
                }

                startTransition(
                    () =>
                        router.refresh()
                )
            } finally {
                setActionLoading(
                    (
                        current
                    ) => ({
                        ...current,
                        [id]:
                            false,
                    })
                )
            }
        }

    /*
     * Delete photo
     */
    const handleDelete =
        async (
            id: string
        ) => {
            if (
                !window.confirm(
                    t(
                        'confirmDelete'
                    )
                )
            ) {
                return
            }

            setActionLoading(
                (
                    current
                ) => ({
                    ...current,
                    [id]:
                        true,
                })
            )

            try {
                const result =
                    await deletePhotoAction(
                        id,
                        weddingId
                    )

                if (
                    result.success
                ) {
                    setPhotos(
                        (
                            current
                        ) =>
                            current.filter(
                                (
                                    photo
                                ) =>
                                    photo.id !==
                                    id
                            )
                    )

                    setTotal(
                        (
                            current
                        ) =>
                            Math.max(
                                0,
                                current -
                                1
                            )
                    )

                    if (
                        selectedPhoto?.id ===
                        id
                    ) {
                        closeModal()
                    }
                }

                startTransition(
                    () =>
                        router.refresh()
                )
            } catch (
                deleteError
                ) {
                console.error(
                    'Delete photo error:',
                    deleteError
                )

                window.alert(
                    t(
                        'deleteFailed'
                    )
                )
            } finally {
                setActionLoading(
                    (
                        current
                    ) => ({
                        ...current,
                        [id]:
                            false,
                    })
                )
            }
        }

    /*
     * Download one photo
     */
    const handleDownload =
        async (
            photo: Photo
        ) => {
            const urls =
                await getSignedUrls(
                    photo
                )

            if (!urls) {
                return
            }

            const anchor =
                document.createElement(
                    'a'
                )

            anchor.href =
                urls.original

            anchor.download =
                `wedding-photo-${photo.id.slice(
                    0,
                    8
                )}.webp`

            document.body.appendChild(
                anchor
            )

            anchor.click()
            anchor.remove()
        }

    /*
     * Download ZIP
     */
    const handleZipDownload =
        async (
            filter:
                | 'all'
                | 'favourites'
        ) => {
            setZipLoading(
                filter
            )

            try {
                const url =
                    `/api/admin/zip?weddingId=${weddingId}` +
                    (filter ===
                    'favourites'
                        ? '&filter=favourites'
                        : '')

                const response =
                    await fetch(
                        url
                    )

                if (
                    !response.ok
                ) {
                    window.alert(
                        t(
                            'failedToGenerateZip'
                        )
                    )

                    return
                }

                const blob =
                    await response.blob()

                const objectUrl =
                    URL.createObjectURL(
                        blob
                    )

                const date =
                    new Date()
                        .toISOString()
                        .slice(
                            0,
                            10
                        )

                const anchor =
                    document.createElement(
                        'a'
                    )

                anchor.href =
                    objectUrl

                anchor.download =
                    `wedding-photos-${filter}-${date}.zip`

                document.body.appendChild(
                    anchor
                )

                anchor.click()
                anchor.remove()

                URL.revokeObjectURL(
                    objectUrl
                )
            } finally {
                setZipLoading(
                    null
                )
            }
        }

    /*
     * Load more
     */
    const handleLoadMore =
        async () => {
            if (
                loadingMore ||
                photos.length >=
                total
            ) {
                return
            }

            setLoadingMore(
                true
            )

            try {
                const filters =
                    activeFilter ===
                    'favourites'
                        ? {
                            favourite:
                                true,
                        }
                        : activeFilter ===
                        'hidden'
                            ? {
                                hidden:
                                    true,
                            }
                            : activeFilter ===
                            'unapproved'
                                ? {
                                    approved:
                                        false,
                                }
                                : undefined

                const result =
                    await getPhotosAction(
                        weddingId,
                        filters,
                        PAGE_SIZE,
                        photos.length
                    )

                if (
                    result.photos
                ) {
                    setPhotos(
                        (
                            current
                        ) => [
                            ...current,
                            ...result.photos,
                        ]
                    )

                    if (
                        result.total !==
                        undefined
                    ) {
                        setTotal(
                            result.total
                        )
                    }
                }
            } catch (
                loadError
                ) {
                console.error(
                    'Load more error:',
                    loadError
                )
            } finally {
                setLoadingMore(
                    false
                )
            }
        }

    /*
     * Gallery links
     */
    const loadGalleryTokens =
        useCallback(
            async () => {
                setLoadingTokens(
                    true
                )

                try {
                    const result =
                        await listGalleryTokensAction()

                    setGalleryTokens(
                        result.tokens ??
                        []
                    )
                } finally {
                    setLoadingTokens(
                        false
                    )
                }
            },
            []
        )

    const openShareModal =
        () => {
            setShareOpen(
                true
            )

            setShareUrl(
                null
            )

            setCopied(
                false
            )

            setShowCreateForm(
                false
            )

            void loadGalleryTokens()
        }

    const closeShareModal =
        () => {
            setShareOpen(
                false
            )

            setShareUrl(
                null
            )

            setCopied(
                false
            )

            setShowCreateForm(
                false
            )
        }

    const handleCreateGalleryLink =
        async () => {
            setShareLoading(
                true
            )

            try {
                const result =
                    await createGalleryTokenAction(
                        {
                            showMessages,

                            expiresInDays:
                                expiresInDays
                                    ? Number.parseInt(
                                        expiresInDays,
                                        10
                                    )
                                    : undefined,

                            label:
                                galleryLabel ||
                                'Wedding Gallery',

                            photoFilter,
                        }
                    )

                if (
                    result.url
                ) {
                    setShareUrl(
                        result.url
                    )

                    await loadGalleryTokens()
                } else {
                    window.alert(
                        result.error ??
                        t(
                            'failedToCreateLink'
                        )
                    )
                }
            } finally {
                setShareLoading(
                    false
                )
            }
        }

    const handleCopy =
        async () => {
            if (
                !shareUrl
            ) {
                return
            }

            await navigator.clipboard.writeText(
                shareUrl
            )

            setCopied(
                true
            )

            window.setTimeout(
                () => {
                    setCopied(
                        false
                    )
                },
                2000
            )
        }

    const handleDeleteToken =
        async (
            id: string
        ) => {
            if (
                !window.confirm(
                    t(
                        'deleteGalleryLinkConfirm'
                    )
                )
            ) {
                return
            }

            await deleteGalleryTokenAction(
                id
            )

            await loadGalleryTokens()
        }

    /*
     * Filters
     */
    const handleFilterChange =
        (
            filter?: string
        ) => {
            const base =
                role === 'admin'
                    ? `/admin/weddings/${weddingId}/photos`
                    : `/couple/weddings/${weddingId}/photos`

            const url =
                filter
                    ? `${base}?filter=${filter}`
                    : base

            router.push(
                url
            )
        }

    /*
     * Viewer navigation
     */
    const modalIndex =
        photos.findIndex(
            (
                photo
            ) =>
                photo.id ===
                selectedPhoto?.id
        )

    const goPrev =
        async () => {
            if (
                modalIndex <=
                0
            ) {
                return
            }

            await openModal(
                photos[
                modalIndex -
                1
                    ]
            )
        }

    const goNext =
        async () => {
            if (
                modalIndex >=
                photos.length -
                1
            ) {
                return
            }

            await openModal(
                photos[
                modalIndex +
                1
                    ]
            )
        }

    return (
        <div
            className={cn(
                'relative overflow-hidden bg-background',
                role === 'admin'
                    ? 'min-h-[calc(100vh-4rem)]'
                    : 'min-h-screen'
            )}
        >
            {/* Couple ambient only */}
            {role ===
                'couple' && (
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                    >
                        <div className="absolute left-1/2 top-[-320px] h-[680px] w-[920px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/20 blur-[150px]" />
                    </div>
                )}

            {/* =====================================
                COUPLE HEADER ONLY
            ===================================== */}
            {role ===
                'couple' && (
                    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
                        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
                            {/* Brand */}
                            <Link
                                href={`/couple/weddings/${weddingId}`}
                                className="flex items-center gap-2.5"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white shadow-sm">
                                    <Heart
                                        className="h-3.5 w-3.5"
                                        fill="currentColor"
                                    />
                                </div>

                                <span className="font-serif text-xl tracking-tight text-foreground">
                                Wedora
                            </span>
                            </Link>

                            <div className="flex items-center gap-1 sm:gap-2">
                                <ThemeToggle />

                                <Link
                                    href={`/couple/weddings/${weddingId}/seating`}
                                    aria-label={t(
                                        'seating'
                                    )}
                                    className="flex h-9 items-center gap-2 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-4"
                                >
                                    <Armchair
                                        className="h-3.5 w-3.5"
                                        strokeWidth={
                                            1.6
                                        }
                                    />

                                    <span className="hidden sm:inline">
                                    {t(
                                        'seating'
                                    )}
                                </span>
                                </Link>

                                <button
                                    type="button"
                                    onClick={
                                        openShareModal
                                    }
                                    aria-label={t(
                                        'shareGallery'
                                    )}
                                    className="flex h-9 items-center gap-2 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-4"
                                >
                                    <Share2
                                        className="h-3.5 w-3.5"
                                        strokeWidth={
                                            1.6
                                        }
                                    />

                                    <span className="hidden md:inline">
                                    {t(
                                        'shareGallery'
                                    )}
                                </span>
                                </button>

                                <ZipMenu
                                    zipLoading={
                                        zipLoading
                                    }
                                    onDownload={
                                        handleZipDownload
                                    }
                                    compact
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        void signOutAction()
                                    }
                                    aria-label={tc(
                                        'logout'
                                    )}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:w-auto sm:px-3"
                                >
                                    <LogOut
                                        className="h-3.5 w-3.5"
                                        strokeWidth={
                                            1.6
                                        }
                                    />

                                    <span className="ml-2 hidden lg:inline">
                                    {tc(
                                        'logout'
                                    )}
                                </span>
                                </button>
                            </div>
                        </div>
                    </header>
                )}

            {/* =====================================
                PAGE
            ===================================== */}
            <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
                {/* Heading */}
                <div className="mb-8">
                    {/* Admin navigation */}
                    {role ===
                        'admin' && (
                            <Link
                                href={`/admin/weddings/${weddingId}`}
                                className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <ArrowLeft
                                    className="h-3.5 w-3.5"
                                    strokeWidth={
                                        1.6
                                    }
                                />

                                {t(
                                    'backToWedding'
                                )}
                            </Link>
                        )}

                    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                        <div>
                            {role ===
                                'admin' &&
                                weddingName && (
                                    <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                                        {
                                            weddingName
                                        }
                                    </p>
                                )}

                            <h1 className="font-serif text-4xl font-light tracking-[-0.025em] text-foreground sm:text-5xl">
                                {t(
                                    'title'
                                )}
                            </h1>

                            {role ===
                            'admin' ? (
                                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                                    {t(
                                        'description'
                                    )}
                                </p>
                            ) : (
                                adminEmail && (
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        {
                                            adminEmail
                                        }
                                    </p>
                                )
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Count */}
                            <div className="rounded-full border border-border/70 bg-card px-4 py-2.5 text-xs text-muted-foreground shadow-sm">
                                {t(
                                    'photoCount',
                                    {
                                        count:
                                        total,
                                    }
                                )}
                            </div>

                            {/* Admin actions */}
                            {role ===
                                'admin' && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={
                                                openShareModal
                                            }
                                            className="btn-secondary justify-center"
                                        >
                                            <Share2 className="h-4 w-4" />

                                            {t(
                                                'shareGallery'
                                            )}
                                        </button>

                                        <ZipMenu
                                            zipLoading={
                                                zipLoading
                                            }
                                            onDownload={
                                                handleZipDownload
                                            }
                                        />
                                    </>
                                )}
                        </div>
                    </div>
                </div>

                {/* =====================================
                    FILTERS
                ===================================== */}
                <div className="mb-7 flex items-center gap-2 overflow-x-auto pb-1">
                    {FILTERS.map(
                        ({
                             key,
                             label,
                         }) => {
                            const active =
                                activeFilter ===
                                key ||
                                (!activeFilter &&
                                    !key)

                            return (
                                <button
                                    key={
                                        label
                                    }
                                    type="button"
                                    onClick={() =>
                                        handleFilterChange(
                                            key
                                        )
                                    }
                                    className={cn(
                                        'shrink-0 rounded-full border px-4 py-2 text-[11px] font-medium transition-all',
                                        active
                                            ? 'border-foreground bg-foreground text-background shadow-sm'
                                            : 'border-border/70 bg-card text-muted-foreground hover:border-foreground/15 hover:text-foreground'
                                    )}
                                >
                                    {
                                        label
                                    }
                                </button>
                            )
                        }
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div
                        role="alert"
                        className="mb-6 rounded-2xl border border-destructive/15 bg-destructive/[0.06] px-4 py-3.5"
                    >
                        <p className="text-xs leading-5 text-destructive">
                            {
                                error
                            }
                        </p>
                    </div>
                )}

                {/* Empty */}
                {photos.length ===
                    0 && (
                        <div className="rounded-[2rem] border border-border/60 bg-card/70 px-6 py-20 text-center shadow-sm backdrop-blur">
                            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                                <Images
                                    className="h-5 w-5 text-muted-foreground"
                                    strokeWidth={
                                        1.5
                                    }
                                />
                            </div>

                            <h2 className="font-serif text-2xl font-light text-foreground">
                                {t(
                                    'noPhotos'
                                )}
                            </h2>

                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                                {t(
                                    'noPhotosMatchingFilter'
                                )}
                            </p>
                        </div>
                    )}

                {/* Photos */}
                {photos.length >
                    0 && (
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                            {photos.map(
                                (
                                    photo
                                ) => (
                                    <PhotoCard
                                        key={
                                            photo.id
                                        }
                                        photo={
                                            photo
                                        }
                                        thumbnailUrl={
                                            signedUrls[
                                                photo
                                                    .id
                                                ]
                                                ?.thumb
                                        }
                                        isLoadingUrl={
                                            loadingUrls[
                                                photo
                                                    .id
                                                ]
                                        }
                                        isActionLoading={
                                            actionLoading[
                                                photo
                                                    .id
                                                ]
                                        }
                                        onOpen={() =>
                                            void openModal(
                                                photo
                                            )
                                        }
                                        onUpdate={
                                            handleUpdate
                                        }
                                        onDelete={
                                            handleDelete
                                        }
                                        onUrlNeeded={() =>
                                            void getSignedUrls(
                                                photo
                                            )
                                        }
                                    />
                                )
                            )}
                        </div>
                    )}

                {/* Load more */}
                {photos.length <
                    total && (
                        <div className="mt-12 flex justify-center">
                            <button
                                type="button"
                                onClick={() =>
                                    void handleLoadMore()
                                }
                                disabled={
                                    loadingMore
                                }
                                className="btn-secondary min-w-[180px] justify-center"
                            >
                                {loadingMore ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />

                                        {tc(
                                            'loading'
                                        )}
                                    </>
                                ) : (
                                    t(
                                        'loadMore'
                                    )
                                )}
                            </button>
                        </div>
                    )}
            </main>

            {/* =====================================
                PHOTO VIEWER
            ===================================== */}
            {selectedPhoto && (
                <PhotoModal
                    photo={
                        selectedPhoto
                    }
                    urls={
                        signedUrls[
                            selectedPhoto
                                .id
                            ]
                    }
                    isLoadingUrl={
                        loadingUrls[
                            selectedPhoto
                                .id
                            ]
                    }
                    isActionLoading={
                        actionLoading[
                            selectedPhoto
                                .id
                            ]
                    }
                    hasPrev={
                        modalIndex >
                        0
                    }
                    hasNext={
                        modalIndex <
                        photos.length -
                        1
                    }
                    onClose={
                        closeModal
                    }
                    onPrev={() =>
                        void goPrev()
                    }
                    onNext={() =>
                        void goNext()
                    }
                    onUpdate={
                        handleUpdate
                    }
                    onDelete={
                        handleDelete
                    }
                    onDownload={
                        handleDownload
                    }
                />
            )}

            {/* =====================================
                SHARE GALLERY
            ===================================== */}
            {shareOpen && (
                <ShareGalleryModal
                    shareUrl={
                        shareUrl
                    }
                    setShareUrl={
                        setShareUrl
                    }
                    onClose={
                        closeShareModal
                    }
                    galleryTokens={
                        galleryTokens
                    }
                    loadingTokens={
                        loadingTokens
                    }
                    showCreateForm={
                        showCreateForm
                    }
                    setShowCreateForm={
                        setShowCreateForm
                    }
                    galleryLabel={
                        galleryLabel
                    }
                    setGalleryLabel={
                        setGalleryLabel
                    }
                    photoFilter={
                        photoFilter
                    }
                    setPhotoFilter={
                        setPhotoFilter
                    }
                    showMessages={
                        showMessages
                    }
                    setShowMessages={
                        setShowMessages
                    }
                    expiresInDays={
                        expiresInDays
                    }
                    setExpiresInDays={
                        setExpiresInDays
                    }
                    shareLoading={
                        shareLoading
                    }
                    copied={
                        copied
                    }
                    onCopy={() =>
                        void handleCopy()
                    }
                    onCreate={() =>
                        void handleCreateGalleryLink()
                    }
                    onDeleteToken={(
                        id
                    ) =>
                        void handleDeleteToken(
                            id
                        )
                    }
                />
            )}
        </div>
    )
}

/*
 * ============================================
 * ZIP MENU
 * ============================================
 */
function ZipMenu({
                     zipLoading,
                     onDownload,
                     compact = false,
                 }: {
    zipLoading:
        | 'all'
        | 'favourites'
        | null
    onDownload: (
        filter:
            | 'all'
            | 'favourites'
    ) => Promise<void>
    compact?: boolean
}) {
    const t =
        useTranslations(
            'dashboard.photos'
        )

    const [
        open,
        setOpen,
    ] =
        useState(false)

    return (
        <div className="relative">
            <button
                type="button"
                disabled={
                    zipLoading !==
                    null
                }
                onClick={() =>
                    setOpen(
                        (
                            current
                        ) =>
                            !current
                    )
                }
                aria-label={t(
                    'downloadZip'
                )}
                className={cn(
                    compact
                        ? 'flex h-9 items-center gap-2 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50 sm:px-4'
                        : 'btn-secondary justify-center disabled:opacity-50'
                )}
            >
                {zipLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <ArchiveIcon
                        className="h-4 w-4"
                        strokeWidth={
                            1.6
                        }
                    />
                )}

                <span
                    className={cn(
                        compact
                            ? 'hidden lg:inline'
                            : 'hidden sm:inline'
                    )}
                >
                    {zipLoading
                        ? t(
                            'preparingZip'
                        )
                        : t(
                            'downloadZip'
                        )}
                </span>
            </button>

            {open && (
                <>
                    {/* Click-away layer */}
                    <button
                        type="button"
                        aria-label="Close download menu"
                        className="fixed inset-0 z-20 cursor-default"
                        onClick={() =>
                            setOpen(
                                false
                            )
                        }
                    />

                    <div className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-2xl border border-border/70 bg-card p-1.5 shadow-xl">
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(
                                    false
                                )

                                void onDownload(
                                    'all'
                                )
                            }}
                            disabled={
                                zipLoading !==
                                null
                            }
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs text-foreground transition-colors hover:bg-secondary"
                        >
                            <Download className="h-3.5 w-3.5 text-muted-foreground" />

                            {t(
                                'allPhotos'
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setOpen(
                                    false
                                )

                                void onDownload(
                                    'favourites'
                                )
                            }}
                            disabled={
                                zipLoading !==
                                null
                            }
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs text-foreground transition-colors hover:bg-secondary"
                        >
                            <Heart className="h-3.5 w-3.5 text-muted-foreground" />

                            {t(
                                'onlyFavourites'
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}

/*
 * ============================================
 * PHOTO CARD
 * ============================================
 */
function PhotoCard({
                       photo,
                       thumbnailUrl,
                       isLoadingUrl,
                       isActionLoading,
                       onOpen,
                       onUpdate,
                       onDelete,
                       onUrlNeeded,
                   }: {
    photo: Photo
    thumbnailUrl?: string
    isLoadingUrl?: boolean
    isActionLoading?: boolean
    onOpen: () => void
    onUpdate: (
        id: string,
        update: PhotoUpdate
    ) => void
    onDelete: (
        id: string
    ) => void
    onUrlNeeded: () => void
}) {
    const cardRef =
        useRef<HTMLDivElement>(
            null
        )

    /*
     * Load signed URLs as cards
     * approach the viewport.
     *
     * Important for mobile where
     * hover does not exist.
     */
    useEffect(() => {
        const element =
            cardRef.current

        if (
            !element ||
            thumbnailUrl
        ) {
            return
        }

        if (
            typeof IntersectionObserver ===
            'undefined'
        ) {
            onUrlNeeded()
            return
        }

        const observer =
            new IntersectionObserver(
                (
                    entries
                ) => {
                    if (
                        entries[0]
                            ?.isIntersecting
                    ) {
                        onUrlNeeded()

                        observer.disconnect()
                    }
                },
                {
                    rootMargin:
                        '300px',
                }
            )

        observer.observe(
            element
        )

        return () =>
            observer.disconnect()
    }, [
        thumbnailUrl,
        onUrlNeeded,
    ])

    return (
        <div
            ref={
                cardRef
            }
            className={cn(
                'group relative aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-muted',
                photo.hidden &&
                'opacity-50'
            )}
            onMouseEnter={
                onUrlNeeded
            }
        >
            {/* Photo */}
            {thumbnailUrl ? (
                <Image
                    src={
                        thumbnailUrl
                    }
                    alt={
                        photo.guest_name ??
                        'Wedding photo'
                    }
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                    className="cursor-pointer object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                    onClick={
                        onOpen
                    }
                />
            ) : (
                <button
                    type="button"
                    aria-label="Load photo"
                    onClick={
                        onUrlNeeded
                    }
                    className="absolute inset-0 w-full bg-muted"
                >
                    <div className="absolute inset-0 shimmer" />

                    {isLoadingUrl && (
                        <Loader2 className="absolute left-1/2 top-1/2 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                </button>
            )}

            {/* Open overlay */}
            {thumbnailUrl && (
                <button
                    type="button"
                    aria-label="Open photo"
                    onClick={
                        onOpen
                    }
                    className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 opacity-0 transition-opacity duration-300 sm:group-hover:opacity-100"
                />
            )}

            {/* Status */}
            <div className="pointer-events-none absolute left-3 top-3 flex gap-1.5">
                {photo.favourite && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white backdrop-blur-md">
                        <Heart className="h-3.5 w-3.5 fill-current" />
                    </div>
                )}

                {photo.hidden && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white backdrop-blur-md">
                        <EyeOff className="h-3.5 w-3.5" />
                    </div>
                )}

                {!photo.approved && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white backdrop-blur-md">
                        <XCircle className="h-3.5 w-3.5" />
                    </div>
                )}
            </div>

            {/* Quick actions */}
            <div className="absolute right-3 top-3 flex gap-1.5 opacity-100 transition-all duration-200 sm:-translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
                <QuickActionBtn
                    onClick={(
                        event
                    ) => {
                        event.stopPropagation()

                        onUpdate(
                            photo.id,
                            {
                                favourite:
                                    !photo.favourite,
                            }
                        )
                    }}
                    loading={
                        isActionLoading
                    }
                    active={
                        photo.favourite
                    }
                >
                    <Heart
                        className={cn(
                            'h-3.5 w-3.5',
                            photo.favourite &&
                            'fill-current'
                        )}
                    />
                </QuickActionBtn>

                <QuickActionBtn
                    onClick={(
                        event
                    ) => {
                        event.stopPropagation()

                        onUpdate(
                            photo.id,
                            {
                                hidden:
                                    !photo.hidden,
                            }
                        )
                    }}
                    loading={
                        isActionLoading
                    }
                >
                    {photo.hidden ? (
                        <Eye className="h-3.5 w-3.5" />
                    ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                    )}
                </QuickActionBtn>

                <QuickActionBtn
                    onClick={(
                        event
                    ) => {
                        event.stopPropagation()

                        onDelete(
                            photo.id
                        )
                    }}
                    loading={
                        isActionLoading
                    }
                    danger
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </QuickActionBtn>
            </div>

            {/* Guest name */}
            {photo.guest_name && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4 opacity-100 transition-all duration-300 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
                    <p className="truncate text-left text-xs font-medium text-white drop-shadow">
                        {
                            photo.guest_name
                        }
                    </p>
                </div>
            )}
        </div>
    )
}

/*
 * ============================================
 * QUICK PHOTO ACTION
 * ============================================
 */
function QuickActionBtn({
                            children,
                            onClick,
                            loading,
                            active,
                            danger,
                        }: {
    children: ReactNode
    onClick: (
        event: MouseEvent<HTMLButtonElement>
    ) => void
    loading?: boolean
    active?: boolean
    danger?: boolean
}) {
    return (
        <button
            type="button"
            onClick={
                onClick
            }
            disabled={
                loading
            }
            className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white backdrop-blur-md transition-colors disabled:opacity-50',
                active &&
                'bg-white text-black hover:bg-white/90',
                !active &&
                !danger &&
                'hover:bg-white/20',
                danger &&
                'hover:bg-destructive/80 hover:text-white'
            )}
        >
            {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
                children
            )}
        </button>
    )
}

/*
 * ============================================
 * PHOTO VIEWER
 * ============================================
 */
function PhotoModal({
                        photo,
                        urls,
                        isLoadingUrl,
                        isActionLoading,
                        hasPrev,
                        hasNext,
                        onClose,
                        onPrev,
                        onNext,
                        onUpdate,
                        onDelete,
                        onDownload,
                    }: {
    photo: Photo
    urls?: {
        thumb: string
        original: string
    }
    isLoadingUrl?: boolean
    isActionLoading?: boolean
    hasPrev: boolean
    hasNext: boolean
    onClose: () => void
    onPrev: () => void
    onNext: () => void
    onUpdate: (
        id: string,
        update: PhotoUpdate
    ) => void
    onDelete: (
        id: string
    ) => void
    onDownload: (
        photo: Photo
    ) => void
}) {
    const t =
        useTranslations(
            'dashboard.photos'
        )

    const locale =
        useLocale()

    /*
     * Keyboard navigation
     */
    useEffect(() => {
        const handleKeyDown =
            (
                event: KeyboardEvent
            ) => {
                if (
                    event.key ===
                    'Escape'
                ) {
                    onClose()
                }

                if (
                    event.key ===
                    'ArrowLeft' &&
                    hasPrev
                ) {
                    onPrev()
                }

                if (
                    event.key ===
                    'ArrowRight' &&
                    hasNext
                ) {
                    onNext()
                }
            }

        window.addEventListener(
            'keydown',
            handleKeyDown
        )

        const previousOverflow =
            document.body.style
                .overflow

        document.body.style.overflow =
            'hidden'

        return () => {
            window.removeEventListener(
                'keydown',
                handleKeyDown
            )

            document.body.style.overflow =
                previousOverflow
        }
    }, [
        hasPrev,
        hasNext,
        onClose,
        onPrev,
        onNext,
    ])

    return (
        <div
            className="fixed inset-0 z-50 flex bg-[#090909] text-white"
            onClick={
                onClose
            }
        >
            {/* Main viewer */}
            <div
                className="relative min-w-0 flex-1"
                onClick={(
                    event
                ) =>
                    event.stopPropagation()
                }
            >
                {/* Ambient */}
                {urls?.original && (
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 opacity-20"
                    >
                        <Image
                            src={
                                urls.original
                            }
                            alt=""
                            fill
                            sizes="100vw"
                            className="scale-110 object-cover blur-[90px]"
                        />

                        <div className="absolute inset-0 bg-black/50" />
                    </div>
                )}

                {/* Top controls */}
                <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 sm:p-6">
                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        aria-label="Close"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/25 text-white backdrop-blur-md transition-colors hover:bg-white/15 lg:hidden"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            onDownload(
                                photo
                            )
                        }
                        aria-label={t(
                            'download'
                        )}
                        className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/25 text-white backdrop-blur-md transition-colors hover:bg-white/15"
                    >
                        <Download className="h-4 w-4" />
                    </button>
                </div>

                {/* Image */}
                <div className="relative flex h-full min-h-screen items-center justify-center px-3 pb-[310px] pt-16 lg:min-h-0 lg:pb-3 lg:pr-3 lg:pt-3">
                    {urls?.original ? (
                        <Image
                            key={
                                photo.id
                            }
                            src={
                                urls.original
                            }
                            alt={
                                photo.guest_name ??
                                'Wedding photo'
                            }
                            fill
                            priority
                            sizes="(max-width: 1024px) 100vw, 75vw"
                            className="object-contain px-3 py-16 lg:py-8"
                        />
                    ) : isLoadingUrl ? (
                        <Loader2 className="h-6 w-6 animate-spin text-white/50" />
                    ) : (
                        <div className="h-52 w-52 rounded-3xl bg-white/5" />
                    )}

                    {hasPrev && (
                        <button
                            type="button"
                            onClick={
                                onPrev
                            }
                            aria-label="Previous photo"
                            className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/25 text-white backdrop-blur-md transition-colors hover:bg-white/15 sm:left-6"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                    )}

                    {hasNext && (
                        <button
                            type="button"
                            onClick={
                                onNext
                            }
                            aria-label="Next photo"
                            className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/25 text-white backdrop-blur-md transition-colors hover:bg-white/15 lg:right-6"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Details */}
            <aside
                className="fixed inset-x-0 bottom-0 z-30 max-h-[48vh] overflow-y-auto rounded-t-[2rem] border-t border-border/70 bg-card p-6 text-foreground shadow-2xl lg:static lg:max-h-none lg:w-[340px] lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:p-7"
                onClick={(
                    event
                ) =>
                    event.stopPropagation()
                }
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="truncate font-serif text-2xl font-light tracking-tight">
                            {photo.guest_name ??
                                t(
                                    'anonymousGuest'
                                )}
                        </h2>

                        <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(
                                photo.created_at,
                                locale
                            )}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        aria-label="Close"
                        className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:flex"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Message */}
                {photo.message && (
                    <div className="mt-6 rounded-2xl border border-border/60 bg-secondary/35 p-4">
                        <p className="text-sm leading-6 text-foreground/80">
                            {
                                photo.message
                            }
                        </p>
                    </div>
                )}

                {/* Status */}
                {(photo.favourite ||
                    photo.hidden ||
                    !photo.approved) && (
                    <div className="mt-5 flex flex-wrap gap-2">
                        {photo.favourite && (
                            <StatusBadge
                                icon={
                                    <Heart className="h-3 w-3 fill-current" />
                                }
                                label={t(
                                    'favourites'
                                )}
                            />
                        )}

                        {photo.hidden && (
                            <StatusBadge
                                icon={
                                    <EyeOff className="h-3 w-3" />
                                }
                                label={t(
                                    'hidden'
                                )}
                            />
                        )}

                        {!photo.approved && (
                            <StatusBadge
                                icon={
                                    <XCircle className="h-3 w-3" />
                                }
                                label={t(
                                    'unapproved'
                                )}
                            />
                        )}
                    </div>
                )}

                <div className="my-6 h-px bg-border/60" />

                {/* Actions */}
                <div className="space-y-1">
                    <ActionButton
                        onClick={() =>
                            onUpdate(
                                photo.id,
                                {
                                    favourite:
                                        !photo.favourite,
                                }
                            )
                        }
                        loading={
                            isActionLoading
                        }
                        active={
                            photo.favourite
                        }
                        icon={
                            <Heart
                                className={cn(
                                    'h-4 w-4',
                                    photo.favourite &&
                                    'fill-current'
                                )}
                            />
                        }
                        label={
                            photo.favourite
                                ? t(
                                    'unfavourite'
                                )
                                : t(
                                    'favourite'
                                )
                        }
                    />

                    <ActionButton
                        onClick={() =>
                            onUpdate(
                                photo.id,
                                {
                                    hidden:
                                        !photo.hidden,
                                }
                            )
                        }
                        loading={
                            isActionLoading
                        }
                        active={
                            photo.hidden
                        }
                        icon={
                            photo.hidden ? (
                                <Eye className="h-4 w-4" />
                            ) : (
                                <EyeOff className="h-4 w-4" />
                            )
                        }
                        label={
                            photo.hidden
                                ? t(
                                    'show'
                                )
                                : t(
                                    'hide'
                                )
                        }
                    />

                    <ActionButton
                        onClick={() =>
                            onUpdate(
                                photo.id,
                                {
                                    approved:
                                        !photo.approved,
                                }
                            )
                        }
                        loading={
                            isActionLoading
                        }
                        active={
                            !photo.approved
                        }
                        icon={
                            photo.approved ? (
                                <XCircle className="h-4 w-4" />
                            ) : (
                                <CheckCircle className="h-4 w-4" />
                            )
                        }
                        label={
                            photo.approved
                                ? t(
                                    'unapprove'
                                )
                                : t(
                                    'approve'
                                )
                        }
                    />

                    <ActionButton
                        onClick={() =>
                            onDownload(
                                photo
                            )
                        }
                        icon={
                            <Download className="h-4 w-4" />
                        }
                        label={t(
                            'download'
                        )}
                    />

                    <ActionButton
                        onClick={() =>
                            onDelete(
                                photo.id
                            )
                        }
                        loading={
                            isActionLoading
                        }
                        icon={
                            <Trash2 className="h-4 w-4" />
                        }
                        label={t(
                            'deletePermanently'
                        )}
                        danger
                    />
                </div>

                {/* Metadata */}
                <div className="mt-6 border-t border-border/60 pt-5">
                    <div className="space-y-1 text-[10px] text-muted-foreground">
                        {photo.width &&
                            photo.height && (
                                <p>
                                    {
                                        photo.width
                                    }{' '}
                                    ×{' '}
                                    {
                                        photo.height
                                    }{' '}
                                    px
                                </p>
                            )}

                        {photo.file_size !=
                            null && (
                                <p>
                                    {(
                                        photo.file_size /
                                        1024
                                    ).toFixed(
                                        0
                                    )}{' '}
                                    KB
                                </p>
                            )}
                    </div>
                </div>
            </aside>
        </div>
    )
}

/*
 * ============================================
 * STATUS BADGE
 * ============================================
 */
function StatusBadge({
                         icon,
                         label,
                     }: {
    icon: ReactNode
    label: string
}) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            {icon}

            {label}
        </span>
    )
}

/*
 * ============================================
 * PHOTO ACTION
 * ============================================
 */
function ActionButton({
                          onClick,
                          loading,
                          icon,
                          label,
                          danger,
                          active,
                      }: {
    onClick: () => void
    loading?: boolean
    icon: ReactNode
    label: string
    danger?: boolean
    active?: boolean
}) {
    return (
        <button
            type="button"
            onClick={
                onClick
            }
            disabled={
                loading
            }
            className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors disabled:opacity-50',
                danger
                    ? 'text-destructive hover:bg-destructive/[0.07]'
                    : active
                        ? 'bg-secondary text-foreground'
                        : 'text-foreground hover:bg-secondary'
            )}
        >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center">
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    icon
                )}
            </span>

            {label}
        </button>
    )
}

/*
 * ============================================
 * SHARE GALLERY
 * ============================================
 */
function ShareGalleryModal({
                               shareUrl,
                               setShareUrl,
                               onClose,
                               galleryTokens,
                               loadingTokens,
                               showCreateForm,
                               setShowCreateForm,
                               galleryLabel,
                               setGalleryLabel,
                               photoFilter,
                               setPhotoFilter,
                               showMessages,
                               setShowMessages,
                               expiresInDays,
                               setExpiresInDays,
                               shareLoading,
                               copied,
                               onCopy,
                               onCreate,
                               onDeleteToken,
                           }: {
    shareUrl: string | null
    setShareUrl: (
        value:
            | string
            | null
    ) => void
    onClose: () => void
    galleryTokens: GalleryToken[]
    loadingTokens: boolean
    showCreateForm: boolean
    setShowCreateForm: (
        value: boolean
    ) => void
    galleryLabel: string
    setGalleryLabel: (
        value: string
    ) => void
    photoFilter: PhotoFilter
    setPhotoFilter: (
        value: PhotoFilter
    ) => void
    showMessages: boolean
    setShowMessages: (
        value: boolean
    ) => void
    expiresInDays: string
    setExpiresInDays: (
        value: string
    ) => void
    shareLoading: boolean
    copied: boolean
    onCopy: () => void
    onCreate: () => void
    onDeleteToken: (
        id: string
    ) => void
}) {
    const t =
        useTranslations(
            'dashboard.photos'
        )

    useEffect(() => {
        const previousOverflow =
            document.body.style
                .overflow

        document.body.style.overflow =
            'hidden'

        const handleKeyDown =
            (
                event: KeyboardEvent
            ) => {
                if (
                    event.key ===
                    'Escape'
                ) {
                    onClose()
                }
            }

        window.addEventListener(
            'keydown',
            handleKeyDown
        )

        return () => {
            document.body.style.overflow =
                previousOverflow

            window.removeEventListener(
                'keydown',
                handleKeyDown
            )
        }
    }, [onClose])

    const useGalleryToken =
        (
            token: string
        ) => {
            const url =
                `${window.location.origin}/gallery/${token}`

            setShareUrl(
                url
            )
        }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-md sm:items-center sm:p-6"
            onClick={
                onClose
            }
        >
            <div
                role="dialog"
                aria-modal="true"
                className="w-full max-w-md overflow-hidden rounded-t-[2rem] border border-border/70 bg-card shadow-2xl sm:rounded-[2rem]"
                onClick={(
                    event
                ) =>
                    event.stopPropagation()
                }
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border/60 px-6 py-6">
                    <div className="pr-6">
                        <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
                            {t(
                                'shareGallery'
                            )}
                        </h2>

                        <p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">
                            {t(
                                'shareGalleryDescription'
                            )}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        aria-label="Close"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="max-h-[72vh] overflow-y-auto p-6">
                    {!shareUrl ? (
                        <>
                            {!showCreateForm ? (
                                <div className="space-y-5">
                                    {/* Existing links */}
                                    {loadingTokens ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : galleryTokens.length ===
                                    0 ? (
                                        <div className="py-8 text-center">
                                            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
                                                <LinkIcon
                                                    className="h-4 w-4 text-muted-foreground"
                                                    strokeWidth={
                                                        1.5
                                                    }
                                                />
                                            </div>

                                            <p className="text-sm text-muted-foreground">
                                                {t(
                                                    'noGalleryLinks'
                                                )}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {galleryTokens.map(
                                                (
                                                    token
                                                ) => (
                                                    <div
                                                        key={
                                                            token.id
                                                        }
                                                        className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background p-3.5"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium text-foreground">
                                                                {token.label ??
                                                                    'Wedding Gallery'}
                                                            </p>

                                                            <p className="mt-1 truncate text-[10px] text-muted-foreground">
                                                                {token.expires_at
                                                                    ? t(
                                                                        'expires',
                                                                        {
                                                                            date: formatDate(
                                                                                token.expires_at
                                                                            ),
                                                                        }
                                                                    )
                                                                    : t(
                                                                        'neverExpires'
                                                                    )}

                                                                {token.photo_filter ===
                                                                    'favourites' &&
                                                                    ` · ${t(
                                                                        'favouritesOnly'
                                                                    )}`}
                                                            </p>
                                                        </div>

                                                        <div className="flex shrink-0 gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    useGalleryToken(
                                                                        token.token
                                                                    )
                                                                }
                                                                aria-label={t(
                                                                    'copyLink'
                                                                )}
                                                                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                                            >
                                                                <Copy className="h-3.5 w-3.5" />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    onDeleteToken(
                                                                        token.id
                                                                    )
                                                                }
                                                                aria-label="Delete"
                                                                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/[0.08] hover:text-destructive"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowCreateForm(
                                                true
                                            )
                                        }
                                        className="btn-primary w-full justify-center"
                                    >
                                        <LinkIcon className="h-4 w-4" />

                                        {t(
                                            'createNewGalleryLink'
                                        )}
                                    </button>
                                </div>
                            ) : (
                                /*
                                 * CREATE LINK
                                 */
                                <div className="space-y-5">
                                    {/* Name */}
                                    <div>
                                        <label
                                            htmlFor="gallery-label"
                                            className="label-wedding"
                                        >
                                            {t(
                                                'linkName'
                                            )}
                                        </label>

                                        <input
                                            id="gallery-label"
                                            type="text"
                                            value={
                                                galleryLabel
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setGalleryLabel(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder={t(
                                                'linkNamePlaceholder'
                                            )}
                                            className="input-wedding"
                                            maxLength={
                                                60
                                            }
                                        />
                                    </div>

                                    {/* Photos */}
                                    <div>
                                        <label className="label-wedding">
                                            {t(
                                                'whichPhotos'
                                            )}
                                        </label>

                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPhotoFilter(
                                                        'all'
                                                    )
                                                }
                                                className={cn(
                                                    'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-medium transition-all',
                                                    photoFilter ===
                                                    'all'
                                                        ? 'border-foreground bg-foreground text-background'
                                                        : 'border-border/70 bg-background text-muted-foreground hover:text-foreground'
                                                )}
                                            >
                                                <Images className="h-4 w-4" />

                                                {t(
                                                    'allPhotos'
                                                )}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPhotoFilter(
                                                        'favourites'
                                                    )
                                                }
                                                className={cn(
                                                    'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-medium transition-all',
                                                    photoFilter ===
                                                    'favourites'
                                                        ? 'border-foreground bg-foreground text-background'
                                                        : 'border-border/70 bg-background text-muted-foreground hover:text-foreground'
                                                )}
                                            >
                                                <Heart className="h-4 w-4" />

                                                {t(
                                                    'onlyFavourites'
                                                )}
                                            </button>
                                        </div>

                                        <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                                            {t(
                                                'filterNote'
                                            )}
                                        </p>
                                    </div>

                                    {/* Messages */}
                                    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border/60 bg-secondary/30 p-4">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {t(
                                                    'showMessagesTitle'
                                                )}
                                            </p>

                                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                {t(
                                                    'showMessagesDescription'
                                                )}
                                            </p>
                                        </div>

                                        <input
                                            type="checkbox"
                                            checked={
                                                showMessages
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setShowMessages(
                                                    event
                                                        .target
                                                        .checked
                                                )
                                            }
                                            className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                                        />
                                    </label>

                                    {/* Expiration */}
                                    <div>
                                        <label
                                            htmlFor="gallery-expiration"
                                            className="label-wedding"
                                        >
                                            {t(
                                                'linkExpiresAfter'
                                            )}
                                        </label>

                                        <select
                                            id="gallery-expiration"
                                            value={
                                                expiresInDays
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setExpiresInDays(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            className="input-wedding"
                                        >
                                            <option value="">
                                                {t(
                                                    'never'
                                                )}
                                            </option>

                                            <option value="7">
                                                {t(
                                                    'days7'
                                                )}
                                            </option>

                                            <option value="30">
                                                {t(
                                                    'days30'
                                                )}
                                            </option>

                                            <option value="90">
                                                {t(
                                                    'days90'
                                                )}
                                            </option>

                                            <option value="365">
                                                {t(
                                                    'year1'
                                                )}
                                            </option>
                                        </select>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={
                                            onCreate
                                        }
                                        disabled={
                                            shareLoading
                                        }
                                        className="btn-primary w-full justify-center"
                                    >
                                        {shareLoading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />

                                                {t(
                                                    'creatingLink'
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <LinkIcon className="h-4 w-4" />

                                                {t(
                                                    'createLink'
                                                )}
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowCreateForm(
                                                false
                                            )
                                        }
                                        className="w-full text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        {t(
                                            'backToGalleryList'
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        /*
                         * LINK READY
                         */
                        <div className="space-y-5">
                            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
                                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                    {t(
                                        'galleryLink'
                                    )}
                                </p>

                                <p className="mt-2 break-all font-mono text-xs leading-5 text-foreground">
                                    {
                                        shareUrl
                                    }
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={
                                        onCopy
                                    }
                                    className={cn(
                                        'btn-primary flex-1 justify-center',
                                        copied &&
                                        'bg-foreground text-background hover:opacity-90'
                                    )}
                                >
                                    {copied ? (
                                        <>
                                            <Check className="h-4 w-4" />

                                            {t(
                                                'linkCopied'
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4" />

                                            {t(
                                                'copyLink'
                                            )}
                                        </>
                                    )}
                                </button>

                                <a
                                    href={
                                        shareUrl
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Open gallery"
                                    className="btn-secondary px-4"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setShareUrl(
                                        null
                                    )

                                    setShowCreateForm(
                                        false
                                    )
                                }}
                                className="w-full text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                                {t(
                                    'backToGalleryLinks'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}