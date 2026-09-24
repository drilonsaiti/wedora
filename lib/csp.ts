/*
 * ============================================================
 * CONTENT SECURITY POLICY -- shared builder
 * ============================================================
 *
 * Used from middleware.ts, which calls this once per request with a fresh
 * nonce and sets the result as the response's Content-Security-Policy
 * header (and forwards the nonce to the app via an `x-nonce` request
 * header, so the root layout can hand it to next-themes' bootstrap
 * script -- see contexts/theme-provider.tsx and app/[locale]/layout.tsx).
 *
 * This used to be a static header in next.config.js, with the one inline
 * script next-themes renders allowlisted by a hardcoded SHA-256 hash of
 * its expected content instead of a nonce (the hash was static, so it
 * could live in a static header). That broke in production the moment a
 * next-themes dependency bump changed the minified script's exact text --
 * the hash no longer matched, CSP blocked the script, and the app lost
 * theme-flash prevention along with (per the hydration-mismatch cascade
 * that follows) working dark/light and language toggles. A static hash
 * can only be verified against what a real production build actually
 * emits; it can't be predicted from source alone once a bundler's own
 * minification pass is involved, so it's inherently fragile to any
 * upstream dependency change, however small. A nonce sidesteps that
 * entirely: it doesn't matter what the script's exact bytes are, only
 * that the page and the header agree on one random value per request.
 *
 * Trade-off: reading the nonce via `headers()` in the root layout makes
 * every route under it dynamically rendered (no static/ISR caching) --
 * see https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy.
 * Acceptable here: middleware already runs a Supabase auth check on every
 * request regardless of the page's rendering mode, so this isn't adding a
 * new per-request cost, just removing a caching optimization on a
 * low-traffic marketing/guest site.
 */
const isDev = process.env.NODE_ENV !== 'production'

export function buildContentSecurityPolicy(nonce: string): string {
    return [
        "default-src 'self'",
        // Dev needs 'unsafe-eval' and 'unsafe-inline' for Turbopack/HMR's
        // own bootstrap scripts, which aren't stable/nonce-able builds.
        // Production allows only 'self' plus this request's nonce.
        isDev
            ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
            : `script-src 'self' 'nonce-${nonce}'`,
        // Two layouts render a per-wedding/per-demo <style> tag with
        // dynamically computed CSS custom properties (the wedding's theme
        // color) -- genuinely per-request content, so it can't be
        // hash-allowlisted; inline styles are a much lower-severity CSP
        // gap than inline scripts (no way to exfiltrate data or run
        // arbitrary logic through them), so 'unsafe-inline' here is a
        // deliberate, scoped trade-off, not an oversight.
        "style-src 'self' 'unsafe-inline'",
        // blob: for client-side photo previews (URL.createObjectURL on
        // the selected file before upload); the Supabase host for
        // storage-served photo/thumbnail images.
        "img-src 'self' blob: data: https://*.supabase.co",
        "font-src 'self'",
        // next/font self-hosts the Google fonts this app uses at build
        // time (no runtime request to fonts.googleapis.com/gstatic.com),
        // and the Supabase host is for the browser Supabase client (auth
        // calls) used by the login/reset-password forms. Dev also needs
        // a websocket connection back to itself for HMR.
        isDev
            ? "connect-src 'self' https://*.supabase.co ws://localhost:* http://localhost:*"
            : "connect-src 'self' https://*.supabase.co",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
    ].join('; ')
}