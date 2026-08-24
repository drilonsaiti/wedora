'use client'

import { useTranslations } from 'next-intl'

import {
    VENUE_COLORS,
    VENUE_ICONS,
    type VenueColorKey,
    type VenueIconKey,
} from '@/lib/venue-icons'
import { cn } from '@/lib/utils'
import type { VenueElement } from '@/types/seating'

const SHAPE_CLASSES = {
    circle: 'rounded-full',
    square: 'rounded-2xl',
    rectangle: 'rounded-2xl',
} as const

/*
 * Existing/default labels we have used historically.
 *
 * If the stored label matches one of these, it is
 * considered a system label and gets translated.
 *
 * Anything else is treated as a custom admin label
 * and displayed exactly as entered.
 */
const DEFAULT_LABELS: Record<
    string,
    string[]
> = {
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

export function StaticVenueElement({
                                       element,
                                   }: {
    element: VenueElement
}) {
    const t =
        useTranslations(
            'seating.venuePresets'
        )

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
     * Translate only known system labels.
     *
     * Example:
     * DB: type="entrance", label="Hyrja"
     * EN → Entrance
     * DE → Eingang
     * FR → Entrée
     *
     * But:
     * label="Main Garden Entrance"
     * remains exactly that.
     */
    const knownLabels =
        DEFAULT_LABELS[
            element.type
            ]

    const isDefaultLabel =
        !element.label ||
        knownLabels?.some(
            (
                label
            ) =>
                label.toLocaleLowerCase() ===
                element.label
                    ?.trim()
                    .toLocaleLowerCase()
        )

    const displayLabel =
        isDefaultLabel
            ? t(
                element.type as
                    | 'entrance'
                    | 'pool'
                    | 'couple_table'
                    | 'music'
                    | 'bar'
                    | 'toilet'
            )
            : element.label

    return (
        <div
            role="img"
            aria-label={
                displayLabel ||
                element.type
            }
            title={
                displayLabel ||
                element.type
            }
            className={cn(
                'absolute flex flex-col items-center justify-center overflow-hidden border',
                'select-none text-center shadow-sm',
                'transition-shadow duration-200',
                shapeClass,
                colorClass,

                isEntrance &&
                'border-solid shadow-md ring-2 ring-[hsl(var(--primary))]/10',

                isCoupleTable &&
                'border-solid shadow-md'
            )}
            style={{
                left:
                element.pos_x,

                top:
                element.pos_y,

                width:
                element.width,

                height:
                element.height,
            }}
        >
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
    )
}