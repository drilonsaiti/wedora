import { afterEach, describe, expect, it, vi } from "vitest";

/*
 * The Content-Security-Policy header used to be built once in
 * next.config.js and served as a static header, with the app's one
 * inline script (next-themes' theme-flash-prevention bootstrap)
 * allowlisted by a hardcoded SHA-256 hash. That hash broke in production
 * the moment a next-themes dependency bump changed the script's exact
 * minified text -- see lib/csp.ts and middleware.ts for the full story.
 * CSP is now built per-request in middleware.ts from lib/csp.ts's
 * `buildContentSecurityPolicy(nonce)`, with a fresh nonce instead of a
 * hash, which is what these tests exercise directly.
 *
 * `lib/csp.ts` reads process.env.NODE_ENV once, at import time, to decide
 * between the strict production script-src and the permissive dev one
 * (dev needs 'unsafe-inline'/'unsafe-eval' for Turbopack/HMR's own
 * bootstrap scripts). To test both branches we have to force NODE_ENV and
 * re-import a fresh, uncached copy of the module for each one (via
 * `vi.resetModules()`, not Node's `require.cache` -- this module goes
 * through Vitest's own TS/ESM transform, not plain CommonJS require),
 * since a single top-level import would only ever see whatever NODE_ENV
 * Vitest itself happens to run under.
 */
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
    // Next.js's own type declarations mark process.env.NODE_ENV readonly
    // (it's meant to be set once by the runtime, not mutated by app code);
    // the cast below is the test-only exception to that, since here we're
    // deliberately simulating "what did next build vs. next dev see".
    (process.env as { NODE_ENV: string }).NODE_ENV = originalNodeEnv;
});

async function getCsp(
    env: "production" | "development",
    nonce = "test-nonce-value",
): Promise<string> {
    (process.env as { NODE_ENV: string }).NODE_ENV = env;
    vi.resetModules();

    const { buildContentSecurityPolicy } = await import("@/lib/csp");

    return buildContentSecurityPolicy(nonce);
}

/*
 * These pin down exactly the security properties that make the production
 * CSP worth having, so a well-meaning future edit (e.g. "just add
 * 'unsafe-inline' to fix this one weird script error") gets caught here
 * instead of silently reopening the gap this header exists to close. See
 * lib/csp.ts for the reasoning behind each directive.
 */
describe("Content-Security-Policy (production)", () => {
    it("is a non-empty policy", async () => {
        const csp = await getCsp("production");

        expect(csp.length).toBeGreaterThan(0);
    });

    it("script-src does not allow unsafe-inline or unsafe-eval", async () => {
        const csp = await getCsp("production");
        const scriptSrc = csp.match(/script-src ([^;]+)/)?.[1] ?? "";

        expect(scriptSrc).not.toContain("unsafe-inline");
        expect(scriptSrc).not.toContain("unsafe-eval");
    });

    it("script-src allowlists this request's nonce, and only this one", async () => {
        const csp = await getCsp("production", "abc123==");
        const scriptSrc = csp.match(/script-src ([^;]+)/)?.[1] ?? "";

        expect(scriptSrc).toContain("'nonce-abc123=='");
        // Different nonces must never collide -- otherwise it's not
        // actually scoped per-request.
        const otherCsp = await getCsp("production", "xyz789==");
        const otherScriptSrc = otherCsp.match(/script-src ([^;]+)/)?.[1] ?? "";
        expect(otherScriptSrc).not.toContain("'nonce-abc123=='");
    });

    it("blocks plugin content entirely (object-src none)", async () => {
        const csp = await getCsp("production");

        expect(csp).toContain("object-src 'none'");
    });

    it("blocks this site from being framed by another origin", async () => {
        const csp = await getCsp("production");

        expect(csp).toContain("frame-ancestors 'none'");
    });

    it("restricts form submissions to this origin", async () => {
        const csp = await getCsp("production");

        expect(csp).toContain("form-action 'self'");
    });

    it("allows the Supabase storage host for photo images, not an open wildcard", async () => {
        const csp = await getCsp("production");
        const imgSrc = csp.match(/img-src ([^;]+)/)?.[1] ?? "";

        expect(imgSrc).toContain("https://*.supabase.co");
        expect(imgSrc).not.toMatch(/img-src[^;]*\*(?!\.supabase)/);
    });

    it("does not open a websocket allowance meant only for local HMR", async () => {
        const csp = await getCsp("production");
        const connectSrc = csp.match(/connect-src ([^;]+)/)?.[1] ?? "";

        expect(connectSrc).not.toContain("ws://");
        expect(connectSrc).not.toContain("localhost");
    });
});

/*
 * `next dev` (Turbopack) injects its own inline bootstrap scripts for HMR,
 * the error overlay and debug-channel setup that don't exist in a
 * production build and can't be nonce- or hash-pinned (their content
 * isn't stable across builds/requests). These tests make sure dev stays
 * usable rather than pinning dev to the same strict policy production
 * gets.
 */
describe("Content-Security-Policy (development)", () => {
    it("script-src allows what Turbopack/HMR needs to bootstrap", async () => {
        const csp = await getCsp("development");
        const scriptSrc = csp.match(/script-src ([^;]+)/)?.[1] ?? "";

        expect(scriptSrc).toContain("unsafe-inline");
        expect(scriptSrc).toContain("unsafe-eval");
    });

    it("connect-src allows the local HMR websocket", async () => {
        const csp = await getCsp("development");
        const connectSrc = csp.match(/connect-src ([^;]+)/)?.[1] ?? "";

        expect(connectSrc).toContain("ws://localhost:*");
    });
});
