/*
 * Pure bucketing/cumulative-sum math for the RSVP trend chart, kept out of
 * actions/seating.ts on purpose: that file starts with 'use server', and
 * Next.js requires every export of a 'use server' file to be an async
 * function (every export becomes a callable server-action RPC endpoint).
 * bucketRsvpResponsesByDay() is a plain synchronous helper, not an action,
 * so exporting it from actions/seating.ts breaks the build with:
 *   "use server" file can only export async functions.
 * Living here instead means it can still be unit tested directly with no
 * Supabase involved, and actions/seating.ts just imports and calls it.
 */

export interface RsvpTrendPoint {
    date: string;
    confirmedCumulative: number;
    declinedCumulative: number;
}

export interface RsvpResponseRow {
    rsvp_responded_at: string | null;
    rsvp_status: "pending" | "confirmed" | "declined" | null;
}

/*
 * Buckets guests that have responded by the calendar date (UTC, taken from
 * the `rsvp_responded_at` timestamp string) of their response, then walks
 * the distinct dates in chronological order building a running total per
 * status.
 *
 * A guest whose `rsvp_status` is still "pending" despite having a
 * `rsvp_responded_at` (should not normally happen, but the column and the
 * status are two separate writes) is not counted in either series -- only
 * confirmed/declined responses move the trend.
 */
export function bucketRsvpResponsesByDay(
    rows: RsvpResponseRow[],
): RsvpTrendPoint[] {
    const countsByDate = new Map<
        string,
        { confirmed: number; declined: number }
    >();

    for (const row of rows) {
        if (!row.rsvp_responded_at) {
            continue;
        }

        if (row.rsvp_status !== "confirmed" && row.rsvp_status !== "declined") {
            continue;
        }

        // Calendar date portion of the ISO timestamp (YYYY-MM-DD).
        const date = row.rsvp_responded_at.slice(0, 10);

        const bucket = countsByDate.get(date) ?? {
            confirmed: 0,
            declined: 0,
        };

        if (row.rsvp_status === "confirmed") {
            bucket.confirmed += 1;
        } else {
            bucket.declined += 1;
        }

        countsByDate.set(date, bucket);
    }

    const sortedDates = Array.from(countsByDate.keys()).sort();

    let confirmedCumulative = 0;
    let declinedCumulative = 0;

    return sortedDates.map((date) => {
        const bucket = countsByDate.get(date)!;

        confirmedCumulative += bucket.confirmed;
        declinedCumulative += bucket.declined;

        return {
            date,
            confirmedCumulative,
            declinedCumulative,
        };
    });
}
