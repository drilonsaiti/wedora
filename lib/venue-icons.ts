import {
    Bath,
    Cake,
    Camera,
    Car,
    DoorOpen,
    Flame,
    Flower2,
    Gift,
    Heart,
    MapPin,
    Mic2,
    Music,
    Sparkles,
    Star,
    TreePine,
    Umbrella,
    Utensils,
    Waves,
    Wine,
} from 'lucide-react'

/*
 * ============================================
 * VENUE ICONS
 * ============================================
 */
export const VENUE_ICONS = {
    Waves,
    Music,
    Wine,
    DoorOpen,
    Bath,
    Heart,
    Camera,
    Cake,
    Gift,
    Car,
    Utensils,
    Mic2,
    Flower2,
    Star,
    Sparkles,
    Flame,
    Umbrella,
    TreePine,
    MapPin,
} as const

export type VenueIconKey =
    keyof typeof VENUE_ICONS

/*
 * ============================================
 * VENUE COLORS
 *
 * These intentionally remain distinguishable
 * because the seating designer benefits from
 * visual categories.
 *
 * Colors are softer than before so the public
 * venue map still fits the Wedora aesthetic.
 * ============================================
 */
export const VENUE_COLORS = {
    blue:
        'border-sky-400/45 bg-sky-50/75 text-sky-700 dark:border-sky-400/25 dark:bg-sky-950/30 dark:text-sky-300',

    rose:
        'border-rose-400/45 bg-rose-50/75 text-rose-700 dark:border-rose-400/25 dark:bg-rose-950/30 dark:text-rose-300',

    purple:
        'border-violet-400/45 bg-violet-50/75 text-violet-700 dark:border-violet-400/25 dark:bg-violet-950/30 dark:text-violet-300',

    amber:
        'border-amber-400/45 bg-amber-50/75 text-amber-700 dark:border-amber-400/25 dark:bg-amber-950/30 dark:text-amber-300',

    gray:
        'border-border bg-secondary/65 text-muted-foreground',

    green:
        'border-emerald-400/45 bg-emerald-50/75 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-950/30 dark:text-emerald-300',

    teal:
        'border-teal-400/45 bg-teal-50/75 text-teal-700 dark:border-teal-400/25 dark:bg-teal-950/30 dark:text-teal-300',

    pink:
        'border-pink-400/45 bg-pink-50/75 text-pink-700 dark:border-pink-400/25 dark:bg-pink-950/30 dark:text-pink-300',
} as const

export type VenueColorKey =
    keyof typeof VENUE_COLORS

export type VenuePreset = {
    type: string
    label: string
    icon: VenueIconKey
    shape:
        | 'circle'
        | 'square'
        | 'rectangle'
    color: VenueColorKey
}

/*
 * ============================================
 * DEFAULT VENUE PRESETS
 *
 * These are defaults used when creating
 * elements. Custom labels can still be edited
 * by the admin afterwards.
 * ============================================
 */
export const VENUE_PRESETS: VenuePreset[] =
    [
        {
            type: 'entrance',
            label: 'Entrance',
            icon: 'DoorOpen',
            shape: 'square',
            color: 'green',
        },

        {
            type: 'pool',
            label: 'Pool',
            icon: 'Waves',
            shape: 'rectangle',
            color: 'blue',
        },

        {
            type: 'couple_table',
            label: 'Couple',
            icon: 'Heart',
            shape: 'rectangle',
            color: 'rose',
        },

        {
            type: 'music',
            label: 'Music',
            icon: 'Music',
            shape: 'rectangle',
            color: 'purple',
        },

        {
            type: 'bar',
            label: 'Bar',
            icon: 'Wine',
            shape: 'rectangle',
            color: 'amber',
        },

        {
            type: 'toilet',
            label: 'Restroom',
            icon: 'Bath',
            shape: 'square',
            color: 'gray',
        },
    ]