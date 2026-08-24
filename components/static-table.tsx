'use client'

import {
    motion,
    useReducedMotion,
} from 'framer-motion'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import type { Table } from '@/types/seating'

interface StaticTableProps {
    table: Table
    isHighlighted: boolean
    highlightedSeatId?: string | null
}

const SHAPE_CLASSES = {
    round: 'rounded-full',
    square: 'rounded-2xl',
    rectangle: 'rounded-2xl',
} as const

export function StaticTable({
                                table,
                                isHighlighted,
                                highlightedSeatId,
                            }: StaticTableProps) {
    const t =
        useTranslations(
            'seating'
        )

    const prefersReducedMotion =
        useReducedMotion()

    const shapeClass =
        SHAPE_CLASSES[
            table.shape as keyof typeof SHAPE_CLASSES
            ] ??
        SHAPE_CLASSES.rectangle

    const tableNumber =
        String(
            table.number
        )

    const accessibilityLabel =
        table.label
            ? `${t(
                'tableNumber',
                {
                    number:
                    tableNumber,
                }
            )} — ${table.label}`
            : t(
                'tableNumber',
                {
                    number:
                    tableNumber,
                }
            )

    return (
        <motion.div
            role="img"
            aria-label={
                accessibilityLabel
            }
            className={cn(
                'absolute flex flex-col items-center justify-center border bg-card/95 text-center shadow-sm backdrop-blur-sm',
                'transition-[border-color,box-shadow] duration-300',
                shapeClass,

                isHighlighted
                    ? 'z-20 border-[hsl(var(--primary))] shadow-lg ring-4 ring-[hsl(var(--primary))]/10'
                    : 'z-10 border-border/80'
            )}
            style={{
                left:
                table.pos_x,

                top:
                table.pos_y,

                width:
                table.width,

                height:
                table.height,
            }}
            initial={
                false
            }
            animate={
                isHighlighted &&
                !prefersReducedMotion
                    ? {
                        scale: [
                            1,
                            1.025,
                            1,
                        ],
                    }
                    : {
                        scale:
                            1,
                    }
            }
            transition={
                isHighlighted &&
                !prefersReducedMotion
                    ? {
                        duration:
                            1.1,
                        repeat:
                            1,
                        ease:
                            'easeInOut',
                    }
                    : {
                        duration:
                            0.2,
                    }
            }
        >
            {/* =====================================
                TABLE CONTENT
            ===================================== */}
            <div className="pointer-events-none relative z-10 max-w-full px-3">
                <span className="block text-[8px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {t(
                        'table'
                    )}
                </span>

                <span
                    className={cn(
                        'mt-0.5 block font-serif font-light leading-none',
                        isHighlighted
                            ? 'text-[hsl(var(--primary))]'
                            : 'text-foreground',

                        table.width <
                        80 ||
                        table.height <
                        80
                            ? 'text-xl'
                            : 'text-2xl'
                    )}
                >
                    {
                        table.number
                    }
                </span>

                {table.label && (
                    <span
                        className={cn(
                            'mt-1 block max-w-full truncate px-1 font-medium text-muted-foreground',
                            table.width <
                            90
                                ? 'text-[8px]'
                                : 'text-[9px]'
                        )}
                    >
                        {
                            table.label
                        }
                    </span>
                )}
            </div>

            {/* =====================================
                SEATS
            ===================================== */}
            {table.table_seats?.map(
                (
                    seat
                ) => {
                    const isSeatHighlighted =
                        seat.id ===
                        highlightedSeatId

                    return (
                        <motion.div
                            key={
                                seat.id
                            }
                            className="absolute left-0 top-0 z-20 flex h-12 w-12 items-center justify-center"
                            style={{
                                transform: `translate(${seat.relative_x}px, ${seat.relative_y}px) translate(-50%, -50%)`,
                            }}
                            initial={
                                false
                            }
                            animate={
                                isSeatHighlighted &&
                                !prefersReducedMotion
                                    ? {
                                        scale: [
                                            1,
                                            1.15,
                                            1,
                                        ],
                                    }
                                    : {
                                        scale:
                                            1,
                                    }
                            }
                            transition={
                                isSeatHighlighted &&
                                !prefersReducedMotion
                                    ? {
                                        duration:
                                            0.9,
                                        repeat:
                                            2,
                                        ease:
                                            'easeInOut',
                                    }
                                    : {
                                        duration:
                                            0.2,
                                    }
                            }
                        >
                            <div
                                className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-full border text-[9px] font-medium tabular-nums shadow-sm transition-all',

                                    isSeatHighlighted
                                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white ring-4 ring-[hsl(var(--primary))]/15'
                                        : 'border-border/90 bg-card text-muted-foreground'
                                )}
                            >
                                {seat.seat_index +
                                    1}
                            </div>
                        </motion.div>
                    )
                }
            )}
        </motion.div>
    )
}