import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"
import {Photo} from "@/types/database";
import {TableShape} from "@/types/seating";


export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function generateSessionId(): string {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return ''
    const key = 'wp_session'
    let id = sessionStorage.getItem(key)
    if (!id) {
        id = generateSessionId()
        sessionStorage.setItem(key, id)
    }
    return id
}

export function formatDate(dateStr: string, locale: string = 'en-US'): string {
    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(dateStr))
}

export function invertUpdate(
    original: Photo,
    update: { approved?: boolean; hidden?: boolean; favourite?: boolean }
) {
    const inverted: typeof update = {}
    if ('approved' in update) inverted.approved = original.approved
    if ('hidden' in update) inverted.hidden = original.hidden
    if ('favourite' in update) inverted.favourite = original.favourite
    return inverted
}


/*
 * Shared guest-name normalizer.
 *
 * Lets guests (and external RSVP integrations) be found without typing
 * accents exactly, e.g. "Besartë" also matches "besarte". Mirrors the
 * normalizeText() helpers already used in find-seat-client.tsx and
 * home-search.tsx.
 */
export function normalizeGuestName(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim()
        .toLocaleLowerCase()
        .replace(/\s+/g, ' ')
}

const SHAPE_ICON_CLASSES: Record<TableShape, string> = {
    round: 'rounded-full',
    square: 'rounded-2xl',
    rectangle: 'rounded-2xl w-28 h-16',
};