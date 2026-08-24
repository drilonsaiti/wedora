'use client'

import {
    useEffect,
    useState,
} from 'react'

import {
    AnimatePresence,
    motion,
    useReducedMotion,
} from 'framer-motion'
import {
    Armchair,
    MapPin,
    X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createPortal } from 'react-dom'

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
    const t =
        useTranslations(
            'wedding'
        )

    const prefersReducedMotion =
        useReducedMotion()

    const [
        mounted,
        setMounted,
    ] =
        useState(false)

    /*
     * Portal can only render after mount.
     */
    useEffect(() => {
        setMounted(true)
    }, [])

    /*
     * Lock body + Escape.
     */
    useEffect(() => {
        if (!guest) {
            return
        }

        const previousOverflow =
            document.body.style.overflow

        document.body.style.overflow =
            'hidden'

        const handleKeyDown = (
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
    }, [
        guest,
        onClose,
    ])

    if (!mounted) {
        return null
    }

    const seatNumber =
        guest?.table_seats
            ?.seat_index != null
            ? guest
                .table_seats
                .seat_index +
            1
            : null

    return createPortal(
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
                        duration:
                            prefersReducedMotion
                                ? 0
                                : 0.18,
                    }}
                    onClick={
                        onClose
                    }
                    className="fixed inset-0 z-[99999] bg-black/55 backdrop-blur-md sm:flex sm:items-center sm:justify-center sm:p-6"
                >
                    <motion.div
                        initial={
                            prefersReducedMotion
                                ? false
                                : {
                                    opacity: 0,
                                    y: 18,
                                    scale: 0.99,
                                }
                        }
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                        }}
                        exit={
                            prefersReducedMotion
                                ? {
                                    opacity: 0,
                                }
                                : {
                                    opacity: 0,
                                    y: 14,
                                    scale: 0.99,
                                }
                        }
                        transition={
                            prefersReducedMotion
                                ? {
                                    duration: 0,
                                }
                                : {
                                    type: 'spring',
                                    stiffness: 340,
                                    damping: 32,
                                }
                        }
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="guest-result-title"
                        onClick={(
                            event
                        ) =>
                            event.stopPropagation()
                        }
                        className="
                            relative flex h-[100dvh] w-full flex-col overflow-hidden bg-card
                            sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-5xl
                            sm:rounded-[2rem] sm:border sm:border-border/70
                            sm:shadow-[0_35px_120px_-30px_rgba(0,0,0,0.65)]
                        "
                    >
                        {/* =====================================
                            HEADER
                        ===================================== */}
                        <header className="relative shrink-0 border-b border-border/60 px-5 py-5 text-center sm:px-8 sm:py-6">
                            <button
                                type="button"
                                onClick={
                                    onClose
                                }
                                aria-label={t(
                                    'close'
                                )}
                                className="
                                    absolute right-4 top-1/2
                                    flex h-9 w-9 -translate-y-1/2
                                    items-center justify-center
                                    rounded-full border border-border/70
                                    bg-background text-muted-foreground
                                    transition-colors
                                    hover:bg-secondary hover:text-foreground
                                    sm:right-6
                                "
                            >
                                <X className="h-4 w-4" />
                            </button>

                            <p className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.22em] text-[hsl(var(--primary))]">
                                {t(
                                    'yourSeat'
                                )}
                            </p>

                            <h2
                                id="guest-result-title"
                                className="mx-auto max-w-md px-10 font-serif text-2xl font-light tracking-[-0.025em] text-foreground sm:text-4xl"
                            >
                                {
                                    guest.first_name
                                }{' '}
                                {
                                    guest.last_name
                                }
                            </h2>
                        </header>

                        {guest.tables ? (
                            <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:overflow-hidden">
                                {/* =================================
                                    ASSIGNMENT
                                ================================= */}
                                <section className="border-b border-border/60 bg-secondary/15 px-5 py-4 sm:px-6 sm:py-5 lg:border-b-0 lg:border-r lg:p-6">
                                    <div className="lg:flex lg:h-full lg:flex-col">
                                        {/* Mobile: compact answer */}
                                        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3.5 lg:hidden">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                                                <Armchair
                                                    className="h-4 w-4 text-[hsl(var(--primary))]"
                                                    strokeWidth={
                                                        1.6
                                                    }
                                                />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="text-[9px] font-medium uppercase tracking-[0.17em] text-muted-foreground">
                                                    {t(
                                                        'yourTable'
                                                    )}
                                                </p>

                                                <p className="mt-0.5 text-sm font-medium text-foreground">
                                                    {t(
                                                        'tableNumber',
                                                        {
                                                            number:
                                                            guest
                                                                .tables
                                                                .number,
                                                        }
                                                    )}
                                                </p>
                                            </div>

                                            {seatNumber !=
                                                null && (
                                                    <>
                                                        <div className="h-8 w-px bg-border/70" />

                                                        <div className="shrink-0 text-right">
                                                            <p className="text-[9px] font-medium uppercase tracking-[0.17em] text-muted-foreground">
                                                                {t(
                                                                    'seat'
                                                                )}
                                                            </p>

                                                            <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                                                                {
                                                                    seatNumber
                                                                }
                                                            </p>
                                                        </div>
                                                    </>
                                                )}
                                        </div>

                                        {/* Desktop assignment */}
                                        <div className="hidden lg:block">
                                            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                                                {t(
                                                    'yourSeat'
                                                )}
                                            </p>

                                            <div className="mt-5 space-y-3">
                                                <AssignmentRow
                                                    icon={
                                                        Armchair
                                                    }
                                                    label={t(
                                                        'yourTable'
                                                    )}
                                                    value={String(
                                                        guest
                                                            .tables
                                                            .number
                                                    )}
                                                />

                                                {seatNumber !=
                                                    null && (
                                                        <AssignmentRow
                                                            icon={
                                                                MapPin
                                                            }
                                                            label={t(
                                                                'seat'
                                                            )}
                                                            value={String(
                                                                seatNumber
                                                            )}
                                                        />
                                                    )}
                                            </div>
                                        </div>

                                        <div className="mt-auto hidden pt-6 lg:block">
                                            <div className="border-t border-border/60 pt-5">
                                                <p className="text-xs leading-5 text-muted-foreground">
                                                    {t(
                                                        'venueMapDescription'
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* =================================
                                    MAP
                                ================================= */}
                                <section className="flex min-h-0 flex-col px-4 pb-4 pt-4 sm:px-6 sm:pb-6 lg:p-6">
                                    <div className="mb-3 flex shrink-0 items-center justify-between gap-4 sm:mb-4">
                                        <div>
                                            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                                                {t(
                                                    'venueMap'
                                                )}
                                            </p>

                                            <p className="mt-1 text-[11px] leading-5 text-muted-foreground lg:hidden">
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

                                    <div className="min-h-[360px] flex-1 sm:min-h-[430px] lg:min-h-0">
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
                                                520
                                            }
                                        />
                                    </div>
                                </section>
                            </div>
                        ) : (
                            /* =================================
                                NO TABLE
                            ================================= */
                            <section className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-8 sm:px-8">
                                <div className="w-full max-w-md rounded-[1.5rem] border border-border/60 bg-secondary/25 px-6 py-10 text-center">
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
                            </section>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )
}

/*
 * ============================================
 * DESKTOP ASSIGNMENT ROW
 * ============================================
 */
function AssignmentRow({
                           icon: Icon,
                           label,
                           value,
                       }: {
    icon: typeof Armchair
    label: string
    value: string
}) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                <Icon
                    className="h-4 w-4 text-[hsl(var(--primary))]"
                    strokeWidth={
                        1.6
                    }
                />
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-[8px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {label}
                </p>

                <p className="mt-0.5 text-base font-medium tabular-nums text-foreground">
                    {value}
                </p>
            </div>
        </div>
    )
}