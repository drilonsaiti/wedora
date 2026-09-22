import { beforeEach, describe, expect, it, vi } from 'vitest'

import { generateRsvpApiKey, hashRsvpApiKey, resolveRsvpApiActor, RsvpApiError } from '@/lib/rsvp-auth'
import { createServiceClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
    createServiceClient: vi.fn(),
}))

/*
 * ============================================================
 * MOCK SUPABASE CLIENT
 * ============================================================
 *
 * resolveRsvpApiActor() only ever touches two tables through this shape
 * of call chain (see lib/rsvp-auth.ts):
 *   .from('weddings').select(...).eq('slug', ...).maybeSingle()
 *   .from('wedding_rsvp_api_keys').select(...).eq(...).eq(...).maybeSingle()
 *   .from('wedding_rsvp_api_keys').update(...).eq(...).then(...)  // fire-and-forget
 * This fakes exactly that surface -- not a general Supabase mock.
 */
type MockResult<T> = { data: T | null; error: { message: string } | null }

function makeMockService(options: {
    wedding?: MockResult<{ id: string; slug: string }>
    apiKey?: MockResult<{
        id: string
        wedding_id: string
        key_hash: string
        revoked_at: string | null
    }>
}) {
    const weddingResult = options.wedding ?? { data: null, error: null }
    const apiKeyResult = options.apiKey ?? { data: null, error: null }

    return {
        from(table: string) {
            if (table === 'weddings') {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: async () => weddingResult,
                        }),
                    }),
                }
            }

            if (table === 'wedding_rsvp_api_keys') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                maybeSingle: async () => apiKeyResult,
                            }),
                        }),
                    }),
                    update: () => ({
                        eq: () => ({
                            // resolveRsvpApiActor calls .then(undefined, onError) on
                            // this without awaiting it (best-effort bookkeeping) --
                            // a thenable is enough to satisfy that.
                            then: (
                                onFulfilled?: (v: unknown) => unknown,
                                _onRejected?: (e: unknown) => unknown
                            ) => Promise.resolve(onFulfilled?.(undefined)),
                        }),
                    }),
                }
            }

            throw new Error(`Unexpected table in mock: ${table}`)
        },
    }
}

function mockService(options: Parameters<typeof makeMockService>[0]) {
    vi.mocked(createServiceClient).mockReturnValue(
        makeMockService(options) as unknown as ReturnType<typeof createServiceClient>
    )
}

function requestWith(init: { headers?: Record<string, string>; url?: string }) {
    return new Request(init.url ?? 'https://wedora.test/api/public/rsvp', {
        headers: init.headers ?? {},
    })
}

const WEDDING = { id: 'wedding-1', slug: 'sara-drilon' }

beforeEach(() => {
    vi.clearAllMocks()
})

describe('generateRsvpApiKey / hashRsvpApiKey', () => {
    it('generates a key with the documented wr_live_ prefix', () => {
        const { raw } = generateRsvpApiKey()

        expect(raw.startsWith('wr_live_')).toBe(true)
    })

    it('the returned prefix is exactly what the admin UI shows (first 12 chars)', () => {
        const { raw, prefix } = generateRsvpApiKey()

        expect(prefix).toBe(raw.slice(0, 12))
    })

    it('hashRsvpApiKey is deterministic', () => {
        const { raw } = generateRsvpApiKey()

        expect(hashRsvpApiKey(raw)).toBe(hashRsvpApiKey(raw))
    })

    it('two generated keys never collide (256 bits of entropy)', () => {
        const a = generateRsvpApiKey()
        const b = generateRsvpApiKey()

        expect(a.raw).not.toBe(b.raw)
        expect(a.hash).not.toBe(b.hash)
    })

    it('the hash returned at generation time matches re-hashing the raw key later', () => {
        const { raw, hash } = generateRsvpApiKey()

        expect(hashRsvpApiKey(raw)).toBe(hash)
    })
})

