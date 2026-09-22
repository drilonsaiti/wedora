const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

const isDev = process.env.NODE_ENV !== 'production'

/*
 * ============================================================
 * CONTENT SECURITY POLICY
 * ============================================================
 *
 * This is deliberately production-only. `next dev` (with Turbopack)
 * injects its own internal inline scripts for HMR, the error overlay and
 * debug-channel bootstrapping (see debug-channel.ts / forward-logs-shared.ts
 * in dev builds) that don't exist in a production build and whose content
 * isn't stable -- it can embed per-build IDs, so it can't be hash-pinned
 * the way the app's own single static script can. Enforcing the strict
 * script-src in dev breaks Next's own dev tooling (HMR "Invariant:
 * Expected a request ID..." errors are exactly that: dev-mode bootstrap
 * scripts getting blocked, not a bug in this app). Production only ever
 * serves the one static next-themes script, so the strict policy is both
 * correct and safe there.
 *
 * script-src has no 'unsafe-inline' in production: the ONLY inline script
 * this app renders is the one next-themes injects to prevent a theme
 * flash before hydration (see contexts/theme-provider.tsx). Its content
 * is static -- it's built entirely from ThemeProvider's compile-time props
 * (app/[locale]/layout.tsx: attribute="class" defaultTheme="system"
 * enableSystem), never from per-request data -- so it's the same string
 * on every render, which means it can be allowlisted by its SHA-256 hash
 * instead of needing a per-request nonce (which would need plumbing
 * through middleware + every layout, for one static script).
 *
 * If you ever change those ThemeProvider props (or upgrade next-themes to
 * a version that changes the script it generates), this hash will stop
 * matching and the theme-flash-prevention script will simply be blocked
 * (silent, minor UX regression -- a flash of the wrong theme on load, not
 * a broken app).
 *
 * Regenerating it: an isolated renderToStaticMarkup() of just the
 * ThemeProvider is NOT reliable -- it byte-mismatched what a real
 * `next build` actually serves, caught immediately by the browser's own
 * CSP violation error, which prints the exact hash it needed. The safe
 * way to regenerate:
 *   1. Run a real production build (`next build && next start`), not
 *      `next dev` -- dev mode's extra inline scripts make its CSP
 *      violations useless signal for this hash.
 *   2. Open devtools console -- if the hash here is stale you'll see a
 *      CSP violation naming the correct 'sha256-...' value directly for
 *      the next-themes script specifically. If you're regenerating
 *      proactively with no violation to read, inspect the actual inline
 *      <script> in the rendered page and hash its exact text content
 *      instead of re-deriving it from an isolated component render.
 *   3. Put that value back here and re-enable the strict script-src.
 *
 * style-src keeps 'unsafe-inline' in both dev and production: two layouts
 * (app/[locale]/[slug]/layout.tsx and app/[locale]/demo/layout.tsx) render
 * a per-wedding/per-demo <style> tag with dynamically computed CSS custom
 * properties (the wedding's theme color). That content is genuinely
 * dynamic per request, so it can't be hash-allowlisted the way the theme
 * script can; a nonce would work but needs the same per-request
 * middleware plumbing this app doesn't otherwise need. Inline styles are
 * a much lower-severity CSP gap than inline scripts (no way to exfiltrate
 * data or run arbitrary logic through them), so 'unsafe-inline' here is a
 * deliberate, scoped trade-off, not an oversight.
 */
const THEME_SCRIPT_HASH = "'sha256-QAlSewaQLi/NPCznjAZSyvQ72heD0VdxmNDDkZeCxgc='"

const contentSecurityPolicy = [
    "default-src 'self'",
    // Dev needs 'unsafe-eval' and 'unsafe-inline' for Turbopack/HMR's own
    // bootstrap scripts; production allows only 'self' plus the one known
    // static script by hash.
    isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : `script-src 'self' ${THEME_SCRIPT_HASH}`,
    "style-src 'self' 'unsafe-inline'",
    // blob: for client-side photo previews (URL.createObjectURL on the
    // selected file before upload); the Supabase host for storage-served
    // photo/thumbnail images.
    "img-src 'self' blob: data: https://*.supabase.co",
    "font-src 'self'",
    // next/font self-hosts the Google fonts this app uses at build time
    // (no runtime request to fonts.googleapis.com/fonts.gstatic.com), and
    // the Supabase host is for the browser Supabase client (auth calls)
    // used by the login/reset-password forms. Dev also needs a websocket
    // connection back to itself for HMR.
    isDev
        ? "connect-src 'self' https://*.supabase.co ws://localhost:* http://localhost:*"
        : "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.supabase.co',
                pathname: '/storage/v1/object/**',
            },
        ],
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
                    { key: 'Content-Security-Policy', value: contentSecurityPolicy },
                ],
            },
        ]
    },
}

module.exports = withNextIntl(nextConfig)