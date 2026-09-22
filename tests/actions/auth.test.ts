import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
    createServiceClient: vi.fn(),
}))

vi.mock('next/headers', () => ({
    headers: vi.fn(),
}))

import { loginAdmin, loginCouple } from '@/actions/auth'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

/*
 * ============================================================
 * MOCK SUPABASE CLIENTS
 * ============================================================
 *
 * actions/auth.ts touches two different Supabase clients (see
 * lib/supabase/server.ts): createServiceClient() for the rate-limit RPC
 * and the admins-table lookup, and createClient() (cookie-bound) for the
 * actual supabase.auth.signInWithPassword()/signOut() calls. These fake
 * exactly that surface, matching tests/lib/rsvp-auth.test.ts's approach.
 */

type RpcResult = { data: unknown; error: { message: string } | null }

function makeServiceClient(options: {
    rpcResults?: RpcResult[]
    admin?: { data: { id: string } | null; error: { message: string } | null }
}) {
    const rpcQueue = [...(options.rpcResults ?? [])]

    return {
        rpc: vi.fn(async () => rpcQueue.shift() ?? { data: 0, error: null }),
        from: (table: string) => {
            if (table === 'admins') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: async () =>
                                options.admin ?? { data: null, error: null },
                        }),
                    }),
                }
            }

            throw new Error(`Unexpected table in mock: ${table}`)
        },
    }
}

type MockUser = { id: string; app_metadata: Record<string, unknown> }

function makeAuthClient(options: {
    signIn?: {
        data: { user: MockUser | null }
        error: { message: string } | null
    }
}) {
    return {
        auth: {
            signInWithPassword: vi.fn(
                async () =>
                    options.signIn ?? {
                        data: { user: null },
                        error: { message: 'Invalid login credentials' },
                    }
            ),
            signOut: vi.fn(async () => ({ error: null })),
        },
    }
}

function makeHeaders(values: Record<string, string> = {}) {
    return {
        get: (name: string) => values[name.toLowerCase()] ?? null,
    }
}

const ADMIN_USER: MockUser = { id: 'admin-1', app_metadata: {} }
const COUPLE_USER: MockUser = {
    id: 'couple-1',
    app_metadata: { role: 'couple', wedding_id: 'wedding-1' },
}
const OTHER_USER: MockUser = { id: 'user-2', app_metadata: {} }

const originalSecret = process.env.LOGIN_RATE_LIMIT_SECRET

beforeEach(() => {
    vi.clearAllMocks()
    process.env.LOGIN_RATE_LIMIT_SECRET = 'test-secret-do-not-use-in-prod'
    vi.mocked(headers).mockResolvedValue(
        makeHeaders() as unknown as Awaited<ReturnType<typeof headers>>
    )
})

afterEach(() => {
    if (originalSecret === undefined) {
        delete process.env.LOGIN_RATE_LIMIT_SECRET
    } else {
        process.env.LOGIN_RATE_LIMIT_SECRET = originalSecret
    }
})

