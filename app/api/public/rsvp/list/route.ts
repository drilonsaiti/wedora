import { NextResponse } from "next/server";

import {
    enforceRsvpRateLimit,
    resolveRsvpApiActor,
    RsvpApiError,
} from "@/lib/rsvp-auth";

export const dynamic = "force-dynamic";

const READ_RATE_LIMIT = 30;
const RATE_WINDOW_SECONDS = 60;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

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

/*
 * GET /api/public/rsvp/list?weddingSlug=...&status=confirmed&limit=100&offset=0
 * Authorization: Bearer <wedding RSVP API key>
 *
 * Bulk export for an external site that wants to mirror the full guest
 * list + RSVP state (e.g. to render its own "who's coming" page or to
 * reconcile a spreadsheet), rather than looking guests up one at a time.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const weddingSlug = searchParams.get("weddingSlug");
        const statusFilter = searchParams.get("status");

        if (
            statusFilter &&
            !["pending", "confirmed", "declined"].includes(statusFilter)
        ) {
            return jsonError(400, "VALIDATION_ERROR", "Invalid status filter");
        }

        const limit = Math.min(
            MAX_LIMIT,
            Math.max(1, Number(searchParams.get("limit")) || DEFAULT_LIMIT)
        );

        const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

        const actor = await resolveRsvpApiActor(request, weddingSlug);

        await enforceRsvpRateLimit(
            actor.service,
            actor.wedding.id,
            actor.apiKeyHash,
            READ_RATE_LIMIT,
            RATE_WINDOW_SECONDS
        );

        let query = actor.service
            .from("guests")
            .select(
                "id, first_name, last_name, rsvp_status, rsvp_party_size, rsvp_note, rsvp_responded_at",
                { count: "exact" }
            )
            .eq("wedding_id", actor.wedding.id)
            .order("last_name", { ascending: true })
            .order("first_name", { ascending: true })
            .range(offset, offset + limit - 1);

        if (statusFilter) {
            query = query.eq(
                "rsvp_status",
                statusFilter as "pending" | "confirmed" | "declined"
            );
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("RSVP list query failed:", error);

            return jsonError(500, "LIST_FAILED", "Unable to load guests");
        }

        return NextResponse.json(
            {
                guests: (data ?? []).map((guest) => ({
                    id: guest.id,
                    firstName: guest.first_name,
                    lastName: guest.last_name,
                    rsvpStatus: guest.rsvp_status,
                    rsvpPartySize: guest.rsvp_party_size,
                    rsvpNote: guest.rsvp_note,
                    rsvpRespondedAt: guest.rsvp_responded_at,
                })),
                total: count ?? 0,
                limit,
                offset,
            },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (error) {
        if (error instanceof RsvpApiError) {
            return jsonError(
                error.status,
                error.code,
                error.message,
                error.retryAfterSeconds
            );
        }

        console.error("RSVP list route error:", error);

        return jsonError(500, "UNEXPECTED_ERROR", "Unexpected error");
    }
}
