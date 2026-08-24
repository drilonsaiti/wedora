'use client'

import {
    useMemo,
    useState,
} from 'react'

import {
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    Heart,
    Plus,
    Search,
    X,
} from 'lucide-react'
import {
    useLocale,
    useTranslations,
} from 'next-intl'

import { CreateWeddingForm } from '@/components/admin/create-wedding-form'
import { EditWeddingForm } from '@/components/admin/edit-wedding-form'
import { WeddingRowActions } from '@/components/admin/wedding-row-actions'
import { Modal } from '@/components/ui/modal'
import {
    Link,
    useRouter,
} from '@/lib/navigation'
import {
    getWeddingStatus,
    WEDDING_STATUS_COLORS,
    WEDDING_STATUS_LABELS,
} from '@/lib/wedding-status'
import { cn } from '@/lib/utils'

export type WeddingSettings = {
    theme_color?: string | null
    enable_find_seat?: boolean | null
    enable_photo_upload?: boolean | null
}

export type WeddingRow = {
    id: string
    groom_name: string | null
    bride_name: string | null

    groom_email: string | null
    bride_email: string | null

    slug: string | null
    wedding_date: string | null
    created_at: string | null

    wedding_settings:
        | WeddingSettings
        | WeddingSettings[]
        | null
}

interface WeddingsPageClientProps {
    weddings: WeddingRow[]
    adminEmail: string
}

export function WeddingsPageClient({
                                       weddings,
                                       adminEmail,
                                   }: WeddingsPageClientProps) {
    const router =
        useRouter()

    const locale =
        useLocale()

    const t =
        useTranslations(
            'weddings'
        )

    const ts =
        useTranslations(
            'status'
        )

    /*
     * Create modal
     */
    const [
        createModalOpen,
        setCreateModalOpen,
    ] =
        useState(false)

    /*
     * Edit/settings modal
     */
    const [
        selectedWedding,
        setSelectedWedding,
    ] =
        useState<WeddingRow | null>(
            null
        )

    const [
        search,
        setSearch,
    ] =
        useState('')

    const filteredWeddings =
        useMemo(() => {
            const query =
                search
                    .trim()
                    .toLowerCase()

            if (!query) {
                return weddings
            }

            return weddings.filter(
                (
                    wedding
                ) => {
                    const groom =
                        wedding.groom_name
                            ?.toLowerCase() ??
                        ''

                    const bride =
                        wedding.bride_name
                            ?.toLowerCase() ??
                        ''

                    const slug =
                        wedding.slug
                            ?.toLowerCase() ??
                        ''

                    return (
                        groom.includes(
                            query
                        ) ||
                        bride.includes(
                            query
                        ) ||
                        slug.includes(
                            query
                        ) ||
                        `${groom} ${bride}`.includes(
                            query
                        ) ||
                        `${bride} ${groom}`.includes(
                            query
                        )
                    )
                }
            )
        }, [
            weddings,
            search,
        ])

    const formatWeddingDate =
        (
            value: string
        ) => {
            return new Intl.DateTimeFormat(
                locale,
                {
                    dateStyle:
                        'medium',
                }
            ).format(
                new Date(
                    value
                )
            )
        }

    return (
        <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
            {/* =====================================
                HEADER
            ===================================== */}
            <section className="mb-8">
                <Link
                    href="/admin/dashboard"
                    className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft
                        className="h-3.5 w-3.5"
                        strokeWidth={
                            1.6
                        }
                    />

                    {t(
                        'backToDashboard'
                    )}
                </Link>

                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                    <div>
                        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                            Wedora Admin
                        </p>

                        <h1 className="font-serif text-4xl font-light tracking-[-0.025em] text-foreground sm:text-5xl">
                            {t(
                                'title'
                            )}
                        </h1>

                        <p className="mt-3 text-sm text-muted-foreground">
                            {t(
                                'weddingCount',
                                {
                                    count:
                                    weddings.length,
                                }
                            )}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setCreateModalOpen(
                                true
                            )
                        }
                        className="btn-primary justify-center"
                    >
                        <Plus className="h-4 w-4" />

                        {t(
                            'newWedding'
                        )}
                    </button>
                </div>
            </section>

            {/* =====================================
                EMPTY STATE
            ===================================== */}
            {weddings.length ===
            0 ? (
                <section className="rounded-[2rem] border border-border/70 bg-card/80 px-6 py-20 text-center shadow-sm backdrop-blur">
                    <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--accent))]">
                        <Heart
                            className="h-6 w-6 text-[hsl(var(--primary))]"
                            strokeWidth={
                                1.5
                            }
                        />
                    </div>

                    <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
                        {t(
                            'noWeddings'
                        )}
                    </h2>

                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                        {t(
                            'noWeddingsDescription'
                        )}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            setCreateModalOpen(
                                true
                            )
                        }
                        className="btn-primary mt-7 inline-flex"
                    >
                        <Plus className="h-4 w-4" />

                        {t(
                            'createFirstWedding'
                        )}
                    </button>
                </section>
            ) : (
                <>
                    {/* =====================================
                        SEARCH
                    ===================================== */}
                    <section className="mb-5">
                        <div className="relative max-w-md">
                            <Search
                                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                                strokeWidth={
                                    1.6
                                }
                            />

                            <input
                                type="search"
                                value={
                                    search
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSearch(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                placeholder={t(
                                    'searchPlaceholder'
                                )}
                                className="input-wedding h-11 pl-11 pr-10"
                            />

                            {search && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSearch(
                                            ''
                                        )
                                    }
                                    aria-label={t(
                                        'clearSearch'
                                    )}
                                    className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </section>

                    {/* =====================================
                        LIST
                    ===================================== */}
                    <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/80 shadow-sm backdrop-blur">
                        {/* Desktop labels */}
                        <div className="hidden grid-cols-[minmax(0,1fr)_180px_120px_72px] gap-4 border-b border-border/60 bg-secondary/20 px-6 py-3 lg:grid">
                            <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                {t(
                                    'title'
                                )}
                            </span>

                            <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                {t(
                                    'date'
                                )}
                            </span>

                            <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                {t(
                                    'status'
                                )}
                            </span>

                            <span />
                        </div>

                        {filteredWeddings.length >
                        0 ? (
                            <div className="divide-y divide-border/60">
                                {filteredWeddings.map(
                                    (
                                        wedding
                                    ) => (
                                        <WeddingListRow
                                            key={
                                                wedding.id
                                            }
                                            wedding={
                                                wedding
                                            }
                                            t={
                                                t
                                            }
                                            ts={
                                                ts
                                            }
                                            formatWeddingDate={
                                                formatWeddingDate
                                            }
                                            onEdit={() =>
                                                setSelectedWedding(
                                                    wedding
                                                )
                                            }
                                        />
                                    )
                                )}
                            </div>
                        ) : (
                            <div className="px-6 py-16 text-center">
                                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
                                    <Search
                                        className="h-4 w-4 text-muted-foreground"
                                        strokeWidth={
                                            1.5
                                        }
                                    />
                                </div>

                                <p className="mt-4 text-sm text-muted-foreground">
                                    {t(
                                        'noWeddingFound',
                                        {
                                            query:
                                            search,
                                        }
                                    )}
                                </p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setSearch(
                                            ''
                                        )
                                    }
                                    className="mt-4 text-xs font-medium text-[hsl(var(--primary))] transition-opacity hover:opacity-70"
                                >
                                    {t(
                                        'clearSearch'
                                    )}
                                </button>
                            </div>
                        )}
                    </section>

                    {search && (
                        <p className="mt-3 text-xs tabular-nums text-muted-foreground">
                            {
                                filteredWeddings.length
                            }{' '}
                            /{' '}
                            {
                                weddings.length
                            }
                        </p>
                    )}
                </>
            )}

            {/* =====================================
                CREATE WEDDING MODAL
            ===================================== */}
            <Modal
                open={
                    createModalOpen
                }
                onClose={() =>
                    setCreateModalOpen(
                        false
                    )
                }
                maxWidth="max-w-2xl"
            >
                <CreateWeddingForm
                    adminEmail={
                        adminEmail
                    }
                    onSuccess={(
                        weddingId
                    ) => {
                        setCreateModalOpen(
                            false
                        )

                        router.push(
                            `/admin/weddings/${weddingId}`
                        )

                        router.refresh()
                    }}
                />
            </Modal>

            {/* =====================================
                EDIT / SETTINGS MODAL
            ===================================== */}
            <Modal
                open={
                    selectedWedding !==
                    null
                }
                onClose={() =>
                    setSelectedWedding(
                        null
                    )
                }
                maxWidth="max-w-2xl"
            >
                {selectedWedding && (
                    <EditWeddingForm
                        wedding={
                            selectedWedding
                        }
                        modal
                        onSuccess={() => {
                            setSelectedWedding(
                                null
                            )

                            router.refresh()
                        }}
                    />
                )}
            </Modal>
        </main>
    )
}