describe('loginAdmin', () => {
    it('signs in and succeeds for a known admin', async () => {
        vi.mocked(createServiceClient).mockReturnValue(
            makeServiceClient({
                rpcResults: [
                    { data: 0, error: null },
                    { data: 0, error: null },
                ],
                admin: { data: { id: ADMIN_USER.id }, error: null },
            }) as unknown as ReturnType<typeof createServiceClient>
        )
        vi.mocked(createClient).mockResolvedValue(
            makeAuthClient({
                signIn: { data: { user: ADMIN_USER }, error: null },
            }) as unknown as Awaited<ReturnType<typeof createClient>>
        )

        const result = await loginAdmin('admin@example.com', 'correct-password')

        expect(result).toEqual({ success: true })
    })

    it('rejects wrong credentials without ever checking the admins table', async () => {
        vi.mocked(createServiceClient).mockReturnValue(
            makeServiceClient({
                rpcResults: [
                    { data: 0, error: null },
                    { data: 0, error: null },
                ],
            }) as unknown as ReturnType<typeof createServiceClient>
        )
        vi.mocked(createClient).mockResolvedValue(
            makeAuthClient({}) as unknown as Awaited<ReturnType<typeof createClient>>
        )

        const result = await loginAdmin('admin@example.com', 'wrong-password')

        expect(result).toEqual({ success: false, code: 'INVALID_CREDENTIALS' })
    })

    it('denies and signs out a valid Supabase login that is not in the admins table', async () => {
        vi.mocked(createServiceClient).mockReturnValue(
            makeServiceClient({
                rpcResults: [
                    { data: 0, error: null },
                    { data: 0, error: null },
                ],
                admin: { data: null, error: null },
            }) as unknown as ReturnType<typeof createServiceClient>
        )
        const authClient = makeAuthClient({
            signIn: { data: { user: OTHER_USER }, error: null },
        })
        vi.mocked(createClient).mockResolvedValue(
            authClient as unknown as Awaited<ReturnType<typeof createClient>>
        )

        const result = await loginAdmin('someone@example.com', 'correct-password')

        expect(result).toEqual({ success: false, code: 'ACCESS_DENIED' })
        expect(authClient.auth.signOut).toHaveBeenCalled()
    })

    it('blocks the attempt before ever touching Supabase Auth once the email bucket is exhausted', async () => {
        const service = makeServiceClient({
            rpcResults: [{ data: 42, error: null }],
        })
        vi.mocked(createServiceClient).mockReturnValue(
            service as unknown as ReturnType<typeof createServiceClient>
        )
        const authClient = makeAuthClient({})
        vi.mocked(createClient).mockResolvedValue(
            authClient as unknown as Awaited<ReturnType<typeof createClient>>
        )

        const result = await loginAdmin('locked-out@example.com', 'whatever')

        expect(result).toEqual({
            success: false,
            code: 'RATE_LIMITED',
            retryAfterSeconds: 42,
        })
        expect(authClient.auth.signInWithPassword).not.toHaveBeenCalled()
        // Exactly one RPC call: the email bucket blocked it, so the IP
        // bucket is never even consulted.
        expect(service.rpc).toHaveBeenCalledTimes(1)
    })

    it('fails closed (denies) when the rate-limit RPC itself errors, rather than letting the attempt through', async () => {
        const service = makeServiceClient({
            rpcResults: [{ data: null, error: { message: 'connection reset' } }],
        })
        vi.mocked(createServiceClient).mockReturnValue(
            service as unknown as ReturnType<typeof createServiceClient>
        )
        const authClient = makeAuthClient({})
        vi.mocked(createClient).mockResolvedValue(
            authClient as unknown as Awaited<ReturnType<typeof createClient>>
        )

        const result = await loginAdmin('someone@example.com', 'whatever')

        expect(result).toEqual({ success: false, code: 'UNKNOWN' })
        expect(authClient.auth.signInWithPassword).not.toHaveBeenCalled()
    })
})

describe('loginCouple', () => {
    it('signs in and returns the weddingId for a valid couple account', async () => {
        vi.mocked(createServiceClient).mockReturnValue(
            makeServiceClient({
                rpcResults: [
                    { data: 0, error: null },
                    { data: 0, error: null },
                ],
            }) as unknown as ReturnType<typeof createServiceClient>
        )
        vi.mocked(createClient).mockResolvedValue(
            makeAuthClient({
                signIn: { data: { user: COUPLE_USER }, error: null },
            }) as unknown as Awaited<ReturnType<typeof createClient>>
        )

        const result = await loginCouple('couple@example.com', 'correct-password')

        expect(result).toEqual({ success: true, weddingId: 'wedding-1' })
    })

    it('denies and signs out an authenticated user with no couple role/wedding_id', async () => {
        vi.mocked(createServiceClient).mockReturnValue(
            makeServiceClient({
                rpcResults: [
                    { data: 0, error: null },
                    { data: 0, error: null },
                ],
            }) as unknown as ReturnType<typeof createServiceClient>
        )
        const authClient = makeAuthClient({
            signIn: { data: { user: OTHER_USER }, error: null },
        })
        vi.mocked(createClient).mockResolvedValue(
            authClient as unknown as Awaited<ReturnType<typeof createClient>>
        )

        const result = await loginCouple('someone@example.com', 'correct-password')

        expect(result).toEqual({ success: false, code: 'ACCESS_DENIED' })
        expect(authClient.auth.signOut).toHaveBeenCalled()
    })

    it('is also rate-limited, independently of the admin login bucket', async () => {
        const service = makeServiceClient({
            rpcResults: [{ data: 7, error: null }],
        })
        vi.mocked(createServiceClient).mockReturnValue(
            service as unknown as ReturnType<typeof createServiceClient>
        )
        const authClient = makeAuthClient({})
        vi.mocked(createClient).mockResolvedValue(
            authClient as unknown as Awaited<ReturnType<typeof createClient>>
        )

        const result = await loginCouple('locked-out@example.com', 'whatever')

        expect(result).toEqual({
            success: false,
            code: 'RATE_LIMITED',
            retryAfterSeconds: 7,
        })
        expect(authClient.auth.signInWithPassword).not.toHaveBeenCalled()
    })
})