import { describe, expect, it } from 'vitest'

import { formatBytes, invertUpdate, normalizeGuestName } from '@/lib/utils'
import type { Photo } from '@/types/database'

describe('normalizeGuestName', () => {
    /*
     * This is the matching function the RSVP API and the public find-seat
     * search both rely on to find "the same guest" despite accents, case,
     * or stray whitespace. Getting it wrong either breaks legitimate
     * lookups (frustrating guests) or makes two different guests collide
     * (the RSVP API's whole ambiguous-guest safety net depends on this
     * being an accurate equality check, not a loose one).
     */
    it('strips accents so guests can be found without typing them', () => {
        expect(normalizeGuestName('Besartë')).toBe(normalizeGuestName('besarte'))
    })

    it('folds case', () => {
        expect(normalizeGuestName('ELIRA KRASNIQI')).toBe(
            normalizeGuestName('elira krasniqi')
        )
    })

    it('collapses repeated internal whitespace', () => {
        expect(normalizeGuestName('Elira   Krasniqi')).toBe(
            normalizeGuestName('Elira Krasniqi')
        )
    })

    it('trims leading/trailing whitespace', () => {
        expect(normalizeGuestName('  Elira Krasniqi  ')).toBe(
            normalizeGuestName('Elira Krasniqi')
        )
    })

    it('does not collapse two genuinely different names to the same value', () => {
        expect(normalizeGuestName('Elira Krasniqi')).not.toBe(
            normalizeGuestName('Elira Krasniqe')
        )
    })
})

describe('formatBytes', () => {
    it('formats zero bytes', () => {
        expect(formatBytes(0)).toBe('0 B')
    })

    it('formats bytes below 1KB without a decimal unit jump', () => {
        expect(formatBytes(512)).toBe('512 B')
    })

    it('formats kilobytes', () => {
        expect(formatBytes(2048)).toBe('2 KB')
    })

    it('formats megabytes with one decimal place', () => {
        expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.5 MB')
    })
})

describe('invertUpdate', () => {
    /*
     * Used to build the "undo" payload for admin photo-moderation actions
     * (approve/hide/favourite). A bug here means an admin's "undo" silently
     * does the wrong thing -- worth locking down explicitly.
     */
    const basePhoto: Photo = {
        id: 'photo-1',
        event_id: 'event-1',
        wedding_id: 'wedding-1',
        uploaded_by_session: 'session-1',
        guest_name: null,
        message: null,
        original_path: 'orig.webp',
        thumbnail_path: 'thumb.webp',
        mime_type: 'image/webp',
        file_size: 100,
        width: 100,
        height: 100,
        approved: true,
        hidden: false,
        favourite: true,
        is_public: true,
        created_at: '2026-01-01T00:00:00.000Z',
    } as Photo

    it('captures only the fields present in the update, from the ORIGINAL values', () => {
        const inverted = invertUpdate(basePhoto, { approved: false })

        expect(inverted).toEqual({ approved: true })
    })

    it('captures multiple fields when multiple are being changed', () => {
        const inverted = invertUpdate(basePhoto, { hidden: true, favourite: false })

        expect(inverted).toEqual({ hidden: false, favourite: true })
    })

    it('returns an empty object when the update touches nothing tracked', () => {
        expect(invertUpdate(basePhoto, {})).toEqual({})
    })
})
