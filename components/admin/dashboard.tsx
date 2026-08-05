'use client'

import {useCallback, useEffect, useState, useTransition} from 'react'
import Image from 'next/image'
import {useRouter} from 'next/navigation'
import {
  ArchiveIcon,
  Armchair,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
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
import Link from 'next/link'
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
import {cn, formatDate, invertUpdate} from '@/lib/utils'
import {ThemeToggle} from "@/components/theme-toggle";
import {Photo} from "@/types/database";

interface AdminDashboardProps {
    initialPhotos: Photo[]
    initialTotal: number
    adminEmail: string
    weddingId: string
    role: 'admin' | 'couple'
    error?: string
    activeFilter?: string
}

const FILTERS = [
    {key: undefined, label: 'Të gjitha fotot'},
    {key: 'favourites', label: 'Të preferuarat'},
    {key: 'hidden', label: 'Të fshehura'},
    {key: 'unapproved', label: 'Të paaprovuara'},
]

const PAGE_SIZE = 50

export function AdminDashboard({
                                   initialPhotos,
                                   initialTotal,
                                   adminEmail,
                                   weddingId,
                                   role,
                                   error: initialError,
                                   activeFilter,
                               }: AdminDashboardProps) {
    const router = useRouter()
    const [, startTransition] = useTransition()
    const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
    const [total, setTotal] = useState(initialTotal)
    const [error, setError] = useState(initialError)
    const [loadingMore, setLoadingMore] = useState(false)
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
    const [signedUrls, setSignedUrls] = useState<Record<string, { thumb: string; original: string }>>({})
    const [loadingUrls, setLoadingUrls] = useState<Record<string, boolean>>({})
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

    // ZIP state
    const [zipLoading, setZipLoading] = useState<'all' | 'favourites' | null>(null)

    // Gallery share state
    const [shareOpen, setShareOpen] = useState(false)
    const [shareLoading, setShareLoading] = useState(false)
    const [shareUrl, setShareUrl] = useState<string | null>(null)
    const [galleryTokens, setGalleryTokens] = useState<
        Array<{
            id: string;
            token: string;
            label: string | null;
            expires_at: string | null;
            created_at: string;
            photo_filter: string;
        }>
    >([]);
    const [loadingTokens, setLoadingTokens] = useState(false)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [copied, setCopied] = useState(false)
    const [showMessages, setShowMessages] = useState(true)
    const [expiresInDays, setExpiresInDays] = useState<string>('')
    const [photoFilter, setPhotoFilter] = useState<'all' | 'favourites'>('all')
    const [galleryLabel, setGalleryLabel] = useState('Wedding Gallery')

    useEffect(() => {
        setPhotos(initialPhotos)
        setTotal(initialTotal)
    }, [activeFilter]) // eslint-disable-line react-hooks/exhaustive-deps

    const getSignedUrls = useCallback(async (photo: Photo) => {
        if (signedUrls[photo.id]) return signedUrls[photo.id]
        setLoadingUrls((prev) => ({...prev, [photo.id]: true}))
        try {
            const [thumbResult, originalResult] = await Promise.all([
                getSignedUrlAction(photo.thumbnail_path, 'thumbnails'),
                getSignedUrlAction(photo.original_path, 'photos'),
            ])
            if (thumbResult.url && originalResult.url) {
                const urls = {thumb: thumbResult.url, original: originalResult.url}
                setSignedUrls((prev) => ({...prev, [photo.id]: urls}))
                return urls
            }
        } finally {
            setLoadingUrls((prev) => ({...prev, [photo.id]: false}))
        }
        return null
    }, [signedUrls])

    const openModal = async (photo: Photo) => {
        setSelectedPhoto(photo)
        await getSignedUrls(photo)
    }

    const closeModal = () => setSelectedPhoto(null)

    const handleUpdate = async (
        id: string,
        update: { approved?: boolean; hidden?: boolean; favourite?: boolean }
    ) => {
        setActionLoading((prev) => ({...prev, [id]: true}))

        setPhotos((prev) => prev.map((p) => (p.id === id ? {...p, ...update} : p)))
        if (selectedPhoto?.id === id) {
            setSelectedPhoto((prev) => (prev ? {...prev, ...update} : null))
        }

        try {
            const result = await updatePhotoAction(id, update)
            if (!result.success) {
                // revert on failure
                setPhotos((prev) =>
                    prev.map((p) => (p.id === id ? {...p, ...invertUpdate(p, update)} : p))
                )
            }
            startTransition(() => router.refresh())
        } finally {
            setActionLoading((prev) => ({...prev, [id]: false}))
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this photo permanently?')) return
        setActionLoading((prev) => ({...prev, [id]: true}))
        try {
            const result = await deletePhotoAction(id, weddingId)
            if (result.success) {
                setPhotos((prev) => prev.filter((p) => p.id !== id))
                setTotal((prev) => prev - 1)
            }
            if (selectedPhoto?.id === id) closeModal()
            startTransition(() => router.refresh())
        } finally {
            setActionLoading((prev) => ({...prev, [id]: false}))
        }
    }


    const handleDownload = async (photo: Photo) => {
        const urls = await getSignedUrls(photo)
        if (!urls) return
        const a = document.createElement('a')
        a.href = urls.original
        a.download = `wedding-photo-${photo.id.slice(0, 8)}.webp`
        a.click()
    }

    // ── ZIP DOWNLOAD ──
    const handleZipDownload = async (filter: 'all' | 'favourites') => {
        setZipLoading(filter)
        try {
            const url = `/api/admin/zip?weddingId=${weddingId}${filter === 'favourites' ? '&filter=favourites' : ''}`
            const res = await fetch(url)
            if (!res.ok) {
                alert('Failed to generate ZIP. Please try again.')
                return
            }
            const blob = await res.blob()
            const date = new Date().toISOString().slice(0, 10)
            const objectUrl = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = objectUrl
            a.download = `wedding-photos-${filter}-${date}.zip`
            a.click()
            URL.revokeObjectURL(objectUrl)
        } finally {
            setZipLoading(null)
        }
    }

    const handleLoadMore = async () => {
        if (loadingMore || photos.length >= total) return
        setLoadingMore(true)
        try {
            const filters =
                activeFilter === 'favourites'
                    ? {favourite: true}
                    : activeFilter === 'hidden'
                        ? {hidden: true}
                        : activeFilter === 'unapproved'
                            ? {approved: false}
                            : undefined

            const result = await getPhotosAction(weddingId, filters, PAGE_SIZE, photos.length)
            if (result.photos) {
                setPhotos((prev) => [...prev, ...result.photos])
                if (result.total !== undefined) setTotal(result.total)
            }
        } catch (err) {
            console.error('Load more error:', err)
        } finally {
            setLoadingMore(false)
        }
    }

    // ── GALLERY SHARE ──
    const handleCreateGalleryLink = async () => {
        setShareLoading(true)
        const result = await createGalleryTokenAction({
            showMessages,
            expiresInDays: expiresInDays ? parseInt(expiresInDays, 10) : undefined,
            label: galleryLabel || 'Wedding Gallery',
            photoFilter,
        })
        setShareLoading(false)
        if (result.url) {
            setShareUrl(result.url)
            loadGalleryTokens()
        } else {
            alert(result.error ?? 'Failed to create link')
        }
    }

    const handleCopy = async () => {
        if (!shareUrl) return
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const loadGalleryTokens = useCallback(async () => {
        setLoadingTokens(true)
        const result = await listGalleryTokensAction();
        setGalleryTokens(result.tokens)
        setLoadingTokens(false)
    }, [])

    const openShareModal = () => {
        setShareOpen(true)
        setShowCreateForm(false)
        loadGalleryTokens()
    }

    const handleDeleteToken = async (id: string) => {
        if (!confirm('Delete this gallery link? It will stop working immediately.')) return
        await deleteGalleryTokenAction(id)
        loadGalleryTokens()
    }

    const handleFilterChange = (filter?: string) => {
        const base = role === 'admin'
            ? `/admin/weddings/${weddingId}/photos`
            : `/couple/weddings/${weddingId}/photos`
        const url = filter ? `${base}?filter=${filter}` : base
        router.push(url)
    }

    const modalIndex = photos.findIndex((p) => p.id === selectedPhoto?.id)
    const goPrev = async () => {
        if (modalIndex > 0) await openModal(photos[modalIndex - 1])
    }
    const goNext = async () => {
        if (modalIndex < photos.length - 1) await openModal(photos[modalIndex + 1])
    }

    return (
        <div className="min-h-screen bg-background">
            {/* ── HEADER ── */}
            <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div>
                        <h1 className="font-serif text-xl font-light text-[hsl(var(--dark))]">Fotot e Dasmës</h1>
                        <p className="font-sans text-xs text-muted-foreground hidden sm:block">{adminEmail}</p>
                    </div>
                    <div className="flex items-center gap-2">
            <span className="font-sans text-sm text-muted-foreground hidden sm:block">
              {photos.length} foto
            </span>

                        <ThemeToggle/>

                        {/* Seating button */}
                        {role === 'admin' && (
                            <Link
                                href={`/admin/weddings/${weddingId}`}
                                className="btn-ghost text-xs py-2 px-3 sm:px-4"
                            >
                                <Armchair className="w-3.5 h-3.5"/>
                                <span className="hidden sm:inline">Sistemimi</span>
                            </Link>
                        )}

                        {role === 'couple' && (
                            <Link
                                href={`/couple/weddings/${weddingId}/seating`}
                                className="btn-ghost text-xs py-2 px-3 sm:px-4"
                            >
                                <Armchair className="w-3.5 h-3.5"/>
                                <span className="hidden sm:inline">Sistemimi</span>
                            </Link>
                        )}

                        {/* Share Gallery button */}
                        <button
                            onClick={openShareModal}
                            className="btn-ghost text-xs py-2 px-3 sm:px-4"
                        >
                            <Share2 className="w-3.5 h-3.5"/>
                            <span className="hidden sm:inline">Shpërndaj Galerinë</span>
                        </button>

                        {/* ZIP dropdown */}
                        <div className="relative group">
                            <button
                                disabled={zipLoading !== null}
                                className="btn-ghost text-xs py-2 px-3 sm:px-4"
                            >
                                {zipLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                                ) : (
                                    <ArchiveIcon className="w-3.5 h-3.5"/>
                                )}
                                <span className="hidden sm:inline">
                  {zipLoading ? 'Duke u përgatitur…' : 'Shkarko ZIP'}
                </span>
                            </button>
                            {/* Dropdown */}
                            <div
                                className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-10">
                                <button
                                    onClick={() => handleZipDownload('all')}
                                    disabled={zipLoading !== null}
                                    className="w-full text-left px-4 py-2.5 font-sans text-sm hover:bg-muted transition-colors flex items-center gap-2"
                                >
                                    <Download className="w-3.5 h-3.5 text-muted-foreground"/>
                                    Të gjitha fotot
                                </button>
                                <button
                                    onClick={() => handleZipDownload('favourites')}
                                    disabled={zipLoading !== null}
                                    className="w-full text-left px-4 py-2.5 font-sans text-sm hover:bg-muted transition-colors flex items-center gap-2"
                                >
                                    <Heart className="w-3.5 h-3.5 text-muted-foreground"/>
                                    Vetëm të preferuarat
                                </button>
                            </div>
                        </div>

                        <button onClick={async () => await signOutAction()} className="btn-ghost text-xs py-2 px-3">
                            <LogOut className="w-3.5 h-3.5"/>
                            <span className="hidden sm:inline">Çkyçu</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Filters */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                    <Filter className="w-4 h-4 text-muted-foreground shrink-0"/>
                    {FILTERS.map(({key, label}) => (
                        <button
                            key={label}
                            onClick={() => handleFilterChange(key)}
                            className={cn(
                                'shrink-0 px-4 py-1.5 rounded-full font-sans text-xs font-medium transition-colors',
                                (activeFilter === key || (!activeFilter && !key))
                                    ? 'bg-[hsl(var(--primary))] text-white'
                                    : 'bg-secondary text-secondary-foreground hover:bg-muted'
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 mb-6">
                        <p className="text-sm text-destructive font-sans">{error}</p>
                    </div>
                )}

                {photos.length === 0 && (
                    <div className="text-center py-24">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                            <Images className="w-8 h-8 text-muted-foreground" strokeWidth={1.5}/>
                        </div>
                        <h2 className="font-serif text-2xl font-light text-muted-foreground">Ende nuk ka foto</h2>
                        <p className="font-sans text-sm text-muted-foreground mt-2">
                            {activeFilter ? 'Asnjë foto nuk përputhet me këtë filtër.' : 'Fotot do të shfaqen këtu pasi të ftuarit t\'i ngarkojnë ato.'}
                        </p>
                    </div>
                )}

                <div className="photo-grid">
                    {photos.map((photo) => (
                        <PhotoCard
                            key={photo.id}
                            photo={photo}
                            thumbnailUrl={signedUrls[photo.id]?.thumb}
                            isLoadingUrl={loadingUrls[photo.id]}
                            isActionLoading={actionLoading[photo.id]}
                            onOpen={() => openModal(photo)}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            onUrlNeeded={() => getSignedUrls(photo)}
                        />
                    ))}
                </div>

                {photos.length < total && (
                    <div className="mt-12 flex justify-center">
                        <button
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="btn-primary min-w-[200px]"
                        >
                            {loadingMore ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2"/>
                                    Duke u ngarkuar...
                                </>
                            ) : (
                                'Ngarko më shumë'
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Photo modal */}
            {selectedPhoto && (
                <PhotoModal
                    photo={selectedPhoto}
                    urls={signedUrls[selectedPhoto.id]}
                    isLoadingUrl={loadingUrls[selectedPhoto.id]}
                    isActionLoading={actionLoading[selectedPhoto.id]}
                    hasPrev={modalIndex > 0}
                    hasNext={modalIndex < photos.length - 1}
                    onClose={closeModal}
                    onPrev={goPrev}
                    onNext={goNext}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onDownload={handleDownload}
                />
            )}

            {/* ── SHARE GALLERY MODAL ── */}
            {shareOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={() => setShareOpen(false)}
                >
                    <div
                        className="w-full max-w-md bg-card rounded-2xl shadow-2xl p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="font-serif text-2xl font-light text-[hsl(var(--dark))]">Share
                                    Gallery</h2>
                                <p className="font-sans text-xs text-muted-foreground mt-0.5">
                                    Create a shareable link for guests
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShareOpen(false);
                                    setShareUrl(null)
                                }}
                                className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                            >
                                <X className="w-4 h-4"/>
                            </button>
                        </div>

                        {!shareUrl ? (
                            <div className="space-y-4">
                                {!showCreateForm ? (
                                    <>
                                        {loadingTokens ? (
                                            <div className="flex justify-center py-8">
                                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground"/>
                                            </div>
                                        ) : galleryTokens.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-6 font-sans">
                                                No gallery links yet.
                                            </p>
                                        ) : (
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {galleryTokens.map((t) => {
                                                    const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/gallery/${t.token}`;

                                                    return (
                                                        <div
                                                            key={t.id}
                                                            className="flex items-center justify-between p-3 rounded-xl border border-border"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="font-sans text-sm font-medium truncate">
                                                                    {t.label ?? "Wedding Gallery"}
                                                                </p>
                                                                <p className="font-sans text-xs text-muted-foreground">
                                                                    {t.expires_at ? `Expires ${formatDate(t.expires_at)}` : 'Never expires'}
                                                                    {t.photo_filter === 'favourites' && ' · Favourites only'}
                                                                </p>
                                                            </div>

                                                            <div className="flex gap-1 shrink-0">
                                                                <button
                                                                    onClick={() => setShareUrl(url)}
                                                                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                                                                >
                                                                    <Copy className="w-3.5 h-3.5"/>
                                                                </button>

                                                                <button
                                                                    onClick={() => handleDeleteToken(t.id)}
                                                                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5"/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setShowCreateForm(true)}
                                            className="btn-primary w-full justify-center"
                                        >
                                            <LinkIcon className="w-4 h-4"/>
                                            Create New Gallery Link
                                        </button>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="label-wedding">Link name</label>
                                            <input
                                                type="text"
                                                value={galleryLabel}
                                                onChange={(e) => setGalleryLabel(e.target.value)}
                                                placeholder="e.g. Ceremony, Reception, Family Only"
                                                className="input-wedding"
                                                maxLength={60}
                                            />
                                        </div>

                                        <div>
                                            <label className="label-wedding">Which photos?</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setPhotoFilter('all')}
                                                    className={cn(
                                                        'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-sans font-medium transition-colors',
                                                        photoFilter === 'all'
                                                            ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white'
                                                            : 'border-border hover:bg-muted'
                                                    )}
                                                >
                                                    <Images className="w-4 h-4"/>
                                                    All photos
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setPhotoFilter('favourites')}
                                                    className={cn(
                                                        'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-sans font-medium transition-colors',
                                                        photoFilter === 'favourites'
                                                            ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white'
                                                            : 'border-border hover:bg-muted'
                                                    )}
                                                >
                                                    <Heart className="w-4 h-4"/>
                                                    Favourites only
                                                </button>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1.5 font-sans">
                                                Only approved photos guests agreed to share publicly are ever included —
                                                this just narrows within that set.
                                            </p>
                                        </div>

                                        <label
                                            className="flex items-center justify-between p-3 rounded-xl border border-border cursor-pointer hover:bg-muted transition-colors">
                                            <div>
                                                <p className="font-sans text-sm font-medium">Show guest messages</p>
                                                <p className="font-sans text-xs text-muted-foreground">Include names and
                                                    notes in gallery</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={showMessages}
                                                onChange={(e) => setShowMessages(e.target.checked)}
                                                className="w-4 h-4 accent-[hsl(var(--primary))]"
                                            />
                                        </label>

                                        <div>
                                            <label className="label-wedding">Link expires after</label>
                                            <select
                                                value={expiresInDays}
                                                onChange={(e) => setExpiresInDays(e.target.value)}
                                                className="input-wedding"
                                            >
                                                <option value="">Never</option>
                                                <option value="7">7 days</option>
                                                <option value="30">30 days</option>
                                                <option value="90">90 days</option>
                                                <option value="365">1 year</option>
                                            </select>
                                        </div>

                                        <button
                                            onClick={handleCreateGalleryLink}
                                            disabled={shareLoading}
                                            className="btn-primary w-full justify-center"
                                        >
                                            {shareLoading ? (
                                                <><Loader2 className="w-4 h-4 animate-spin"/>Creating link…</>
                                            ) : (
                                                <><LinkIcon className="w-4 h-4"/>Create Gallery Link</>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => setShowCreateForm(false)}
                                            className="w-full text-center font-sans text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            ← Back to gallery list
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div
                                    className="rounded-xl bg-[hsl(var(--accent))] border border-[hsl(var(--primary))]/20 p-4">
                                    <p className="font-sans text-xs text-muted-foreground mb-2">
                                        Gallery link
                                    </p>

                                    <p className="font-mono text-xs text-foreground break-all leading-relaxed">
                                        {shareUrl}
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCopy}
                                        className={cn(
                                            "flex-1 btn-primary justify-center transition-all",
                                            copied && "bg-green-600 hover:opacity-100"
                                        )}
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="w-4 h-4"/>
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4"/>
                                                Copy Link
                                            </>
                                        )}
                                    </button>

                                    <a
                                        href={shareUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-ghost px-4"
                                    >
                                        <ExternalLink className="w-4 h-4"/>
                                    </a>
                                </div>

                                <button
                                    onClick={() => {
                                        setShareUrl(null);
                                        setShowCreateForm(false);
                                    }}
                                    className="w-full text-center font-sans text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                                >
                                    Back to gallery links
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── PhotoCard (unchanged) ──
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
    onUpdate: (id: string, update: Partial<Photo>) => void
    onDelete: (id: string) => void
    onUrlNeeded: () => void
}) {
    return (
        <div
            className={cn(
                'group relative rounded-xl overflow-hidden bg-muted aspect-square cursor-pointer',
                photo.hidden && 'opacity-50',
                photo.favourite && 'ring-2 ring-[hsl(var(--primary))]'
            )}
            onMouseEnter={onUrlNeeded}
        >
            {thumbnailUrl ? (
                <Image
                    src={thumbnailUrl}
                    alt={photo.guest_name ?? 'Wedding photo'}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    onClick={onOpen}
                />
            ) : (
                <div className="w-full h-full shimmer" onClick={onUrlNeeded}/>
            )}

            <div
                className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200"
                onClick={onOpen}
            />

            <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <QuickActionBtn
                    onClick={(e) => {
                        e.stopPropagation();
                        onUpdate(photo.id, {favourite: !photo.favourite})
                    }}
                    loading={isActionLoading}
                    active={photo.favourite}
                    activeClass="text-red-400"
                >
                    <Heart className={cn('w-3.5 h-3.5', photo.favourite && 'fill-current')}/>
                </QuickActionBtn>
                <QuickActionBtn
                    onClick={(e) => {
                        e.stopPropagation();
                        onUpdate(photo.id, {hidden: !photo.hidden})
                    }}
                    loading={isActionLoading}
                >
                    {photo.hidden ? <Eye className="w-3.5 h-3.5"/> : <EyeOff className="w-3.5 h-3.5"/>}
                </QuickActionBtn>
                <QuickActionBtn
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(photo.id)
                    }}
                    loading={isActionLoading}
                    danger
                >
                    <Trash2 className="w-3.5 h-3.5"/>
                </QuickActionBtn>
            </div>

            {photo.guest_name && (
                <div
                    className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full font-sans truncate max-w-[80%]">
                    {photo.guest_name}
                </div>
            )}
        </div>
    )
}

function QuickActionBtn({
                            children,
                            onClick,
                            loading,
                            active,
                            activeClass,
                            danger,
                        }: {
    children: React.ReactNode
    onClick: (e: React.MouseEvent) => void
    loading?: boolean
    active?: boolean
    activeClass?: string
    danger?: boolean
}) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-white transition-colors',
                danger ? 'bg-black/60 hover:bg-red-500/80' : 'bg-black/60 hover:bg-black/80',
                active && activeClass
            )}
        >
            {loading ? <Loader2 className="w-3 h-3 animate-spin"/> : children}
        </button>
    )
}

// ── PhotoModal (unchanged) ──
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
    urls?: { thumb: string; original: string }
    isLoadingUrl?: boolean
    isActionLoading?: boolean
    hasPrev: boolean
    hasNext: boolean
    onClose: () => void
    onPrev: () => void
    onNext: () => void
    onUpdate: (id: string, update: Partial<Photo>) => void
    onDelete: (id: string) => void
    onDownload: (photo: Photo) => void
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-4xl bg-card rounded-2xl overflow-hidden shadow-2xl flex flex-col lg:flex-row max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative flex-1 bg-black min-h-[50vh] lg:min-h-0 flex items-center justify-center">
                    {urls?.original ? (
                        <Image
                            src={urls.original}
                            alt={photo.guest_name ?? 'Wedding photo'}
                            fill
                            priority
                            className="object-contain"
                            sizes="(max-width: 1024px) 100vw, 800px"
                        />
                    ) : (
                        <div className="w-full h-full shimmer min-h-[300px]"/>
                    )}

                    {hasPrev && (
                        <button
                            onClick={onPrev}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5"/>
                        </button>
                    )}
                    {hasNext && (
                        <button
                            onClick={onNext}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                        >
                            <ChevronRight className="w-5 h-5"/>
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors lg:hidden"
                    >
                        <X className="w-4 h-4"/>
                    </button>
                </div>

                <div className="w-full lg:w-72 p-6 flex flex-col gap-4 overflow-y-auto">
                    <div className="flex items-center justify-between">
                        <h2 className="font-serif text-xl font-light text-[hsl(var(--dark))]">
                            {photo.guest_name ?? 'Anonymous Guest'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="hidden lg:flex w-8 h-8 rounded-full border border-border items-center justify-center hover:bg-muted transition-colors"
                        >
                            <X className="w-4 h-4"/>
                        </button>
                    </div>

                    <p className="font-sans text-xs text-muted-foreground">
                        {formatDate(photo.created_at)}
                    </p>

                    {photo.message && (
                        <div className="rounded-xl bg-muted p-3">
                            <p className="font-serif italic text-sm text-foreground/80 leading-relaxed">
                                &ldquo;{photo.message}&rdquo;
                            </p>
                        </div>
                    )}

                    <div className="h-px bg-border"/>

                    <div className="flex flex-wrap gap-2">
                        <StatusBadge active={photo.favourite} label="Favourite" color="text-red-500"/>
                        <StatusBadge active={photo.hidden} label="Hidden" color="text-yellow-600"/>
                        <StatusBadge active={!photo.approved} label="Unapproved" color="text-orange-500"/>
                    </div>

                    <div className="space-y-2">
                        <ActionButton
                            onClick={() => onUpdate(photo.id, {favourite: !photo.favourite})}
                            loading={isActionLoading}
                            icon={<Heart className={cn('w-4 h-4', photo.favourite && 'fill-current text-red-400')}/>}
                            label={photo.favourite ? 'Unfavourite' : 'Favourite'}
                        />
                        <ActionButton
                            onClick={() => onUpdate(photo.id, {hidden: !photo.hidden})}
                            loading={isActionLoading}
                            icon={photo.hidden ? <Eye className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}
                            label={photo.hidden ? 'Show' : 'Hide'}
                        />
                        <ActionButton
                            onClick={() => onUpdate(photo.id, {approved: !photo.approved})}
                            loading={isActionLoading}
                            icon={photo.approved ? <XCircle className="w-4 h-4"/> : <CheckCircle className="w-4 h-4"/>}
                            label={photo.approved ? 'Unapprove' : 'Approve'}
                        />
                        <ActionButton
                            onClick={() => onDownload(photo)}
                            loading={isActionLoading}
                            icon={<Download className="w-4 h-4"/>}
                            label="Download"
                        />
                        <ActionButton
                            onClick={() => onDelete(photo.id)}
                            loading={isActionLoading}
                            icon={<Trash2 className="w-4 h-4"/>}
                            label="Delete permanently"
                            danger
                        />
                    </div>

                    <div className="mt-auto pt-2">
                        <div className="text-xs text-muted-foreground font-sans space-y-0.5">
                            {photo.width && photo.height && <p>{photo.width} × {photo.height}px</p>}
                            <p>{(photo.file_size / 1024).toFixed(0)} KB</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatusBadge({active, label, color}: { active: boolean; label: string; color: string }) {
    if (!active) return null
    return (
        <span className={cn('text-xs font-sans font-medium px-2 py-0.5 rounded-full bg-muted', color)}>
      {label}
    </span>
    )
}

function ActionButton({
                          onClick, loading, icon, label, danger,
                      }: {
    onClick: () => void
    loading?: boolean
    icon: React.ReactNode
    label: string
    danger?: boolean
}) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-sans font-medium transition-colors',
                danger ? 'text-destructive hover:bg-destructive/10' : 'text-foreground hover:bg-muted'
            )}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : icon}
            {label}
        </button>
    )
}
