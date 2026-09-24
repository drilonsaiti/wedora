const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

/*
 * Content-Security-Policy used to live here as a static header, with the
 * one inline script this app renders (next-themes' theme-flash-prevention
 * bootstrap, see contexts/theme-provider.tsx) allowlisted by a hardcoded
 * SHA-256 hash of its expected minified text. That broke in production
 * the moment a next-themes dependency bump changed the script's exact
 * bytes -- the hash stopped matching, CSP blocked the script, and (per
 * the hydration-mismatch cascade that follows a blocked theme-flash
 * script) the dark/light toggle and language switcher stopped working
 * too, not just the theme flash the hash's own doc comment predicted.
 *
 * A hardcoded hash can only be verified against what a real production
 * build actually emits, and a bundler's own minification pass means that
 * can't be reliably predicted from source. CSP now uses a per-request
 * nonce instead (generated in middleware.ts, built by lib/csp.ts, read in
 * app/[locale]/layout.tsx via headers() and handed to next-themes), which
 * sidesteps the whole problem: it doesn't matter what the script's exact
 * bytes are, only that the page and the header agree on one random value
 * per request. See lib/csp.ts for the full CSP string and reasoning.
 */

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
                    // Content-Security-Policy is set per-request in
                    // middleware.ts instead (needs a fresh nonce every
                    // time -- see lib/csp.ts).
                ],
            },
        ]
    },
}

module.exports = withNextIntl(nextConfig)