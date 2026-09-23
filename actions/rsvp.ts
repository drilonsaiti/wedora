"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateRsvpApiKey } from "@/lib/rsvp-auth";
import { getGuestByToken } from "@/actions/seating";
import { getWeddingEntitlements } from "@/lib/plans";
import {
    getWeddingNotificationEmails,
    rsvpNotificationEmail,
    sendEmail,
} from "@/lib/email";
import {
    rsvpApiKeyLabelSchema,
    rsvpManualUpdateSchema,
    rsvpTokenUpdateSchema,
    type RsvpManualUpdateInput,
    type RsvpTokenUpdateInput,
} from "@/schemas";

/*
 * ============================================
 * ACCESS
 * ============================================
 *
 * Same admin-or-owner model used throughout actions/seating.ts: a
 * global admin (public.admins) may manage any wedding; the wedding's
 * owner_user_id may manage only their own wedding. The service client
 * is only handed back once the exact wedding has been authorized.
 */
async function requireActor() {
    const authClient = await createClient();

    const {
        data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
        redirect("/admin/login");
    }

    const serviceClient = createServiceClient();

    const { data: admin, error: adminError } = await serviceClient
        .from("admins")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

    if (adminError) {
        console.error("Admin check failed:", adminError);

        throw new Error("Failed to verify access");
    }

    return {
        user: user as User,
        role: admin ? ("admin" as const) : ("owner" as const),
    };
}

async function requireWeddingAccess(
    weddingId: string,
    actor?: Awaited<ReturnType<typeof requireActor>>,
) {
    const { user, role } = actor ?? (await requireActor());

    const supabase = createServiceClient();

    let query = supabase
        .from("weddings")
        .select("id, owner_user_id")
        .eq("id", weddingId);

    if (role === "owner") {
        query = query.eq("owner_user_id", user.id);
    }

    const { data: wedding, error } = await query.maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!wedding) {
        if (role === "owner") {
            redirect("/admin/unauthorized");
        }

        throw new Error("Wedding not found");
    }

    return { user, role, supabase, weddingId: wedding.id };
}

/*
 * ============================================
 * API KEYS
 *
 * One (or a small handful of) long-lived, revocable key(s) per wedding
 * that an external RSVP form/site can present to
 * POST/GET /api/public/rsvp. The raw key is generated here and returned
 * exactly once; only its hash is ever persisted.
 * ============================================
 */