describe('resolveRsvpApiActor', () => {
    it('rejects a missing weddingSlug before ever touching the database', async () => {
        await expect(
            resolveRsvpApiActor(requestWith({}), undefined)
        ).rejects.toMatchObject({ status: 400, code: 'MISSING_WEDDING' })

        expect(createServiceClient).not.toHaveBeenCalled()
    })

    it('rejects a request with no key in any channel', async () => {
        mockService({})

        await expect(
            resolveRsvpApiActor(requestWith({}), WEDDING.slug)
        ).rejects.toMatchObject({ status: 401, code: 'MISSING_API_KEY' })
    })

    it('accepts a valid key via the Authorization: Bearer header', async () => {
        const { raw, prefix, hash } = generateRsvpApiKey()

        mockService({
            wedding: { data: WEDDING, error: null },
            apiKey: {
                data: { id: 'key-1', wedding_id: WEDDING.id, key_hash: hash, revoked_at: null },
                error: null,
            },
        })

        const actor = await resolveRsvpApiActor(
            requestWith({ headers: { authorization: `Bearer ${raw}` } }),
            WEDDING.slug
        )

        expect(actor.apiKeyId).toBe('key-1')
        expect(actor.wedding).toEqual(WEDDING)
        void prefix
    })

    it('accepts a valid key via the X-Api-Key header when there is no Authorization header', async () => {
        const { raw, hash } = generateRsvpApiKey()

        mockService({
            wedding: { data: WEDDING, error: null },
            apiKey: {
                data: { id: 'key-2', wedding_id: WEDDING.id, key_hash: hash, revoked_at: null },
                error: null,
            },
        })

        const actor = await resolveRsvpApiActor(
            requestWith({ headers: { 'x-api-key': raw } }),
            WEDDING.slug
        )

        expect(actor.apiKeyId).toBe('key-2')
    })

    it('accepts a valid key via the ?api_key= query parameter when there is no header at all', async () => {
        const { raw, hash } = generateRsvpApiKey()

        mockService({
            wedding: { data: WEDDING, error: null },
            apiKey: {
                data: { id: 'key-3', wedding_id: WEDDING.id, key_hash: hash, revoked_at: null },
                error: null,
            },
        })

        const actor = await resolveRsvpApiActor(
            requestWith({
                url: `https://wedora.test/api/public/rsvp?weddingSlug=${WEDDING.slug}&api_key=${raw}`,
            }),
            WEDDING.slug
        )

        expect(actor.apiKeyId).toBe('key-3')
    })

    it('prefers the Authorization header over X-Api-Key when both are present', async () => {
        const good = generateRsvpApiKey()
        const bad = generateRsvpApiKey()

        mockService({
            wedding: { data: WEDDING, error: null },
            apiKey: {
                data: {
                    id: 'key-good',
                    wedding_id: WEDDING.id,
                    key_hash: good.hash,
                    revoked_at: null,
                },
                error: null,
            },
        })

        // Only the Bearer key's hash is in the mocked DB row, so this only
        // resolves successfully if Authorization is the one actually used.
        const actor = await resolveRsvpApiActor(
            requestWith({
                headers: {
                    authorization: `Bearer ${good.raw}`,
                    'x-api-key': bad.raw,
                },
            }),
            WEDDING.slug
        )

        expect(actor.apiKeyId).toBe('key-good')
    })

    it('rejects an unknown wedding slug with 404, not a database error', async () => {
        const { raw } = generateRsvpApiKey()

        mockService({ wedding: { data: null, error: null } })

        await expect(
            resolveRsvpApiActor(
                requestWith({ headers: { authorization: `Bearer ${raw}` } }),
                'no-such-wedding'
            )
        ).rejects.toMatchObject({ status: 404, code: 'WEDDING_NOT_FOUND' })
    })

    it('rejects a well-formed but wrong key with 401 INVALID_API_KEY', async () => {
        const wrong = generateRsvpApiKey()
        const real = generateRsvpApiKey()

        mockService({
            wedding: { data: WEDDING, error: null },
            // The DB row's hash belongs to a *different* key than the one
            // presented -- simulates "right shape, wrong secret".
            apiKey: {
                data: { id: 'key-1', wedding_id: WEDDING.id, key_hash: real.hash, revoked_at: null },
                error: null,
            },
        })

        await expect(
            resolveRsvpApiActor(
                requestWith({ headers: { authorization: `Bearer ${wrong.raw}` } }),
                WEDDING.slug
            )
        ).rejects.toMatchObject({ status: 401, code: 'INVALID_API_KEY' })
    })

    it('rejects a revoked key even when the hash still matches', async () => {
        const { raw, hash } = generateRsvpApiKey()

        mockService({
            wedding: { data: WEDDING, error: null },
            apiKey: {
                data: {
                    id: 'key-1',
                    wedding_id: WEDDING.id,
                    key_hash: hash,
                    revoked_at: '2026-01-01T00:00:00.000Z',
                },
                error: null,
            },
        })

        await expect(
            resolveRsvpApiActor(
                requestWith({ headers: { authorization: `Bearer ${raw}` } }),
                WEDDING.slug
            )
        ).rejects.toMatchObject({ status: 401, code: 'INVALID_API_KEY' })
    })

    it('rejects a key that does not belong to the requested wedding', async () => {
        const { raw } = generateRsvpApiKey()

        mockService({
            wedding: { data: WEDDING, error: null },
            // The lookup is scoped by wedding_id + key_prefix in the real
            // query, so a key issued for a different wedding simply never
            // matches a row -- modeled here as "no row found".
            apiKey: { data: null, error: null },
        })

        await expect(
            resolveRsvpApiActor(
                requestWith({ headers: { authorization: `Bearer ${raw}` } }),
                WEDDING.slug
            )
        ).rejects.toMatchObject({ status: 401, code: 'INVALID_API_KEY' })
    })

    it('surfaces a wedding lookup failure as 500, not a silent pass-through', async () => {
        const { raw } = generateRsvpApiKey()

        mockService({
            wedding: { data: null, error: { message: 'connection reset' } },
        })

        await expect(
            resolveRsvpApiActor(
                requestWith({ headers: { authorization: `Bearer ${raw}` } }),
                WEDDING.slug
            )
        ).rejects.toMatchObject({ status: 500, code: 'WEDDING_LOOKUP_FAILED' })
    })
})

describe('RsvpApiError', () => {
    it('carries the HTTP status and error code given to it', () => {
        const error = new RsvpApiError(429, 'RATE_LIMITED', 'slow down', 12)

        expect(error).toBeInstanceOf(Error)
        expect(error.status).toBe(429)
        expect(error.code).toBe('RATE_LIMITED')
        expect(error.retryAfterSeconds).toBe(12)
    })
})
