'use client'

import {
    useMemo,
    useState,
} from 'react'

import {
    ArrowRight,
    Search,
    X,
} from 'lucide-react'
import {
    AnimatePresence,
    motion,
} from 'framer-motion'
import { useTranslations } from 'next-intl'

import { GuestAvatar } from '@/components/guest-avatar'
import { GuestResultModal } from '@/components/guest-result-modal'
import type {
    GuestWithTable,
    Table,
    VenueElement,
} from '@/types/seating'

interface HomeSearchProps {
    guests: GuestWithTable[]
    tables: Table[]
    venueElements: VenueElement[]
}

/*
 * Makes search friendlier:
 *
 * "Besartë" can also be found
 * by typing "besarte".
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

export function HomeSearch({
                               guests,
                               tables,
                               venueElements,
                           }: HomeSearchProps) {
    const t =
        useTranslations(
            'wedding'
        )

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
                    6
                )
        }, [
            guests,
            normalizedQuery,
        ])

    const selectGuest =
        (
            guest: GuestWithTable
        ) => {
            setSelectedGuest(
                guest
            )

            setQuery('')
        }

    return (
        <div className="relative mb-10">
            {/* =====================================
                SEARCH
            ===================================== */}
            <div className="relative">
                <Search
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={
                        1.7
                    }
                />

                <input
                    type="search"
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
                    placeholder={t(
                        'searchPlaceholder'
                    )}
                    autoComplete="off"
                    className="input-wedding h-14 w-full rounded-2xl bg-card/90 pl-11 pr-11 text-base shadow-sm"
                />

                {query && (
                    <button
                        type="button"
                        onClick={() =>
                            setQuery(
                                ''
                            )
                        }
                        aria-label={t(
                            'clearSearch'
                        )}
                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {/* =====================================
                RESULTS
            ===================================== */}
            <AnimatePresence>
                {hasSearch && (
                    <motion.div
                        initial={{
                            opacity:
                                0,
                            y: -6,
                            scale:
                                0.99,
                        }}
                        animate={{
                            opacity:
                                1,
                            y: 0,
                            scale:
                                1,
                        }}
                        exit={{
                            opacity:
                                0,
                            y: -6,
                            scale:
                                0.99,
                        }}
                        transition={{
                            duration:
                                0.16,
                        }}
                        className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/95 shadow-xl backdrop-blur-xl"
                    >
                        {results.length >
                        0 ? (
                            <div className="divide-y divide-border/60">
                                {results.map(
                                    (
                                        guest
                                    ) => {
                                        const hasSeat =
                                            guest
                                                .table_seats
                                                ?.seat_index !=
                                            null

                                        return (
                                            <button
                                                key={
                                                    guest.id
                                                }
                                                type="button"
                                                onClick={() =>
                                                    selectGuest(
                                                        guest
                                                    )
                                                }
                                                className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/40 sm:px-5 sm:py-4"
                                            >
                                                <GuestAvatar
                                                    initials={
                                                        guest.initials
                                                    }
                                                    size="sm"
                                                    className="shrink-0"
                                                />

                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-serif text-lg font-light text-foreground">
                                                        {
                                                            guest.first_name
                                                        }{' '}
                                                        {
                                                            guest.last_name
                                                        }
                                                    </p>

                                                    <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                                        {guest.tables
                                                            ? hasSeat
                                                                ? t(
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
                                                                )
                                                                : t(
                                                                    'tableNumber',
                                                                    {
                                                                        number:
                                                                        guest
                                                                            .tables
                                                                            .number,
                                                                    }
                                                                )
                                                            : t(
                                                                'noTable'
                                                            )}
                                                    </p>
                                                </div>

                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-all group-hover:bg-foreground group-hover:text-background">
                                                    <ArrowRight
                                                        className="h-4 w-4"
                                                        strokeWidth={
                                                            1.7
                                                        }
                                                    />
                                                </div>
                                            </button>
                                        )
                                    }
                                )}
                            </div>
                        ) : (
                            <div className="px-6 py-8 text-center">
                                <Search
                                    className="mx-auto h-5 w-5 text-muted-foreground"
                                    strokeWidth={
                                        1.5
                                    }
                                />

                                <p className="mt-3 text-sm text-muted-foreground">
                                    {t(
                                        'noResultsFor',
                                        {
                                            query:
                                                query.trim(),
                                        }
                                    )}
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* =====================================
                GUEST RESULT
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