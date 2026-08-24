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
import {
    motion,
    useReducedMotion,
} from 'framer-motion'
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

/*
 * Allows guests to find names without having
 * to type accents exactly.
 *
 * Example:
 * Besartë → besarte
 * Ç → c
 */
function normalizeText(
    value: string
) {
    return value
        .normalize('NFD')
        .replace(
            /[\u0300-\u036f]/g,
            ''
        )
        .trim()
        .toLocaleLowerCase()
}

export function FindSeatClient({
                                   guests,
                                   tables,
                                   venueElements,
                                   groomName,
                                   brideName,
                               }: FindSeatClientProps) {
    const t =
        useTranslations(
            'wedding.findSeat'
        )

    const prefersReducedMotion =
        useReducedMotion()

    const [
        query,
        setQuery,
    ] =
        useState('')

    const [
        selectedGuest,
        setSelectedGuest,
    ] =
        useState<GuestWithTable | null>(
            null
        )

    const inputRef =
        useRef<HTMLInputElement>(
            null
        )

    const normalizedQuery =
        normalizeText(
            query
        )

    const hasSearch =
        normalizedQuery.length >=
        2

    const results =
        useMemo(() => {
            if (
                normalizedQuery.length <
                2
            ) {
                return []
            }

            return guests
                .filter(
                    (
                        guest
                    ) => {
                        const fullName =
                            normalizeText(
                                `${guest.first_name} ${guest.last_name}`
                            )

                        return fullName.includes(
                            normalizedQuery
                        )
                    }
                )
                .slice(
                    0,
                    10
                )
        }, [
            guests,
            normalizedQuery,
        ])

    const clearSearch =
        () => {
            setQuery('')

            requestAnimationFrame(
                () => {
                    inputRef.current?.focus()
                }
            )
        }

    const selectGuest =
        (
            guest: GuestWithTable
        ) => {
            setSelectedGuest(
                guest
            )
        }

    return (
        <div className="relative min-h-screen overflow-hidden bg-background pb-24 sm:pb-32">
            {/* =====================================
                AMBIENT BACKGROUND
            ===================================== */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
            >
                <div className="absolute left-1/2 top-[-240px] h-[600px] w-[760px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/30 blur-[140px]" />

                <div className="absolute bottom-[-220px] right-[-180px] h-[420px] w-[420px] rounded-full bg-[hsl(var(--gold))]/8 blur-[130px]" />
            </div>

            <main className="relative z-10 mx-auto w-full max-w-xl px-5 pt-8 sm:px-6 sm:pt-10">
                {/* =====================================
                    BRAND
                ===================================== */}
                <div className="mb-10 flex justify-center sm:mb-12">
                    <div className="inline-flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white shadow-sm">
                            <Heart
                                className="h-3.5 w-3.5"
                                fill="currentColor"
                                strokeWidth={
                                    1.6
                                }
                            />
                        </div>

                        <span className="font-serif text-xl tracking-tight text-foreground">
                            Wedora
                        </span>
                    </div>
                </div>

                {/* =====================================
                    HEADER
                ===================================== */}
                <header className="text-center">
                    <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3.5 py-2 shadow-sm backdrop-blur">
                        <MapPin
                            className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--primary))]"
                            strokeWidth={
                                1.6
                            }
                        />

                        <span className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:tracking-[0.22em]">
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

                    <h1 className="font-serif text-4xl font-light tracking-[-0.03em] text-foreground sm:text-5xl">
                        {t(
                            'title'
                        )}
                    </h1>

                    <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
                        {t(
                            'hint'
                        )}
                    </p>
                </header>

                {/* =====================================
                    SEARCH
                ===================================== */}
                <section className="mt-8 rounded-[2rem] border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur sm:mt-9 sm:p-6">
                    <label
                        htmlFor="guest-search"
                        className="label-wedding mb-3"
                    >
                        {t(
                            'searchLabel'
                        )}
                    </label>

                    <div className="relative">
                        <Search
                            aria-hidden
                            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            strokeWidth={
                                1.7
                            }
                        />

                        <input
                            ref={
                                inputRef
                            }
                            id="guest-search"
                            type="search"
                            role="searchbox"
                            autoComplete="off"
                            autoCapitalize="words"
                            spellCheck={
                                false
                            }
                            enterKeyHint="search"
                            placeholder={t(
                                'searchPlaceholder'
                            )}
                            value={
                                query
                            }
                            onChange={(
                                event
                            ) =>
                                setQuery(
                                    event
                                        .target
                                        .value
                                )
                            }
                            aria-describedby="guest-search-helper"
                            className="input-wedding h-14 w-full rounded-2xl bg-background pl-11 pr-11 text-sm"
                        />

                        {query.length >
                            0 && (
                                <button
                                    type="button"
                                    onClick={
                                        clearSearch
                                    }
                                    aria-label={t(
                                        'clearSearch'
                                    )}
                                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                    </div>

                    {/* Search helper */}
                    {normalizedQuery.length ===
                        0 && (
                            <div
                                id="guest-search-helper"
                                className="mt-4 flex items-start gap-2.5 rounded-xl bg-secondary/35 px-3.5 py-3"
                            >
                                <Search
                                    aria-hidden
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

                {/* =====================================
                    RESULTS
                ===================================== */}
                <section
                    aria-live="polite"
                    aria-label={t(
                        'resultsLabel'
                    )}
                    className="mt-6"
                >
                    {/* Result header */}
                    {hasSearch &&
                        results.length >
                        0 && (
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
                            ) => {
                                const seatNumber =
                                    guest
                                        .table_seats
                                        ?.seat_index !=
                                    null
                                        ? guest
                                            .table_seats
                                            .seat_index +
                                        1
                                        : null

                                return (
                                    <motion.button
                                        type="button"
                                        key={
                                            guest.id
                                        }
                                        initial={
                                            prefersReducedMotion
                                                ? false
                                                : {
                                                    opacity:
                                                        0,
                                                    y:
                                                        8,
                                                }
                                        }
                                        animate={{
                                            opacity:
                                                1,
                                            y:
                                                0,
                                        }}
                                        transition={{
                                            duration:
                                                prefersReducedMotion
                                                    ? 0
                                                    : 0.22,

                                            delay:
                                                prefersReducedMotion
                                                    ? 0
                                                    : index *
                                                    0.025,
                                        }}
                                        onClick={() =>
                                            selectGuest(
                                                guest
                                            )
                                        }
                                        className="group flex w-full items-center gap-4 rounded-[1.5rem] border border-border/70 bg-card/90 p-4 text-left shadow-sm transition-[transform,border-color,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:border-foreground/10 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                    >
                                        <GuestAvatar
                                            initials={
                                                guest.initials
                                            }
                                            size="lg"
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
                                                    aria-hidden
                                                    className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--primary))]"
                                                    strokeWidth={
                                                        1.6
                                                    }
                                                />

                                                {guest.tables ? (
                                                    <span className="truncate">
                                                        {seatNumber !=
                                                        null
                                                            ? t(
                                                                'tableSeat',
                                                                {
                                                                    number:
                                                                    guest
                                                                        .tables
                                                                        .number,

                                                                    seat:
                                                                    seatNumber,
                                                                }
                                                            )
                                                            : t(
                                                                'table',
                                                                {
                                                                    number:
                                                                    guest
                                                                        .tables
                                                                        .number,
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

                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors duration-200 group-hover:bg-foreground group-hover:text-background">
                                            <ArrowRight
                                                aria-hidden
                                                className="h-4 w-4"
                                                strokeWidth={
                                                    1.7
                                                }
                                            />
                                        </div>
                                    </motion.button>
                                )
                            }
                        )}
                    </div>

                    {/* =================================
                        NO RESULTS
                    ================================= */}
                    {hasSearch &&
                        results.length ===
                        0 && (
                            <motion.div
                                initial={
                                    prefersReducedMotion
                                        ? false
                                        : {
                                            opacity:
                                                0,
                                            y:
                                                4,
                                        }
                                }
                                animate={{
                                    opacity:
                                        1,
                                    y:
                                        0,
                                }}
                                transition={{
                                    duration:
                                        prefersReducedMotion
                                            ? 0
                                            : 0.2,
                                }}
                                className="rounded-[1.5rem] border border-border/60 bg-card/65 px-6 py-10 text-center"
                            >
                                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                                    <Search
                                        aria-hidden
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
                                            query:
                                                query.trim(),
                                        }
                                    )}
                                </p>
                            </motion.div>
                        )}

                    {/* =================================
                        KEEP TYPING
                    ================================= */}
                    {normalizedQuery.length >
                        0 &&
                        normalizedQuery.length <
                        2 && (
                            <p className="py-5 text-center text-xs text-muted-foreground">
                                {t(
                                    'keepTyping'
                                )}
                            </p>
                        )}
                </section>

                {/* =====================================
                    FOOTER
                ===================================== */}
                <p className="mt-12 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/55">
                    {t(
                        'madeWithWedora'
                    )}
                </p>
            </main>

            {/* =====================================
                RESULT MODAL
            ===================================== */}
            <GuestResultModal
                guest={
                    selectedGuest
                }
                onClose={() =>
                    setSelectedGuest(
                        null
                    )
                }
                tables={
                    tables
                }
                venueElements={
                    venueElements
                }
            />
        </div>
    )
}