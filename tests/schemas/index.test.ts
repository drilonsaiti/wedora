import { describe, expect, it } from 'vitest'

import {
    createWeddingSchema,
    editWeddingSchema,
    rsvpManualUpdateSchema,
    rsvpUpdateSchema,
} from '@/schemas'

const validWeddingBase = {
    groom_name: 'Drilon',
    bride_name: 'Sara',
    groom_email: 'drilon@example.com',
    bride_email: 'sara@example.com',
    slug: 'sara-drilon',
    wedding_date: '2026-08-15',
    theme_hue: 340,
    enable_find_seat: true,
    enable_photo_upload: true,
    auto_approve_uploads: false,
    photo_retention_days: 90,
}

describe('createWeddingSchema', () => {
    it('accepts a fully valid wedding', () => {
        expect(createWeddingSchema.safeParse(validWeddingBase).success).toBe(true)
    })

    it('rejects a slug with uppercase letters (must match the public URL format)', () => {
        const result = createWeddingSchema.safeParse({
            ...validWeddingBase,
            slug: 'Sara-Drilon',
        })

        expect(result.success).toBe(false)
    })

    it('rejects a slug with spaces', () => {
        const result = createWeddingSchema.safeParse({
            ...validWeddingBase,
            slug: 'sara drilon',
        })

        expect(result.success).toBe(false)
    })

    it('rejects when both enable_find_seat and enable_photo_upload are off', () => {
        /*
         * A wedding with neither guest feature enabled would have no
         * public functionality at all -- this refine exists specifically
         * to stop that from being saved by accident.
         */
        const result = createWeddingSchema.safeParse({
            ...validWeddingBase,
            enable_find_seat: false,
            enable_photo_upload: false,
        })

        expect(result.success).toBe(false)
    })

    it('accepts when only one of the two guest features is enabled', () => {
        const result = createWeddingSchema.safeParse({
            ...validWeddingBase,
            enable_find_seat: false,
            enable_photo_upload: true,
        })

        expect(result.success).toBe(true)
    })

    it('defaults auto_approve_uploads to false when omitted, matching the always-moderated default', () => {
        const { auto_approve_uploads: _omit, ...withoutAutoApprove } = validWeddingBase

        const result = createWeddingSchema.safeParse(withoutAutoApprove)

        expect(result.success).toBe(true)

        if (result.success) {
            expect(result.data.auto_approve_uploads).toBe(false)
        }
    })

    it('rejects a theme hue outside the 0-360 range', () => {
        const result = createWeddingSchema.safeParse({
            ...validWeddingBase,
            theme_hue: 400,
        })

        expect(result.success).toBe(false)
    })
})

describe('editWeddingSchema', () => {
    const validEdit = {
        groom_name: 'Drilon',
        bride_name: 'Sara',
        groom_email: 'drilon@example.com',
        bride_email: '',
        wedding_date: '2026-08-15',
        theme_hue: 340,
        enable_find_seat: true,
        enable_photo_upload: true,
        auto_approve_uploads: false,
    }

    it('accepts a valid edit', () => {
        expect(editWeddingSchema.safeParse(validEdit).success).toBe(true)
    })

    it('requires auto_approve_uploads to be present (not optional on edit)', () => {
        const { auto_approve_uploads: _omit, ...withoutIt } = validEdit

        expect(editWeddingSchema.safeParse(withoutIt).success).toBe(false)
    })

    it('still enforces at-least-one-guest-feature on edit', () => {
        const result = editWeddingSchema.safeParse({
            ...validEdit,
            enable_find_seat: false,
            enable_photo_upload: false,
        })

        expect(result.success).toBe(false)
    })
})

describe('rsvpUpdateSchema (external RSVP API)', () => {
    const validUpdate = {
        weddingSlug: 'sara-drilon',
        firstName: 'Elira',
        lastName: 'Krasniqi',
        status: 'confirmed',
    }

    it('accepts a minimal valid update', () => {
        expect(rsvpUpdateSchema.safeParse(validUpdate).success).toBe(true)
    })

    it('rejects an invalid status value', () => {
        const result = rsvpUpdateSchema.safeParse({
            ...validUpdate,
            status: 'maybe',
        })

        expect(result.success).toBe(false)
    })

    it('accepts the three real statuses', () => {
        for (const status of ['pending', 'confirmed', 'declined']) {
            expect(
                rsvpUpdateSchema.safeParse({ ...validUpdate, status }).success
            ).toBe(true)
        }
    })

    it('rejects a negative party size', () => {
        const result = rsvpUpdateSchema.safeParse({
            ...validUpdate,
            partySize: -1,
        })

        expect(result.success).toBe(false)
    })

    it('rejects a party size above the 50 cap', () => {
        const result = rsvpUpdateSchema.safeParse({
            ...validUpdate,
            partySize: 51,
        })

        expect(result.success).toBe(false)
    })

    it('treats an empty-string party size as "not provided" rather than a parse error', () => {
        // The public API is meant to be easy to call from simple no-code
        // tools, which often send "" instead of omitting a field.
        const result = rsvpUpdateSchema.safeParse({
            ...validUpdate,
            partySize: '',
        })

        expect(result.success).toBe(true)
    })

    it('rejects a note over 500 characters', () => {
        const result = rsvpUpdateSchema.safeParse({
            ...validUpdate,
            note: 'x'.repeat(501),
        })

        expect(result.success).toBe(false)
    })

    it('rejects a missing weddingSlug', () => {
        const { weddingSlug: _omit, ...withoutSlug } = validUpdate

        expect(rsvpUpdateSchema.safeParse(withoutSlug).success).toBe(false)
    })

    it('rejects an empty first name', () => {
        const result = rsvpUpdateSchema.safeParse({ ...validUpdate, firstName: '' })

        expect(result.success).toBe(false)
    })
})

describe('rsvpManualUpdateSchema (admin manual override)', () => {
    it('requires guestId to be a UUID, not an arbitrary string', () => {
        const result = rsvpManualUpdateSchema.safeParse({
            guestId: 'not-a-uuid',
            status: 'confirmed',
        })

        expect(result.success).toBe(false)
    })

    it('accepts a valid UUID guestId', () => {
        const result = rsvpManualUpdateSchema.safeParse({
            guestId: '5b6d2e2e-1234-4567-8901-abcdefabcdef',
            status: 'confirmed',
        })

        expect(result.success).toBe(true)
    })
})
