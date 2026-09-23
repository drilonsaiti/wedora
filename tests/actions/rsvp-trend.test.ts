import { describe, expect, it } from "vitest";

import { bucketRsvpResponsesByDay } from "@/lib/rsvp-trend";

/*
 * ============================================================
 * bucketRsvpResponsesByDay
 * ============================================================
 *
 * Pure day-bucketing/cumulative-sum math, called by getRsvpTrend() in
 * actions/seating.ts. It lives in lib/rsvp-trend.ts rather than in
 * actions/seating.ts itself because that file is 'use server', and
 * Next.js requires every export of a 'use server' file to be an async
 * function -- this is a plain synchronous helper, not a server action.
 * Living in a normal module also means no Next.js/Supabase mocking is
 * needed here at all to test it directly.
 */
describe("bucketRsvpResponsesByDay", () => {
    it("returns an empty array when there are no responses yet", () => {
        expect(bucketRsvpResponsesByDay([])).toEqual([]);
    });

    it("ignores guests who have not responded (null rsvp_responded_at)", () => {
        const result = bucketRsvpResponsesByDay([
            { rsvp_responded_at: null, rsvp_status: "pending" },
        ]);

        expect(result).toEqual([]);
    });

    it('ignores a responded row whose status is still "pending"', () => {
        const result = bucketRsvpResponsesByDay([
            {
                rsvp_responded_at: "2026-01-01T10:00:00.000Z",
                rsvp_status: "pending",
            },
        ]);

        expect(result).toEqual([]);
    });

    it("buckets same-day responses together and cumulative-sums per status", () => {
        const result = bucketRsvpResponsesByDay([
            {
                rsvp_responded_at: "2026-01-01T09:00:00.000Z",
                rsvp_status: "confirmed",
            },
            {
                rsvp_responded_at: "2026-01-01T18:30:00.000Z",
                rsvp_status: "confirmed",
            },
            {
                rsvp_responded_at: "2026-01-01T12:00:00.000Z",
                rsvp_status: "declined",
            },
            {
                rsvp_responded_at: "2026-01-02T08:00:00.000Z",
                rsvp_status: "confirmed",
            },
            {
                rsvp_responded_at: "2026-01-03T08:00:00.000Z",
                rsvp_status: "declined",
            },
        ]);

        expect(result).toEqual([
            {
                date: "2026-01-01",
                confirmedCumulative: 2,
                declinedCumulative: 1,
            },
            {
                date: "2026-01-02",
                confirmedCumulative: 3,
                declinedCumulative: 1,
            },
            {
                date: "2026-01-03",
                confirmedCumulative: 3,
                declinedCumulative: 2,
            },
        ]);
    });

    it("sorts buckets chronologically regardless of input row order", () => {
        const result = bucketRsvpResponsesByDay([
            {
                rsvp_responded_at: "2026-03-05T00:00:00.000Z",
                rsvp_status: "confirmed",
            },
            {
                rsvp_responded_at: "2026-01-01T00:00:00.000Z",
                rsvp_status: "confirmed",
            },
            {
                rsvp_responded_at: "2026-02-14T00:00:00.000Z",
                rsvp_status: "declined",
            },
        ]);

        expect(result.map((point) => point.date)).toEqual([
            "2026-01-01",
            "2026-02-14",
            "2026-03-05",
        ]);

        expect(result[result.length - 1]).toEqual({
            date: "2026-03-05",
            confirmedCumulative: 2,
            declinedCumulative: 1,
        });
    });
});
