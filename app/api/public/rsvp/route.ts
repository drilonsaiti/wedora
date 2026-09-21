import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import {
    enforceRsvpRateLimit,
    resolveRsvpApiActor,
    RsvpApiError,
} from "@/lib/rsvp-auth";
import { normalizeGuestName } from "@/lib/utils";
import { rsvpLookupSchema, rsvpUpdateSchema } from "@/schemas";

export const dynamic = "force-dynamic";

const READ_RATE_LIMIT = 60;
const WRITE_RATE_LIMIT = 20;
const RATE_WINDOW_SECONDS = 60;

type GuestRow = {
    id: string;
    first_name: string;
    last_name: string;
    rsvp_status: "pending" | "confirmed" | "declined";
    rsvp_party_size: number | null;
    rsvp_note: string | null;
    rsvp_responded_at: string | null;
};

function serializeGuest(guest: GuestRow) {
    return {
        id: guest.id,
        firstName: guest.first_name,
        lastName: guest.last_name,
        rsvpStatus: guest.rsvp_status,
        rsvpPartySize: guest.rsvp_party_size,
        rsvpNote: guest.rsvp_note,
        rsvpRespondedAt: guest.rsvp_responded_at,
    };
}

function jsonError(
    status: number,
    code: string,
    message: string,
    retryAfterSeconds?: number
) {
    return NextResponse.json(
        { error: message, code },
        {
            status,
            headers: {
                "Cache-Control": "no-store",
                ...(retryAfterSeconds
                    ? { "Retry-After": String(retryAfterSeconds) }
                    : {}),
            },
        }
    );
}

function handleError(error: unknown) {
    if (error instanceof RsvpApiError) {
        return jsonError(
            error.status,
            error.code,
            error.message,
            error.retryAfterSeconds
        );
    }

    console.error("RSVP route error:", error);

    return jsonError(500, "UNEXPECTED_ERROR", "Unexpected error");
}

/*
 * Finds at most one guest in `guests` whose normalized full name matches
 * the caller's input exactly. Ambiguity (two guests sharing a name, e.g.
 * a parent and child with the same name) is surfaced as 409 rather than
 * silently picking one -- an external integration should not be able to
 * update the wrong person's RSVP.
 */
async function findGuestByName(
    service: Awaited<ReturnType<typeof resolveRsvpApiActor>>["service"],
    weddingId: string,
    firstName: string,
    lastName: string
): Promise<
    | { status: "found"; guest: GuestRow }
    | { status: "not_found" }
    | { status: "ambiguous"; count: number }
> {
    const { data, error } = await service
        .from("guests")
        .select(
            "id, first_name, last_name, rsvp_status, rsvp_party_size, rsvp_note, rsvp_responded_at"
        )
        .eq("wedding_id", weddingId);

    if (error) {
        console.error("RSVP guest lookup failed:", error);

        throw new RsvpApiError(500, "GUEST_LOOKUP_FAILED", "Unable to load guests");
    }

    const target = normalizeGuestName(`${firstName} ${lastName}`);

    const matches = (data ?? []).filter(
        (guest) =>
            normalizeGuestName(`${guest.first_name} ${guest.last_name}`) === target
    );

    if (matches.length === 0) {
        return { status: "not_found" };
    }

    if (matches.length > 1) {
        return { status: "ambiguous", count: matches.length };
    }

    return { status: "found", guest: matches[0] as GuestRow };
}

/*
 * GET /api/public/rsvp?weddingSlug=...&firstName=...&lastName=...
 *
 * Read-only lookup, e.g. so an external form can show "you already
 * responded: confirmed" before submitting a change.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const parsed = rsvpLookupSchema.safeParse({
            weddingSlug: searchParams.get("weddingSlug"),
            firstName: searchParams.get("firstName"),
            lastName: searchParams.get("lastName"),
        });

        if (!parsed.success) {
            return jsonError(
                400,
                "VALIDATION_ERROR",
                parsed.error.issues[0]?.message ?? "Invalid input"
            );
        }

        const actor = await resolveRsvpApiActor(request, parsed.data.weddingSlug);

        await enforceRsvpRateLimit(
            actor.service,
            actor.wedding.id,
            actor.apiKeyHash,
            READ_RATE_LIMIT,
            RATE_WINDOW_SECONDS
        );

        const result = await findGuestByName(
            actor.service,
            actor.wedding.id,
            parsed.data.firstName,
            parsed.data.lastName
        );

        if (result.status === "not_found") {
            return jsonError(404, "GUEST_NOT_FOUND", "No guest found with that name");
        }

        if (result.status === "ambiguous") {
            return jsonError(
                409,
                "AMBIGUOUS_GUEST",
                `${result.count} guests share that name; ask the couple to disambiguate`
            );
        }

        return NextResponse.json(
            { guest: serializeGuest(result.guest) },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (error) {
        return handleError(error);
    }
}

/*
 * POST /api/public/rsvp
 * Authorization: Bearer <wedding RSVP API key>
 * {
 *   "weddingSlug": "sara-drilon",
 *   "firstName": "Elira",
 *   "lastName": "Krasniqi",
 *   "status": "confirmed" | "declined" | "pending",
 *   "partySize": 2,          // optional
 *   "note": "no nuts please" // optional, max 500 chars
 * }
 */
export async function POST(request: Request) {
    try {
        let body: unknown;

        try {
            body = await request.json();
        } catch {
            return jsonError(400, "INVALID_JSON", "Request body must be JSON");
        }

        const parsed = rsvpUpdateSchema.safeParse(body);

        if (!parsed.success) {
            return jsonError(
                400,
                "VALIDATION_ERROR",
                parsed.error.issues[0]?.message ?? "Invalid input"
            );
        }

        const actor = await resolveRsvpApiActor(request, parsed.data.weddingSlug);

        await enforceRsvpRateLimit(
            actor.service,
            actor.wedding.id,
            actor.apiKeyHash,
            WRITE_RATE_LIMIT,
            RATE_WINDOW_SECONDS
        );

        const result = await findGuestByName(
            actor.service,
            actor.wedding.id,
            parsed.data.firstName,
            parsed.data.lastName
        );

        if (result.status === "not_found") {
            return jsonError(404, "GUEST_NOT_FOUND", "No guest found with that name");
        }

        if (result.status === "ambiguous") {
            return jsonError(
                409,
                "AMBIGUOUS_GUEST",
                `${result.count} guests share that name; ask the couple to disambiguate`
            );
        }

        const { data: updated, error: updateError } = await actor.service
            .from("guests")
            .update({
                rsvp_status: parsed.data.status,
                rsvp_party_size: parsed.data.partySize ?? null,
                rsvp_note: parsed.data.note ? parsed.data.note : null,
                rsvp_responded_at: new Date().toISOString(),
                rsvp_source: "api",
                rsvp_updated_by_key_id: actor.apiKeyId,
            })
            .eq("id", result.guest.id)
            .eq("wedding_id", actor.wedding.id)
            .select(
                "id, first_name, last_name, rsvp_status, rsvp_party_size, rsvp_note, rsvp_responded_at"
            )
            .maybeSingle();

        if (updateError || !updated) {
            console.error("RSVP update failed:", updateError);

            return jsonError(500, "UPDATE_FAILED", "Failed to update RSVP");
        }

        try {
            revalidateTag(`guests-${actor.wedding.id}`, "max");
        } catch (error) {
            console.error("RSVP cache revalidation failed:", error);
        }

        return NextResponse.json(
            { guest: serializeGuest(updated as GuestRow) },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (error) {
        return handleError(error);
    }
}
