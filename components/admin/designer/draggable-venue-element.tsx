'use client'

import { useDraggable } from '@dnd-kit/core'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
    VENUE_COLORS,
    VENUE_ICONS,
    VENUE_PRESETS,
    type VenueColorKey,
    type VenueIconKey,
} from '@/lib/venue-icons'
import { cn } from '@/lib/utils'
import type { VenueElement } from '@/types/seating'

interface DraggableVenueElementProps {
    element: VenueElement
    onDelete: (id: string) => void
}

const SHAPE_CLASSES = {
    circle: 'rounded-full',
    square: 'rounded-2xl',
    rectangle: 'rounded-2xl',
} as const

/*
 * Historical system labels that may already
 * exist in the database.
 *
 * Known system labels are translated.
 * Custom labels remain untouched.
 */
const DEFAULT_LABELS: Record<string, string[]> = {
    entrance: [
        'Entrance',
        'Hyrja',
    ],
    pool: [
        'Pool',
        'Pishina',
    ],
    couple_table: [
        'Couple',
        'Çifti',
        'Cifti',
    ],
    music: [
        'Music',
        'Muzika',
    ],
    bar: [
        'Bar',
    ],
    toilet: [
        'Restroom',
        'Toilet',
        'Tualeti',
    ],
}

const TRANSLATABLE_TYPES = [
    'entrance',
    'pool',
    'couple_table',
    'music',
    'bar',
    'toilet',
] as const

type TranslatableVenueType =
    (typeof TRANSLATABLE_TYPES)[number]

function isTranslatableVenueType(
    value: string
): value is TranslatableVenueType {
    return TRANSLATABLE_TYPES.includes(
        value as TranslatableVenueType
    )
}

export function DraggableVenueElement({
                                          element,
                                          onDelete,
                                      }: DraggableVenueElementProps) {
    const tp =
        useTranslations(
            'seating.venuePresets'
        )

    const te =
        useTranslations(
            'seating.venueEditor'
        )

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useDraggable({
        id: `venue-${element.id}`,
        data: {
            type: 'venue_element',
            element,
        },
    })

    const Icon =
        VENUE_ICONS[
            element.icon as VenueIconKey
            ] ??
        VENUE_ICONS.MapPin

    const colorClass =
        VENUE_COLORS[
            element.color as VenueColorKey
            ] ??
        VENUE_COLORS.gray

    const shapeClass =
        SHAPE_CLASSES[
            element.shape as keyof typeof SHAPE_CLASSES
            ] ??
        SHAPE_CLASSES.rectangle

    const isEntrance =
        element.type ===
        'entrance'

    const isCoupleTable =
        element.type ===
        'couple_table'

    /*
     * ============================================
     * DISPLAY LABEL
     *
     * System/default labels:
     * translated according to admin locale.
     *
     * Custom labels:
     * shown exactly as entered.
     * ============================================
     */
    const knownLabels =
        DEFAULT_LABELS[
            element.type
            ]

    const preset =
        VENUE_PRESETS.find(
            (item) =>
                item.type ===
                element.type
        )

    const isDefaultLabel =
        !element.label ||
        knownLabels?.some(
            (label) =>
                label.toLocaleLowerCase() ===
                element.label
                    ?.trim()
                    .toLocaleLowerCase()
        ) ||
        (
            preset &&
            preset.label.toLocaleLowerCase() ===
            element.label
                ?.trim()
                .toLocaleLowerCase()
        )

    const displayLabel =
        isDefaultLabel &&
        isTranslatableVenueType(
            element.type
        )
            ? tp(
                element.type
            )
            : element.label

    const style = {
        position:
            'absolute' as const,

        left:
        element.pos_x,

        top:
        element.pos_y,

        width:
        element.width,

        height:
        element.height,

        transform:
            transform
                ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
                : undefined,

        /*
         * Important for touch dragging
         * inside the venue designer.
         */
        touchAction:
            'none' as const,
    }

    return (
        <div
            ref={
                setNodeRef
            }
            style={
                style
            }
            aria-label={
                displayLabel ||
                element.type
            }
            className={cn(
                'group absolute flex select-none flex-col items-center justify-center overflow-visible border text-center shadow-sm',
                'transition-[box-shadow,opacity,border-color] duration-200',
                shapeClass,
                colorClass,

                /*
                 * Standard draggable state
                 */
                !isDragging &&
                'cursor-grab hover:shadow-md active:cursor-grabbing',

                /*
                 * Drag state
                 */
                isDragging &&
                'z-50 cursor-grabbing opacity-80 shadow-xl ring-2 ring-foreground/10',

                /*
                 * Important venue elements
                 */
                isEntrance &&
                'border-solid',

                isCoupleTable &&
                'border-solid'
            )}
            {...listeners}
            {...attributes}
        >
            {/* =====================================
                CONTENT
            ===================================== */}
            <div className="pointer-events-none flex h-full w-full flex-col items-center justify-center overflow-hidden">
                <div
                    className={cn(
                        'flex items-center justify-center rounded-full bg-background/55 backdrop-blur-sm',

                        element.width <
                        70 ||
                        element.height <
                        70
                            ? 'h-7 w-7'
                            : 'h-9 w-9'
                    )}
                >
                    <Icon
                        className={cn(
                            element.width <
                            70 ||
                            element.height <
                            70
                                ? 'h-3.5 w-3.5'
                                : 'h-4 w-4'
                        )}
                        strokeWidth={
                            1.7
                        }
                    />
                </div>

                {displayLabel && (
                    <span
                        className={cn(
                            'mt-1 max-w-full truncate px-2 font-medium leading-none',

                            element.width <
                            80
                                ? 'text-[8px]'
                                : 'text-[10px]'
                        )}
                    >
                        {
                            displayLabel
                        }
                    </span>
                )}
            </div>

            {/* =====================================
                DELETE
            ===================================== */}
            {!isDragging && (
                <button
                    type="button"
                    aria-label={te(
                        'deleteElement',
                        {
                            name:
                                displayLabel ||
                                element.type,
                        }
                    )}
                    title={te(
                        'deleteElement',
                        {
                            name:
                                displayLabel ||
                                element.type,
                        }
                    )}
                    onPointerDown={(
                        event
                    ) => {
                        /*
                         * Prevent dnd-kit from interpreting
                         * delete as the beginning of a drag.
                         */
                        event.stopPropagation()
                    }}
                    onClick={(
                        event
                    ) => {
                        event.stopPropagation()

                        onDelete(
                            element.id
                        )
                    }}
                    className={cn(
                        'absolute -right-2 -top-2 z-20',
                        'flex h-6 w-6 items-center justify-center rounded-full',
                        'border border-destructive/15 bg-card text-destructive shadow-md',
                        'opacity-0 scale-90 transition-all duration-150',
                        'group-hover:scale-100 group-hover:opacity-100',
                        'focus:scale-100 focus:opacity-100',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/20',
                        /*
                         * Touch devices have no hover,
                         * so keep the control visible.
                         */
                        'max-md:scale-100 max-md:opacity-100',
                        'hover:bg-destructive hover:text-destructive-foreground'
                    )}
                >
                    <X
                        className="h-3 w-3"
                        strokeWidth={
                            2
                        }
                    />
                </button>
            )}
        </div>
    )
}