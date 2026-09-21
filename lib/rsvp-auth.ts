import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { createServiceClient } from "@/lib/supabase/server";

/*
 * ============================================================
 * RSVP API KEYS
 * ============================================================
 *
 * Raw key shape:  wr_live_<43 url-safe base64 chars>  (256 bits of entropy)
 * Stored:
 *   - key_prefix: first 12 chars ("wr_live_" + 4), shown in the admin UI
 *     so an owner can tell keys apart. Not secret on its own.
 *   - key_hash:   sha256(raw key) hex digest. The key has 256 bits of
 *     entropy, so an unsalted hash is sufficient -- there is nothing to
 *     usefully brute force offline even if the hash leaked.
 *
 * The raw key is only ever returned once, at creation time.
 */

const KEY_PREFIX = "wr_live_";
const KEY_PREFIX_LENGTH = 12;

export function generateRsvpApiKey(): {
    raw: string;
    prefix: string;
    hash: string;
} {
    const raw = `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;

    return {
        raw,
        prefix: raw.slice(0, KEY_PREFIX_LENGTH),
        hash: hashRsvpApiKey(raw),
    };
}

export function hashRsvpApiKey(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
}

function safeHashEqual(a: string, b: string): boolean {
    const bufferA = Buffer.from(a, "hex");
    const bufferB = Buffer.from(b, "hex");

    if (bufferA.length === 0 || bufferA.length !== bufferB.length) {
        return false;
    }

    return timingSafeEqual(bufferA, bufferB);
}

/*
 * ============================================================
 * HTTP ERROR HELPER
 * ============================================================
 */
export class RsvpApiError extends Error {
    status: number;
    code: string;
    retryAfterSeconds?: number;

    constructor(
        status: number,
        code: string,
        message: string,
        retryAfterSeconds?: number
    ) {
        super(message);
        this.name = "RsvpApiError";
        this.status = status;
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

type ServiceClient = ReturnType<typeof createServiceClient>;

export type RsvpApiActor = {
    service: ServiceClient;
    wedding: {
        id: string;
        slug: string | null;
    };
    apiKeyId: string;
    apiKeyHash: string;
};

/*
 * Pulls the raw API key out of a request. A lot of no-code tools
 * (Zapier/Make, Squarespace/Webflow form webhooks, Google Apps Script)
 * make it awkward or impossible to set a custom `Authorization` header,
 * so the key can arrive through any of these, checked in this order:
 *
 *   1. `Authorization: Bearer <key>` header (unchanged, still preferred
 *      for anything that can set arbitrary headers)
 *   2. `X-Api-Key: <key>` header
 *   3. `api_key` query string parameter (GET requests only -- a
 *      key in a POST body isn't read here since the body still needs
 *      Zod validation first, and query params on a POST work fine too
 *      if that's what the caller finds easiest)
 *
 * Whichever channel is used, the key itself is still looked up and
 * compared the same way below, so the security model (per-wedding,
 * hashed at rest, revocable, rate-limited) is identical regardless of
 * how the caller transports it.
 */
function extractRawApiKey(request: Request): string {
    const authHeader = request.headers.get("authorization") ?? "";

    if (authHeader.startsWith("Bearer ")) {
        const fromHeader = authHeader.slice("Bearer ".length).trim();

        if (fromHeader) {
            return fromHeader;
        }
    }

    const apiKeyHeader = request.headers.get("x-api-key")?.trim();

    if (apiKeyHeader) {
        return apiKeyHeader;
    }

    try {
        const { searchParams } = new URL(request.url);
        const fromQuery = searchParams.get("api_key")?.trim();

        if (fromQuery) {
            return fromQuery;
        }
    } catch {
        // request.url should always be a valid absolute URL in a route
        // handler; if it somehow isn't, just fall through to "missing".
    }

    return "";
}

/*
 * Resolves + authenticates an external RSVP API caller:
 *  1. the wedding must exist (looked up by its public slug)
 *  2. the request must carry an API key (see extractRawApiKey above for
 *     the accepted channels)
 *  3. that key must match a non-revoked row scoped to THIS wedding
 *
 * Never leaks whether the problem was the wedding or the key: an
 * invalid key for a real wedding and a made-up wedding slug both come
 * back as 401/404 with the same shape, so this can't be used to probe
 * which wedding slugs exist.
 */
export async function resolveRsvpApiActor(
    request: Request,
    weddingSlug: string | null | undefined
): Promise<RsvpApiActor> {
    if (!weddingSlug || !weddingSlug.trim()) {
        throw new RsvpApiError(
            400,
            "MISSING_WEDDING",
            "weddingSlug is required"
        );
    }

    const rawKey = extractRawApiKey(request);

    if (!rawKey) {
        throw new RsvpApiError(
            401,
            "MISSING_API_KEY",
            "Missing API key: send it as 'Authorization: Bearer <key>', " +
            "'X-Api-Key: <key>', or an '?api_key=<key>' query parameter"
        );
    }

    const service = createServiceClient();

    const { data: wedding, error: weddingError } = await service
        .from("weddings")
        .select("id, slug")
        .eq("slug", weddingSlug.trim())
        .maybeSingle();

    if (weddingError) {
        console.error("RSVP wedding lookup failed:", weddingError);

        throw new RsvpApiError(
            500,
            "WEDDING_LOOKUP_FAILED",
            "Unable to load wedding"
        );
    }

    if (!wedding) {
        throw new RsvpApiError(404, "WEDDING_NOT_FOUND", "Wedding not found");
    }

    const prefix = rawKey.slice(0, KEY_PREFIX_LENGTH);
    const providedHash = hashRsvpApiKey(rawKey);

    const { data: apiKey, error: keyError } = await service
        .from("wedding_rsvp_api_keys")
        .select("id, wedding_id, key_hash, revoked_at")
        .eq("wedding_id", wedding.id)
        .eq("key_prefix", prefix)
        .maybeSingle();

    if (keyError) {
        console.error("RSVP API key lookup failed:", keyError);

        throw new RsvpApiError(
            500,
            "KEY_LOOKUP_FAILED",
            "Unable to verify API key"
        );
    }

    if (
        !apiKey ||
        apiKey.revoked_at ||
        !safeHashEqual(providedHash, apiKey.key_hash)
    ) {
        throw new RsvpApiError(
            401,
            "INVALID_API_KEY",
            "Invalid or revoked API key"
        );
    }

    // Best-effort bookkeeping; never block the request on this.
    void service
        .from("wedding_rsvp_api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", apiKey.id)
        .then(undefined, (error) => {
            console.error("RSVP API key last_used_at update failed:", error);
        });

    return {
        service,
        wedding,
        apiKeyId: apiKey.id,
        apiKeyHash: apiKey.key_hash,
    };
}

/*
 * ============================================================
 * RATE LIMITING
 * ============================================================
 *
 * One bucket per (wedding, api key). Keeps a single leaked/misbehaving
 * integration from hammering a wedding's guest list, without needing
 * per-guest locking.
 */
export async function enforceRsvpRateLimit(
    service: ServiceClient,
    weddingId: string,
    keyHash: string,
    limit: number,
    windowSeconds: number
): Promise<void> {
    const rpc = service as unknown as {
        rpc<T>(
            name: string,
            args: Record<string, unknown>
        ): Promise<{ data: T | null; error: { message: string } | null }>;
    };

    const { data, error } = await rpc.rpc<number | number[]>(
        "consume_rsvp_rate_bucket",
        {
            p_wedding_id: weddingId,
            p_key_hash: keyHash,
            p_limit: limit,
            p_window_seconds: windowSeconds,
        }
    );

    if (error) {
        console.error("RSVP rate limit check failed:", error);

        throw new RsvpApiError(
            500,
            "RATE_LIMIT_UNAVAILABLE",
            "Unable to verify rate limit"
        );
    }

    const retryAfterSeconds = Array.isArray(data) ? data[0] : data;

    if (typeof retryAfterSeconds === "number" && retryAfterSeconds > 0) {
        throw new RsvpApiError(
            429,
            "RATE_LIMITED",
            "Too many requests, please slow down",
            retryAfterSeconds
        );
    }
}