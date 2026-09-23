/*
 * ============================================================
 * COUPLE NOTIFICATION EMAILS
 * ============================================================
 *
 * A thin wrapper around Resend used to let the couple know, by email,
 * when a guest RSVPs or uploads a photo. This is a best-effort side
 * effect, never a dependency: a missing/misconfigured RESEND_API_KEY,
 * or any failure while talking to Resend, must never surface as a
 * user-facing error on an RSVP submission or a photo upload. Every
 * function here therefore swallows its own errors and never rejects.
 */

import { Resend } from "resend";

let warnedMissingApiKey = false;

let cachedClient: Resend | null = null;

function getResendClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        if (!warnedMissingApiKey) {
            warnedMissingApiKey = true;

            console.warn("RESEND_API_KEY is not set; skipping email notifications.");
        }

        return null;
    }

    if (!cachedClient) {
        cachedClient = new Resend(apiKey);
    }

    return cachedClient;
}

/*
 * The address notification emails are sent from. Resend requires a
 * verified sending domain in production; this can be overridden via
 * env without code changes once a domain is set up.
 */
function getFromAddress(): string {
    return process.env.RESEND_FROM_EMAIL ?? "Wedora <notifications@wedora.app>";
}

export type SendEmailInput = {
    to: string | string[];
    subject: string;
    html: string;
};

/*
 * Sends an email via Resend. NEVER throws:
 *   - if RESEND_API_KEY is unset, warns once and returns (no-op)
 *   - if the Resend call itself fails, logs the error and returns
 *
 * Safe to `void sendEmail(...)` for fire-and-forget, or to `await` it
 * inline -- either way it can never fail the caller's flow.
 */
export async function sendEmail({
                                    to,
                                    subject,
                                    html,
                                }: SendEmailInput): Promise<void> {
    try {
        const client = getResendClient();

        if (!client) {
            return;
        }

        const { error } = await client.emails.send({
            from: getFromAddress(),
            to,
            subject,
            html,
        });

        if (error) {
            console.error("Resend email send failed:", error);
        }
    } catch (error) {
        console.error("Email send threw unexpectedly:", error);
    }
}

/*
 * ============================================================
 * RECIPIENTS
 * ============================================================
 */

export function getWeddingNotificationEmails(wedding: {
    groom_email?: string | null;
    bride_email?: string | null;
}): string[] {
    return [wedding.groom_email, wedding.bride_email].filter(
        (email): email is string => Boolean(email),
    );
}

/*
 * ============================================================
 * TEMPLATES
 * ============================================================
 *
 * Deliberately simple: a heading and one or two lines of information.
 * Inline styles only -- email clients don't support external CSS.
 */

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function emailLayout(bodyHtml: string): string {
    return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2933;">
${bodyHtml}
<p style="margin-top: 32px; font-size: 12px; color: #9aa5b1;">Sent automatically by Wedora.</p>
</div>`;
}

export function rsvpNotificationEmail({
                                          weddingName,
                                          guestName,
                                          status,
                                          partySize,
                                      }: {
    weddingName: string;
    guestName: string;
    status: "confirmed" | "declined" | "pending";
    partySize?: number | null;
}): { subject: string; html: string } {
    const statusLabel =
        status === "confirmed"
            ? "confirmed"
            : status === "declined"
                ? "declined"
                : "updated";

    const subject = `${escapeHtml(guestName)} ${statusLabel} their RSVP`;

    const partySizeLine =
        typeof partySize === "number"
            ? `<p style="margin: 4px 0; font-size: 15px;">Party size: <strong>${partySize}</strong></p>`
            : "";

    const html = emailLayout(`
<h1 style="font-size: 20px; margin-bottom: 16px;">New RSVP for ${escapeHtml(weddingName)}</h1>
<p style="margin: 4px 0; font-size: 15px;"><strong>${escapeHtml(guestName)}</strong> just ${statusLabel} their RSVP.</p>
${partySizeLine}
`);

    return { subject, html };
}

export function photoUploadNotificationEmail({
                                                 weddingName,
                                                 guestName,
                                             }: {
    weddingName: string;
    guestName: string | null;
}): { subject: string; html: string } {
    const displayName = guestName && guestName.trim() ? guestName : "A guest";

    const subject = `${displayName} uploaded a new photo`;

    const html = emailLayout(`
<h1 style="font-size: 20px; margin-bottom: 16px;">New photo for ${escapeHtml(weddingName)}</h1>
<p style="margin: 4px 0; font-size: 15px;"><strong>${escapeHtml(displayName)}</strong> just uploaded a new photo to your gallery.</p>
`);

    return { subject, html };
}