export async function createRsvpApiKeyAction(
    weddingId: string,
    label?: string,
): Promise<{
    success: boolean;
    apiKey?: string;
    key?: {
        id: string;
        keyPrefix: string;
        label: string | null;
        createdAt: string;
    };
    error?: string;
}> {
    try {
        const parsed = rsvpApiKeyLabelSchema.safeParse({ label });

        if (!parsed.success) {
            return { success: false, error: "Invalid input" };
        }

        const {
            supabase,
            user,
            weddingId: id,
        } = await requireWeddingAccess(weddingId);

        const { data: weddingPlan } = await supabase
            .from("weddings")
            .select("plan, addons")
            .eq("id", id)
            .maybeSingle();

        if (
            !getWeddingEntitlements(weddingPlan?.plan, weddingPlan?.addons)
                .rsvpApiAccess
        ) {
            return {
                success: false,
                error: "RSVP API access is not included in this wedding's plan",
            };
        }

        const { raw, prefix, hash } = generateRsvpApiKey();

        const { data, error } = await supabase
            .from("wedding_rsvp_api_keys")
            .insert({
                wedding_id: id,
                key_prefix: prefix,
                key_hash: hash,
                label: parsed.data.label ? parsed.data.label : null,
                created_by: user.id,
            })
            .select("id, key_prefix, label, created_at")
            .single();

        if (error || !data) {
            console.error("RSVP API key creation failed:", error);

            return { success: false, error: "Failed to create API key" };
        }

        revalidateTag(`rsvp-keys-${id}`, "max");

        return {
            success: true,
            apiKey: raw,
            key: {
                id: data.id,
                keyPrefix: data.key_prefix,
                label: data.label,
                createdAt: data.created_at,
            },
        };
    } catch (error) {
        console.error("Create RSVP API key action failed:", error);

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

export async function listRsvpApiKeysAction(weddingId: string): Promise<{
    keys: Array<{
        id: string;
        keyPrefix: string;
        label: string | null;
        createdAt: string;
        lastUsedAt: string | null;
        revokedAt: string | null;
    }>;
    error?: string;
}> {
    try {
        const { supabase, weddingId: id } = await requireWeddingAccess(weddingId);

        const { data, error } = await supabase
            .from("wedding_rsvp_api_keys")
            .select("id, key_prefix, label, created_at, last_used_at, revoked_at")
            .eq("wedding_id", id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("RSVP API key listing failed:", error);

            return { keys: [], error: "Failed to load API keys" };
        }

        return {
            keys: (data ?? []).map((row) => ({
                id: row.id,
                keyPrefix: row.key_prefix,
                label: row.label,
                createdAt: row.created_at,
                lastUsedAt: row.last_used_at,
                revokedAt: row.revoked_at,
            })),
        };
    } catch (error) {
        console.error("List RSVP API keys action failed:", error);

        return {
            keys: [],
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

export async function revokeRsvpApiKeyAction(
    weddingId: string,
    keyId: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, weddingId: id } = await requireWeddingAccess(weddingId);

        const { data, error } = await supabase
            .from("wedding_rsvp_api_keys")
            .update({ revoked_at: new Date().toISOString() })
            .eq("id", keyId)
            .eq("wedding_id", id)
            .select("id")
            .maybeSingle();

        if (error) {
            console.error("RSVP API key revoke failed:", error);

            return { success: false, error: "Failed to revoke API key" };
        }

        if (!data) {
            return { success: false, error: "API key not found" };
        }

        revalidateTag(`rsvp-keys-${id}`, "max");

        return { success: true };
    } catch (error) {
        console.error("Revoke RSVP API key action failed:", error);

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/*
 * ============================================
 * MANUAL OVERRIDE
 *
 * Lets an admin/owner set a guest's RSVP directly from inside Wedora
 * (e.g. a phone call or a paper reply), independent of the external API.
 * ============================================
 */
export async function updateGuestRsvpAction(
    weddingId: string,
    input: RsvpManualUpdateInput,
): Promise<{ success: boolean; error?: string }> {
    try {
        const parsed = rsvpManualUpdateSchema.safeParse(input);

        if (!parsed.success) {
            return {
                success: false,
                error: `Invalid input: ${parsed.error.errors[0]?.message ?? ""}`,
            };
        }

        const { supabase, weddingId: id } = await requireWeddingAccess(weddingId);

        const { data, error } = await supabase
            .from("guests")
            .update({
                rsvp_status: parsed.data.status,
                rsvp_party_size: parsed.data.partySize ?? null,
                rsvp_note: parsed.data.note ? parsed.data.note : null,
                rsvp_responded_at: new Date().toISOString(),
                rsvp_source: "admin",
                rsvp_updated_by_key_id: null,
            })
            .eq("id", parsed.data.guestId)
            .eq("wedding_id", id)
            .select("id")
            .maybeSingle();

        if (error) {
            console.error("Manual RSVP update failed:", error);

            return { success: false, error: "Failed to update RSVP" };
        }

        if (!data) {
            return { success: false, error: "Guest not found" };
        }

        revalidateTag(`guests-${id}`, "max");

        return { success: true };
    } catch (error) {
        console.error("Update guest RSVP action failed:", error);

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/*
 * ============================================
 * COUPLE NOTIFICATIONS
 *
 * Fired only from guest-initiated RSVP paths (personal link here, and
 * POST /api/public/rsvp) -- never from updateGuestRsvpAction() above,
 * since the admin already knows about their own manual change.
 *
 * Awaited rather than fire-and-forget: this project's server actions
 * don't have a supported way to keep work running past the action's
 * return (no queue/background-job primitive here), so a truly
 * detached call risks being cut off before it completes. A call to
 * Resend is fast, and sendEmail() itself never throws or rejects, so
 * awaiting it adds negligible latency while guaranteeing it runs.
 * ============================================
 */
type ServiceClient = ReturnType<typeof createServiceClient>;

async function notifyCoupleOfGuestRsvp(
    service: ServiceClient,
    weddingId: string,
    guestName: string,
    status: "pending" | "confirmed" | "declined",
    partySize: number | null | undefined,
): Promise<void> {
    try {
        const { data: wedding, error } = await service
            .from("weddings")
            .select("groom_name, bride_name, groom_email, bride_email")
            .eq("id", weddingId)
            .maybeSingle();

        if (error || !wedding) {
            console.error("RSVP notification wedding lookup failed:", error);

            return;
        }

        const recipients = getWeddingNotificationEmails(wedding);

        if (recipients.length === 0) {
            return;
        }

        const weddingName = [wedding.groom_name, wedding.bride_name]
            .filter(Boolean)
            .join(" & ");

        const { subject, html } = rsvpNotificationEmail({
            weddingName: weddingName || "your wedding",
            guestName,
            status,
            partySize,
        });

        await sendEmail({ to: recipients, subject, html });
    } catch (error) {
        console.error("RSVP notification failed:", error);
    }
}

/*
 * ============================================
 * PUBLIC PERSONAL LINK SUBMISSION
 *
 * Lets a guest submit their own RSVP from their personal link
 * (/{locale}/{slug}/g/{token} -- see app/[locale]/[slug]/g/[token]/page.tsx
 * and actions/seating.ts#getGuestByToken), no login and no API key
 * required.
 *
 * This is the same three fields (status/partySize/note) and the same
 * `guests` update shape as updateGuestRsvpAction() above and the
 * POST /api/public/rsvp route below -- only the caller and how the
 * guest is identified differ, so all three end up writing the exact
 * same columns. Authorization is delegated entirely to
 * getGuestByToken(): it re-applies the same public-access gate
 * (wedding_settings.enable_find_seat) getGuests()/the find-seat page
 * use, and only an exact guest_token match resolves a guest at all --
 * this action never trusts a bare guestId the way the admin path does.
 * ============================================
 */
export async function submitGuestRsvpByTokenAction(
    input: RsvpTokenUpdateInput,
): Promise<{ success: boolean; error?: string }> {
    try {
        const parsed = rsvpTokenUpdateSchema.safeParse(input);

        if (!parsed.success) {
            return {
                success: false,
                error: `Invalid input: ${parsed.error.errors[0]?.message ?? ""}`,
            };
        }

        const resolved = await getGuestByToken(
            parsed.data.weddingSlug,
            parsed.data.token,
        );

        if (!resolved) {
            // Deliberately the same generic message regardless of why
            // resolution failed (bad token, wedding not found, public
            // access disabled) -- see getGuestByToken()'s doc comment.
            return { success: false, error: "Guest not found" };
        }

        const service = createServiceClient();

        const { data, error } = await service
            .from("guests")
            .update({
                rsvp_status: parsed.data.status,
                rsvp_party_size: parsed.data.partySize ?? null,
                rsvp_note: parsed.data.note ? parsed.data.note : null,
                rsvp_responded_at: new Date().toISOString(),
                rsvp_source: "find_seat",
                rsvp_updated_by_key_id: null,
            })
            .eq("id", resolved.guest.id)
            .eq("wedding_id", resolved.weddingId)
            .eq("guest_token", parsed.data.token)
            .select("id")
            .maybeSingle();

        if (error) {
            console.error("Personal-link RSVP update failed:", error);

            return { success: false, error: "Failed to update RSVP" };
        }

        if (!data) {
            return { success: false, error: "Guest not found" };
        }

        try {
            revalidateTag(`guests-${resolved.weddingId}`, "max");
        } catch (revalidateError) {
            console.error(
                "Personal-link RSVP cache revalidation failed:",
                revalidateError,
            );
        }

        await notifyCoupleOfGuestRsvp(
            service,
            resolved.weddingId,
            `${resolved.guest.first_name} ${resolved.guest.last_name}`,
            parsed.data.status,
            parsed.data.partySize,
        );

        return { success: true };
    } catch (error) {
        console.error("Submit guest RSVP by token action failed:", error);

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}
