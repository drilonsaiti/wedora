import { describe, expect, it } from 'vitest'

/*
 * next.config.js reads process.env.NODE_ENV once, at require time, to
 * decide between the strict production script-src and the permissive dev
 * one (dev needs 'unsafe-inline'/'unsafe-eval' for Turbopack/HMR's own
 * bootstrap scripts -- see next.config.js for why). To test both branches
 * we have to force NODE_ENV and re-require a fresh, uncached copy of the
 * config for each one, since a single `require` at the top of this file
 * would only ever see whatever NODE_ENV Vitest itself happens to run
 * under.
 */
const configPath = require.resolve('../../next.config.js')

function loadConfig(env: 'production' | 'development') {
    // Next.js's own type declarations mark process.env.NODE_ENV readonly
    // (it's meant to be set once by the runtime, not mutated by app code);
    // this cast is the test-only exception to that, since here we're
    // deliberately simulating "what did next build vs. next dev see".
    const mutableEnv = process.env as { NODE_ENV: string }
    const originalEnv = mutableEnv.NODE_ENV

    mutableEnv.NODE_ENV = env
    delete require.cache[configPath]

    try {
        return require(configPath)
    } finally {
        mutableEnv.NODE_ENV = originalEnv
    }
}

async function getCsp(env: 'production' | 'development'): Promise<string> {
    const config = loadConfig(env)
    const headerGroups = await config.headers()
    const globalGroup = headerGroups.find(
        (group: { source: string }) => group.source === '/:path*'
    )

    const cspHeader = globalGroup?.headers.find(
        (header: { key: string }) => header.key === 'Content-Security-Policy'
    )

    expect(cspHeader).toBeDefined()

    return cspHeader.value as string
}

/*
 * These pin down exactly the security properties that make the production
 * CSP worth having, so a well-meaning future edit (e.g. "just add
 * 'unsafe-inline' to fix this one weird script error") gets caught here
 * instead of silently reopening the gap this header exists to close. See
 * next.config.js for the reasoning behind each directive.
 */
describe('Content-Security-Policy header (production)', () => {
    it('is present on every route', async () => {
        const csp = await getCsp('production')

        expect(csp.length).toBeGreaterThan(0)
    })

    it('script-src does not allow unsafe-inline or unsafe-eval', async () => {
        const csp = await getCsp('production')
        const scriptSrc = csp.match(/script-src ([^;]+)/)?.[1] ?? ''

        expect(scriptSrc).not.toContain('unsafe-inline')
        expect(scriptSrc).not.toContain('unsafe-eval')
    })

    it('script-src allowlists the next-themes flash-prevention script by hash', async () => {
        const csp = await getCsp('production')
        const scriptSrc = csp.match(/script-src ([^;]+)/)?.[1] ?? ''

        expect(scriptSrc).toMatch(/'sha256-[A-Za-z0-9+/]+=*'/)
    })

    it('blocks plugin content entirely (object-src none)', async () => {
        const csp = await getCsp('production')

        expect(csp).toContain("object-src 'none'")
    })

    it('blocks this site from being framed by another origin', async () => {
        const csp = await getCsp('production')

        expect(csp).toContain("frame-ancestors 'none'")
    })

    it('restricts form submissions to this origin', async () => {
        const csp = await getCsp('production')

        expect(csp).toContain("form-action 'self'")
    })

    it('allows the Supabase storage host for photo images, not an open wildcard', async () => {
        const csp = await getCsp('production')
        const imgSrc = csp.match(/img-src ([^;]+)/)?.[1] ?? ''

        expect(imgSrc).toContain('https://*.supabase.co')
        expect(imgSrc).not.toMatch(/img-src[^;]*\*(?!\.supabase)/)
    })

    it('does not open a websocket allowance meant only for local HMR', async () => {
        const csp = await getCsp('production')
        const connectSrc = csp.match(/connect-src ([^;]+)/)?.[1] ?? ''

        expect(connectSrc).not.toContain('ws://')
        expect(connectSrc).not.toContain('localhost')
    })
})

/*
 * `next dev` (Turbopack) injects its own inline bootstrap scripts for HMR,
 * the error overlay and debug-channel setup that don't exist in a
 * production build and can't be hash-pinned (their content isn't stable
 * across builds). These tests make sure dev stays usable rather than
 * pinning dev to the same strict policy production gets.
 */
describe('Content-Security-Policy header (development)', () => {
    it('script-src allows what Turbopack/HMR needs to bootstrap', async () => {
        const csp = await getCsp('development')
        const scriptSrc = csp.match(/script-src ([^;]+)/)?.[1] ?? ''

        expect(scriptSrc).toContain('unsafe-inline')
        expect(scriptSrc).toContain('unsafe-eval')
    })

    it('connect-src allows the local HMR websocket', async () => {
        const csp = await getCsp('development')
        const connectSrc = csp.match(/connect-src ([^;]+)/)?.[1] ?? ''

        expect(connectSrc).toContain('ws://localhost:*')
    })
})