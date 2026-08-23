'use client'

import {
    AnimatePresence,
    motion,
} from 'framer-motion'
import {
    Armchair,
    MapPin,
    X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import { VenueMap } from '@/components/venue-map'
import type {
    GuestWithTable,
    Table,
    VenueElement,
} from '@/types/seating'

interface GuestResultModalProps {
    guest: GuestWithTable | null
    onClose: () => void
    tables: Table[]
    venueElements: VenueElement[]
}

export function GuestResultModal({
                                     guest,
                                     onClose,
                                     tables,
                                     venueElements,
                                 }: GuestResultModalProps) {
    const t = useTranslations('wedding')

    return (
        <AnimatePresence>
            {guest && (
                <motion.div
                    initial={{
                        opacity: 0,
                    }}
                    animate={{
                        opacity: 1,
                    }}
                    exit={{
                        opacity: 0,
                    }}
                    transition={{
                        duration: 0.2,
                    }}
                    className="fixed inset-0 z-[100] overflow-y-auto bg-black/45 backdrop-blur-md"
                    onClick={onClose}
                >
                    <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-6">
                        <motion.div
                            initial={{
                                opacity: 0,
                                y: 30,
                                scale: 0.98,
                            }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                scale: 1,
                            }}
                            exit={{
                                opacity: 0,
                                y: 30,
                                scale: 0.98,
                            }}
                            transition={{
                                type: 'spring',
                                stiffness: 320,
                                damping: 30,
                            }}
                            role="dialog"
                            aria-modal="true"
                            className="relative w-full max-w-xl overflow-hidden rounded-t-[2rem] border border-border/70 bg-card shadow-[0_30px_100px_-30px_rgba(0,0,0,0.55)] sm:rounded-[2rem]"
                            onClick={(event) =>
                                event.stopPropagation()
                            }
                        >
                            {/* Header */}
                            <div className="relative px-6 pb-6 pt-7 text-center sm:px-8 sm:pt-8">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label={t('close')}
                                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground backdrop-blur transition hover:bg-secondary hover:text-foreground sm:right-5 sm:top-5"
                                >
                                    <X className="h-4 w-4" />
                                </button>

                                <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                                    {t('welcome')}
                                </p>

                                <h2 className="mx-auto max-w-sm pr-6 font-serif text-3xl font-light tracking-[-0.02em] text-foreground sm:text-4xl">
                                    {guest.first_name}{' '}
                                    {guest.last_name}
                                </h2>
                            </div>

                            {guest.tables ? (
                                <>
                                    {/* Seat summary */}
                                    <div className="border-y border-border/60 bg-secondary/25 px-6 py-6 sm:px-8">
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="rounded-2xl border border-border/60 bg-background p-5 text-left">
                                                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                                                    <Armchair
                                                        className="h-4 w-4 text-[hsl(var(--primary))]"
                                                        strokeWidth={
                                                            1.6
                                                        }
                                                    />
                                                </div>

                                                <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                    {t(
                                                        'yourTable'
                                                    )}
                                                </p>

                                                <p className="mt-1 font-serif text-4xl font-light tracking-tight text-foreground">
                                                    {
                                                        guest
                                                            .tables
                                                            .number
                                                    }
                                                </p>
                                            </div>

                                            <div className="rounded-2xl border border-border/60 bg-background p-5 text-left">
                                                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                                                    <MapPin
                                                        className="h-4 w-4 text-[hsl(var(--primary))]"
                                                        strokeWidth={
                                                            1.6
                                                        }
                                                    />
                                                </div>

                                                <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                    {guest.tables
                                                        .shape !==
                                                    'round'
                                                        ? t(
                                                            'seat'
                                                        )
                                                        : t(
                                                            'venueMap'
                                                        )}
                                                </p>

                                                {guest.tables
                                                    .shape !==
                                                'round' ? (
                                                    <p className="mt-1 font-serif text-4xl font-light tracking-tight text-foreground">
                                                        {(guest
                                                                    .table_seats
                                                                    ?.seat_index ??
                                                                0) +
                                                            1}
                                                    </p>
                                                ) : (
                                                    <p className="mt-2 text-sm leading-5 text-muted-foreground">
                                                        {t(
                                                            'tableLocation'
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Venue map */}
                                    <div className="px-4 py-6 sm:px-8 sm:py-8">
                                        <div className="mb-4 flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                    {t(
                                                        'venueMap'
                                                    )}
                                                </p>

                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {t(
                                                        'venueMapDescription'
                                                    )}
                                                </p>
                                            </div>

                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                                                <MapPin
                                                    className="h-4 w-4 text-[hsl(var(--primary))]"
                                                    strokeWidth={
                                                        1.6
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-background">
                                            <VenueMap
                                                tables={
                                                    tables
                                                }
                                                venueElements={
                                                    venueElements
                                                }
                                                highlightedTableId={
                                                    guest.table_id
                                                }
                                                highlightedSeatId={
                                                    guest.seat_id
                                                }
                                                maxHeight={
                                                    400
                                                }
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* No table */
                                <div className="px-6 pb-8 sm:px-8">
                                    <div className="rounded-[1.5rem] border border-border/60 bg-secondary/30 px-6 py-9 text-center">
                                        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                                            <Armchair
                                                className="h-5 w-5 text-[hsl(var(--primary))]"
                                                strokeWidth={
                                                    1.5
                                                }
                                            />
                                        </div>

                                        <h3 className="font-serif text-2xl font-light text-foreground">
                                            {t(
                                                'noTable'
                                            )}
                                        </h3>

                                        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                                            {t(
                                                'noTableDescription'
                                            )}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}