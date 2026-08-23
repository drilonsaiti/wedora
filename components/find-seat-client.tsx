'use client'

import {
    useMemo,
    useRef,
    useState,
} from 'react'

import {
    ArrowRight,
    Armchair,
    Heart,
    MapPin,
    Search,
    X,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

import { GuestAvatar } from '@/components/guest-avatar'
import { GuestResultModal } from '@/components/guest-result-modal'
import type {
    GuestWithTable,
    Table,
    VenueElement,
} from '@/types/seating'

interface FindSeatClientProps {
    guests: GuestWithTable[]
    tables: Table[]
    venueElements: VenueElement[]
    groomName: string
    brideName: string
}

export function FindSeatClient({
                                   guests,
                                   tables,
                                   venueElements,
                                   groomName,
                                   brideName,
                               }: FindSeatClientProps) {
    const t = useTranslations(
        'wedding.findSeat'
    )

    const [query, setQuery] =
        useState('')

    const [
        selectedGuest,
        setSelectedGuest,
    ] =
        useState<GuestWithTable | null>(
            null
        )

    const inputRef =
        useRef<HTMLInputElement>(null)

    const normalizedQuery =
        query.trim().toLowerCase()

    const results = useMemo(() => {
        if (
            normalizedQuery.length < 2
        ) {
            return []
        }

        return guests
            .filter((guest) => {
                const fullName =
                    `${guest.first_name} ${guest.last_name}`
                        .trim()
                        .toLowerCase()

                return fullName.includes(
                    normalizedQuery
                )
            })
            .slice(0, 10)
    }, [
        guests,
        normalizedQuery,
    ])

    const clearSearch = () => {
        setQuery('')

        requestAnimationFrame(() => {
            inputRef.current?.focus()
        })
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-background pb-32">
            {/* Ambient background */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
            >
                <div className="absolute left-1/2 top-[-240px] h-[600px] w-[760px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/30 blur-[140px]" />

                <div className="absolute bottom-[-220px] right-[-180px] h-[420px] w-[420px] rounded-full bg-[hsl(var(--gold))]/8 blur-[130px]" />
            </div>

            <main className="relative z-10 mx-auto w-full max-w-xl px-6 pt-10">
                {/* Wedora brand */}
                <div className="mb-12 flex justify-center">
                    <div className="inline-flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white shadow-sm">
                            <Heart
                                className="h-3.5 w-3.5"
                                fill="currentColor"
                            />
                        </div>

                        <span className="font-serif text-xl tracking-tight text-foreground">
                            Wedora
                        </span>
                    </div>
                </div>

                {/* Header */}
                <header className="text-center">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3.5 py-2 shadow-sm backdrop-blur">
                        <MapPin
                            className="h-3.5 w-3.5 text-[hsl(var(--primary))]"
                            strokeWidth={1.6}
                        />

                        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                            {t(
                                'weddingOf',
                                {
                                    bride:
                                    brideName,
                                    groom:
                                    groomName,
                                }
                            )}
                        </span>
                    </div>

                    <h1 className="font-serif text-4xl font-light tracking-[-0.025em] text-foreground sm:text-5xl">
                        {t('title')}
                    </h1>

                    <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
                        {t('hint')}
                    </p>
                </header>

                {/* Search card */}
                <section className="mt-9 rounded-[2rem] border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur sm:p-6">
                    <label
                        htmlFor="guest-search"
                        className="mb-3 block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
                    >
                        {t('searchLabel')}
                    </label>

                    <div className="relative">
                        <Search
                            className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--primary))]"
                            strokeWidth={1.7}
                        />

                        <input
                            ref={inputRef}
                            id="guest-search"
                            type="search"
                            autoComplete="off"
                            inputMode="search"
                            placeholder={t(
                                'searchPlaceholder'
                            )}
                            value={query}
                            onChange={(
                                event
                            ) =>
                                setQuery(
                                    event
                                        .target
                                        .value
                                )
                            }
                            className="h-14 w-full rounded-2xl border border-border/70 bg-background pl-11 pr-11 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus:border-[hsl(var(--primary))]/35 focus:ring-4 focus:ring-[hsl(var(--primary))]/8"
                        />

                        {query && (
                            <button
                                type="button"
                                onClick={
                                    clearSearch
                                }
                                aria-label={t(
                                    'clearSearch'
                                )}
                                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Search helper */}
                    {query.length === 0 && (
                        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-secondary/40 px-3.5 py-3">
                            <Search
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                                strokeWidth={
                                    1.6
                                }
                            />

                            <p className="text-xs leading-5 text-muted-foreground">
                                {t(
                                    'searchHelper'
                                )}
                            </p>
                        </div>
                    )}
                </section>

                {/* Results */}
                <section
                    aria-live="polite"
                    className="mt-6"
                >
                    {/* Result count */}
                    {normalizedQuery.length >=
                        2 &&
                        results.length > 0 && (
                            <div className="mb-3 flex items-center justify-between px-1">
                                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                    {t(
                                        'resultsLabel'
                                    )}
                                </p>

                                <span className="text-[10px] tabular-nums text-muted-foreground">
                                    {
                                        results.length
                                    }
                                </span>
                            </div>
                        )}

                    <div className="space-y-3">
                        {results.map(
                            (
                                guest,
                                index
                            ) => (
                                <motion.button
                                    type="button"
                                    key={
                                        guest.id
                                    }
                                    initial={{
                                        opacity: 0,
                                        y: 8,
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                    }}
                                    transition={{
                                        duration:
                                            0.25,
                                        delay:
                                            index *
                                            0.025,
                                    }}
                                    onClick={() =>
                                        setSelectedGuest(
                                            guest
                                        )
                                    }
                                    className="group flex w-full items-center gap-4 rounded-[1.5rem] border border-border/70 bg-card/90 p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[hsl(var(--primary))]/20 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/25 focus:ring-offset-2 focus:ring-offset-background"
                                >
                                    <GuestAvatar
                                        initials={
                                            guest.initials
                                        }
                                        size="lg"
                                        className="shrink-0 border border-border/70"
                                    />

                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate font-serif text-lg font-light text-foreground sm:text-xl">
                                            {
                                                guest.first_name
                                            }{' '}
                                            {
                                                guest.last_name
                                            }
                                        </h3>

                                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Armchair
                                                className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--primary))]"
                                                strokeWidth={
                                                    1.6
                                                }
                                            />

                                            {guest.tables ? (
                                                <span className="truncate">
                                                    {guest
                                                        .tables
                                                        .shape ===
                                                    'round'
                                                        ? t(
                                                            'table',
                                                            {
                                                                number:
                                                                guest
                                                                    .tables
                                                                    .number,
                                                            }
                                                        )
                                                        : t(
                                                            'tableSeat',
                                                            {
                                                                number:
                                                                guest
                                                                    .tables
                                                                    .number,
                                                                seat:
                                                                    (guest
                                                                            .table_seats
                                                                            ?.seat_index ??
                                                                        0) +
                                                                    1,
                                                            }
                                                        )}
                                                </span>
                                            ) : (
                                                <span>
                                                    {t(
                                                        'noTable'
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-all duration-200 group-hover:bg-foreground group-hover:text-background">
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                </motion.button>
                            )
                        )}
                    </div>

                    {/* No result */}
                    {normalizedQuery.length >=
                        2 &&
                        results.length ===
                        0 && (
                            <motion.div
                                initial={{
                                    opacity: 0,
                                }}
                                animate={{
                                    opacity: 1,
                                }}
                                className="rounded-[1.5rem] border border-border/60 bg-card/60 px-6 py-10 text-center"
                            >
                                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                                    <Search
                                        className="h-4 w-4 text-muted-foreground"
                                        strokeWidth={
                                            1.5
                                        }
                                    />
                                </div>

                                <p className="text-sm font-medium text-foreground">
                                    {t(
                                        'noResultsTitle'
                                    )}
                                </p>

                                <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-muted-foreground">
                                    {t(
                                        'noResults',
                                        {
                                            query,
                                        }
                                    )}
                                </p>
                            </motion.div>
                        )}

                    {/* Keep typing */}
                    {query.length > 0 &&
                        normalizedQuery.length <
                        2 && (
                            <p className="py-5 text-center text-xs text-muted-foreground">
                                {t(
                                    'keepTyping'
                                )}
                            </p>
                        )}
                </section>

                {/* Footer */}
                <p className="mt-12 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                    Made with Wedora
                </p>
            </main>

            {/* Seat Result Modal */}
            <GuestResultModal
                guest={selectedGuest}
                onClose={() =>
                    setSelectedGuest(
                        null
                    )
                }
                tables={tables}
                venueElements={
                    venueElements
                }
            />
        </div>
    )
}