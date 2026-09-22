import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
    buildEmailRateLimitKey,
    buildIpRateLimitKey,
    extractClientIp,
    getLoginRateLimitSecret,
    hashLoginRateLimitKey,
    normalizeLoginEmail,
} from '@/lib/login-rate-limit'

describe('normalizeLoginEmail', () => {
    it('lowercases and trims', () => {
        expect(normalizeLoginEmail('  Sara@Example.com ')).toBe('sara@example.com')
    })
})

describe('hashLoginRateLimitKey', () => {
    it('is deterministic for the same value and secret', () => {
        expect(hashLoginRateLimitKey('login:admin:email:a@b.com', 'secret')).toBe(
            hashLoginRateLimitKey('login:admin:email:a@b.com', 'secret')
        )
    })

    it('differs when the secret differs (not just a plain hash of the value)', () => {
        expect(hashLoginRateLimitKey('same-value', 'secret-a')).not.toBe(
            hashLoginRateLimitKey('same-value', 'secret-b')
        )
    })

    it('differs when the value differs', () => {
        expect(hashLoginRateLimitKey('value-a', 'secret')).not.toBe(
            hashLoginRateLimitKey('value-b', 'secret')
        )
    })
})

describe('buildEmailRateLimitKey', () => {
    const secret = 'test-secret'

    it('is case/whitespace-insensitive on the email (same account, same bucket)', () => {
        expect(buildEmailRateLimitKey('admin', 'Sara@Example.com', secret)).toBe(
            buildEmailRateLimitKey('admin', ' sara@example.com ', secret)
        )
    })

    it('keeps the admin and couple buckets separate for the same email', () => {
        expect(buildEmailRateLimitKey('admin', 'sara@example.com', secret)).not.toBe(
            buildEmailRateLimitKey('couple', 'sara@example.com', secret)
        )
    })

    it('keeps different emails in different buckets', () => {
        expect(buildEmailRateLimitKey('admin', 'sara@example.com', secret)).not.toBe(
            buildEmailRateLimitKey('admin', 'drilon@example.com', secret)
        )
    })
})

describe('buildIpRateLimitKey', () => {
    const secret = 'test-secret'

    it('keeps the admin and couple IP buckets separate', () => {
        expect(buildIpRateLimitKey('admin', '1.2.3.4', secret)).not.toBe(
            buildIpRateLimitKey('couple', '1.2.3.4', secret)
        )
    })

    it('keeps different IPs in different buckets', () => {
        expect(buildIpRateLimitKey('admin', '1.2.3.4', secret)).not.toBe(
            buildIpRateLimitKey('admin', '5.6.7.8', secret)
        )
    })
})

function makeHeaders(values: Record<string, string>) {
    const lower = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key.toLowerCase(), value])
    )

    return {
        get: (name: string) => lower[name.toLowerCase()] ?? null,
    }
}

describe('extractClientIp', () => {
    it('returns null when no relevant header is present', () => {
        expect(extractClientIp(makeHeaders({}))).toBeNull()
    })

    it('prefers cf-connecting-ip over everything else', () => {
        const headers = makeHeaders({
            'cf-connecting-ip': '1.1.1.1',
            'x-real-ip': '2.2.2.2',
            'x-forwarded-for': '3.3.3.3',
        })

        expect(extractClientIp(headers)).toBe('1.1.1.1')
    })

    it('falls back to x-real-ip when cf-connecting-ip is absent', () => {
        const headers = makeHeaders({
            'x-real-ip': '2.2.2.2',
            'x-forwarded-for': '3.3.3.3',
        })

        expect(extractClientIp(headers)).toBe('2.2.2.2')
    })

    it('falls back to the first x-forwarded-for entry, trimmed, when nothing else is present', () => {
        const headers = makeHeaders({
            'x-forwarded-for': ' 3.3.3.3 , 9.9.9.9',
        })

        expect(extractClientIp(headers)).toBe('3.3.3.3')
    })
})

describe('getLoginRateLimitSecret', () => {
    const originalLoginSecret = process.env.LOGIN_RATE_LIMIT_SECRET
    const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    beforeEach(() => {
        delete process.env.LOGIN_RATE_LIMIT_SECRET
        delete process.env.SUPABASE_SERVICE_ROLE_KEY
    })

    afterEach(() => {
        if (originalLoginSecret === undefined) {
            delete process.env.LOGIN_RATE_LIMIT_SECRET
        } else {
            process.env.LOGIN_RATE_LIMIT_SECRET = originalLoginSecret
        }

        if (originalServiceRoleKey === undefined) {
            delete process.env.SUPABASE_SERVICE_ROLE_KEY
        } else {
            process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey
        }
    })

    it('throws when neither env var is set', () => {
        expect(() => getLoginRateLimitSecret()).toThrow('Missing LOGIN_RATE_LIMIT_SECRET')
    })

    it('prefers LOGIN_RATE_LIMIT_SECRET over SUPABASE_SERVICE_ROLE_KEY when both are set', () => {
        process.env.LOGIN_RATE_LIMIT_SECRET = 'dedicated-secret'
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'

        expect(getLoginRateLimitSecret()).toBe('dedicated-secret')
    })

    it('falls back to SUPABASE_SERVICE_ROLE_KEY when no dedicated secret is set', () => {
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'

        expect(getLoginRateLimitSecret()).toBe('service-role-key')
    })
})