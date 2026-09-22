"use server";

import { headers } from "next/headers";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
    LOGIN_EMAIL_RATE_LIMIT_MAX,
    LOGIN_IP_RATE_LIMIT_MAX,
    LOGIN_RATE_LIMIT_WINDOW_SECONDS,
    buildEmailRateLimitKey,
    buildIpRateLimitKey,
    extractClientIp,
    getLoginRateLimitSecret,
    type LoginRole,
} from "@/lib/login-rate-limit";

/*
 * Both login forms used to call supabase.auth.signInWithPassword()
 * directly from the browser. That's fine for Supabase's own project-wide
 * Auth rate limits, but leaves no app-level control over repeated failed
 * attempts against one account or from one source. Moving the sign-in
 * itself behind these Server Actions is what makes a rate-limit check
 * enforceable at all -- it runs before Supabase Auth is ever touched, and
 * (unlike a client-side check) can't be skipped by calling the API
 * directly or disabling JS.
 */

export type LoginErrorCode =
    | "RATE_LIMITED"
    | "INVALID_CREDENTIALS"
    | "ACCESS_DENIED"
    | "UNKNOWN";

export type AdminLoginResult =
    | { success: true }
    | { success: false; code: LoginErrorCode; retryAfterSeconds?: number };

export type CoupleLoginResult =
    | { success: true; weddingId: string }
    | { success: false; code: LoginErrorCode; retryAfterSeconds?: number };

type RpcError = {
    message: string;
    code?: string;
};

type RpcClient = {
    rpc<T>(
        name: string,
        args?: Record<string, unknown>
    ): Promise<{ data: T | null; error: RpcError | null }>;
};

function getRpcClient(supabase: ReturnType<typeof createServiceClient>): RpcClient {
    /*
     * consume_login_rate_bucket is added by
     * supabase/migrations/20260922100000_login_rate_limit.sql. This cast
     * keeps the action compiling before generated Supabase types are
     * refreshed, same as actions/upload.ts's getRpcClient.
     */
    return supabase as unknown as RpcClient;
}

/**
 * Checks (and consumes) both the per-email and per-IP login rate-limit
 * buckets. Returns 0 when the attempt is allowed through, otherwise the
 * number of seconds until the caller should retry.
 *
 * Throws if the rate-limit check itself can't be completed (RPC/database
 * error) -- callers must treat that as "deny", not "allow": failing open
 * here would mean a database hiccup silently turns off login rate
 * limiting, which is a worse outcome than briefly refusing legitimate
 * logins. This mirrors how actions/upload.ts's preflight treats an RPC
 * error as a failure, not a pass-through.
 */
async function checkLoginRateLimit(role: LoginRole, email: string): Promise<number> {
    const secret = getLoginRateLimitSecret();
    const emailKey = buildEmailRateLimitKey(role, email, secret);

    const requestHeaders = await headers();
    const ip = extractClientIp(requestHeaders);
    const ipKey = ip ? buildIpRateLimitKey(role, ip, secret) : null;

    const rpc = getRpcClient(createServiceClient());

    const { data: emailRetry, error: emailError } = await rpc.rpc<number>(
        "consume_login_rate_bucket",
        {
            p_key_hash: emailKey,
            p_limit: LOGIN_EMAIL_RATE_LIMIT_MAX,
            p_window_seconds: LOGIN_RATE_LIMIT_WINDOW_SECONDS,
        }
    );

    if (emailError) {
        console.error("Login rate-limit check failed (email bucket):", emailError);
        throw new Error("RATE_LIMIT_CHECK_FAILED");
    }

    if (emailRetry && emailRetry > 0) {
        return emailRetry;
    }

    if (!ipKey) {
        return 0;
    }

    const { data: ipRetry, error: ipError } = await rpc.rpc<number>(
        "consume_login_rate_bucket",
        {
            p_key_hash: ipKey,
            p_limit: LOGIN_IP_RATE_LIMIT_MAX,
            p_window_seconds: LOGIN_RATE_LIMIT_WINDOW_SECONDS,
        }
    );

    if (ipError) {
        console.error("Login rate-limit check failed (IP bucket):", ipError);
        throw new Error("RATE_LIMIT_CHECK_FAILED");
    }

    return ipRetry ?? 0;
}

type AuthenticatedUser = {
    id: string;
    app_metadata: Record<string, unknown>;
};

async function attemptLogin(
    role: LoginRole,
    email: string,
    password: string
): Promise<
    | { ok: true; user: AuthenticatedUser }
    | { ok: false; code: LoginErrorCode; retryAfterSeconds?: number }
> {
    let retryAfterSeconds: number;

    try {
        retryAfterSeconds = await checkLoginRateLimit(role, email);
    } catch {
        return { ok: false, code: "UNKNOWN" };
    }

    if (retryAfterSeconds > 0) {
        return { ok: false, code: "RATE_LIMITED", retryAfterSeconds };
    }

    const supabase = await createClient();

    const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (authError || !data.user) {
        return { ok: false, code: "INVALID_CREDENTIALS" };
    }

    return { ok: true, user: data.user };
}

export async function loginAdmin(
    email: string,
    password: string
): Promise<AdminLoginResult> {
    const attempt = await attemptLogin("admin", email, password);

    if (!attempt.ok) {
        return {
            success: false,
            code: attempt.code,
            retryAfterSeconds: attempt.retryAfterSeconds,
        };
    }

    const service = createServiceClient();

    const { data: admin } = await service
        .from("admins")
        .select("id")
        .eq("id", attempt.user.id)
        .single();

    if (!admin) {
        const supabase = await createClient();
        await supabase.auth.signOut();

        return { success: false, code: "ACCESS_DENIED" };
    }

    return { success: true };
}

export async function loginCouple(
    email: string,
    password: string
): Promise<CoupleLoginResult> {
    const attempt = await attemptLogin("couple", email, password);

    if (!attempt.ok) {
        return {
            success: false,
            code: attempt.code,
            retryAfterSeconds: attempt.retryAfterSeconds,
        };
    }

    const appMetadata = attempt.user.app_metadata as {
        role?: string;
        wedding_id?: string;
    };

    if (appMetadata.role !== "couple" || !appMetadata.wedding_id) {
        const supabase = await createClient();
        await supabase.auth.signOut();

        return { success: false, code: "ACCESS_DENIED" };
    }

    return { success: true, weddingId: appMetadata.wedding_id };
}