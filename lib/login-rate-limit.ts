import { createHmac } from "node:crypto";

/*
 * Login attempts are windowed per bucket: this many failures inside this
 * many seconds trips the lock. 5 attempts / 15 minutes is a common,
 * conservative default -- generous enough that a real person mistyping
 * their password a couple of times never gets caught, tight enough to
 * make online password guessing impractical.
 */
export const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
export const LOGIN_EMAIL_RATE_LIMIT_MAX = 5;

/*
 * The IP bucket is deliberately looser than the email bucket: several
 * people (e.g. wedding party members, or an office) can share one IP,
 * and it exists to catch credential stuffing across many different
 * emails from one source, not to be the primary defense for one account.
 */
export const LOGIN_IP_RATE_LIMIT_MAX = 20;

export type LoginRole = "admin" | "couple";

export function getLoginRateLimitSecret(): string {
    const secret =
        process.env.LOGIN_RATE_LIMIT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secret) {
        throw new Error("Missing LOGIN_RATE_LIMIT_SECRET");
    }

    return secret;
}

/*
 * HMAC (not a plain hash) so the stored key can't be reversed into the
 * raw email/IP even if the login_rate_limits table were ever exposed --
 * same reasoning as actions/upload.ts's rate-limit key hashing.
 */
export function hashLoginRateLimitKey(value: string, secret: string): string {
    return createHmac("sha256", secret).update(value).digest("hex");
}

export function normalizeLoginEmail(email: string): string {
    return email.trim().toLowerCase();
}

export function buildEmailRateLimitKey(
    role: LoginRole,
    email: string,
    secret: string
): string {
    return hashLoginRateLimitKey(
        `login:${role}:email:${normalizeLoginEmail(email)}`,
        secret
    );
}

export function buildIpRateLimitKey(
    role: LoginRole,
    ip: string,
    secret: string
): string {
    return hashLoginRateLimitKey(`login:${role}:ip:${ip}`, secret);
}

type HeaderReader = {
    get(name: string): string | null;
};

/*
 * Same header precedence as actions/upload.ts's getClientIpHash():
 * Cloudflare's header first (can't be spoofed through Cloudflare itself),
 * then a generic reverse-proxy header, then x-forwarded-for last since
 * it's the easiest for a client to forge when there's no trusted proxy
 * in front. Takes a plain header-reader (rather than calling next/headers
 * itself) so this stays unit-testable without mocking next/headers.
 */
export function extractClientIp(requestHeaders: HeaderReader): string | null {
    const forwardedFor = requestHeaders
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim();

    return (
        requestHeaders.get("cf-connecting-ip") ??
        requestHeaders.get("x-real-ip") ??
        forwardedFor ??
        null
    );
}