/*
 * ============================================
 * WEDDING ROW
 * ============================================
 */
function WeddingListRow({
                            wedding,
                            t,
                            ts,
                            formatWeddingDate,
                            onEdit,
                        }: {
    wedding: WeddingRow
    t: ReturnType<
        typeof useTranslations
    >
    ts: ReturnType<
        typeof useTranslations
    >
    formatWeddingDate: (
        value: string
    ) => string
    onEdit: () => void
}) {
    const status =
        getWeddingStatus(
            wedding.wedding_date
        )

    const groom =
        wedding.groom_name ??
        t('groom')

    const bride =
        wedding.bride_name ??
        t('bride')

    const initials =
        `${groom[0] ?? ''}${bride[0] ?? ''}`.toUpperCase()

    return (
        <div className="group grid gap-4 px-5 py-5 transition-colors hover:bg-secondary/20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_180px_120px_72px] lg:items-center">
            {/* Wedding */}
            <Link
                href={`/admin/weddings/${wedding.id}`}
                className="flex min-w-0 items-center gap-4"
            >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent))] text-[11px] font-medium tracking-wide text-[hsl(var(--primary))]">
                    {
                        initials
                    }
                </div>

                <div className="min-w-0">
                    <p className="truncate font-serif text-xl font-light text-foreground">
                        {groom}{' '}
                        &{' '}
                        {bride}
                    </p>

                    <p className="mt-1 truncate text-[10px] text-muted-foreground">
                        /
                        {wedding.slug ??
                            '—'}
                    </p>
                </div>
            </Link>

            {/* Date */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground lg:block">
                <CalendarDays className="h-3.5 w-3.5 lg:hidden" />

                {wedding.wedding_date
                    ? formatWeddingDate(
                        wedding.wedding_date
                    )
                    : '—'}
            </div>

            {/* Status */}
            <div>
                <span
                    className={cn(
                        'inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium',
                        WEDDING_STATUS_COLORS[
                            status
                            ]
                    )}
                >
                    {ts(
                        WEDDING_STATUS_LABELS[
                            status
                            ]
                    )}
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-1">
                <WeddingRowActions
                    weddingId={
                        wedding.id
                    }
                    onEdit={
                        onEdit
                    }
                />

                <Link
                    href={`/admin/weddings/${wedding.id}`}
                    aria-label={t(
                        'openWedding'
                    )}
                    title={t(
                        'openWedding'
                    )}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-foreground hover:text-background"
                >
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        </div>
    )
}