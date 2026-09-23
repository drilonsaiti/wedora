import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

/*
 * `Resend` is called with `new Resend(...)` in lib/email.ts, so the mock
 * implementation must be a real constructor -- an arrow function has no
 * `[[Construct]]` internal method and throws "is not a constructor" under
 * `new`. vitest's own mocking used to paper over this by not actually
 * emulating `new`, but from vitest 4 it uses real construct semantics.
 */
vi.mock("resend", () => ({
    Resend: vi.fn().mockImplementation(function MockResend() {
        return {
            emails: { send: sendMock },
        };
    }),
}));

describe("getWeddingNotificationEmails", () => {
    it("returns both addresses when both are set", async () => {
        const { getWeddingNotificationEmails } = await import("@/lib/email");

        expect(
            getWeddingNotificationEmails({
                groom_email: "drilon@example.com",
                bride_email: "sara@example.com",
            }),
        ).toEqual(["drilon@example.com", "sara@example.com"]);
    });

    it("returns only the non-null address when one is missing", async () => {
        const { getWeddingNotificationEmails } = await import("@/lib/email");

        expect(
            getWeddingNotificationEmails({
                groom_email: null,
                bride_email: "sara@example.com",
            }),
        ).toEqual(["sara@example.com"]);

        expect(
            getWeddingNotificationEmails({
                groom_email: "drilon@example.com",
                bride_email: null,
            }),
        ).toEqual(["drilon@example.com"]);
    });

    it("returns an empty array when neither is set", async () => {
        const { getWeddingNotificationEmails } = await import("@/lib/email");

        expect(
            getWeddingNotificationEmails({ groom_email: null, bride_email: null }),
        ).toEqual([]);
    });
});

describe("sendEmail", () => {
    const originalApiKey = process.env.RESEND_API_KEY;

    beforeEach(() => {
        vi.resetModules();
        sendMock.mockReset();
    });

    afterEach(() => {
        if (originalApiKey === undefined) {
            delete process.env.RESEND_API_KEY;
        } else {
            process.env.RESEND_API_KEY = originalApiKey;
        }
    });

    it("does not throw and does not call Resend when RESEND_API_KEY is unset", async () => {
        delete process.env.RESEND_API_KEY;

        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        const { sendEmail } = await import("@/lib/email");

        await expect(
            sendEmail({ to: "couple@example.com", subject: "Hi", html: "<p>Hi</p>" }),
        ).resolves.toBeUndefined();

        expect(sendMock).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledTimes(1);

        warnSpy.mockRestore();
    });

    it("only warns once about a missing API key across multiple calls", async () => {
        delete process.env.RESEND_API_KEY;

        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        const { sendEmail } = await import("@/lib/email");

        await sendEmail({ to: "a@example.com", subject: "Hi", html: "<p>Hi</p>" });
        await sendEmail({ to: "b@example.com", subject: "Hi", html: "<p>Hi</p>" });
        await sendEmail({ to: "c@example.com", subject: "Hi", html: "<p>Hi</p>" });

        expect(warnSpy).toHaveBeenCalledTimes(1);

        warnSpy.mockRestore();
    });

    it("sends via Resend when RESEND_API_KEY is set", async () => {
        process.env.RESEND_API_KEY = "test-key";
        sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });

        const { sendEmail } = await import("@/lib/email");

        await sendEmail({
            to: "couple@example.com",
            subject: "New RSVP",
            html: "<p>hi</p>",
        });

        expect(sendMock).toHaveBeenCalledTimes(1);
        expect(sendMock).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "couple@example.com",
                subject: "New RSVP",
                html: "<p>hi</p>",
            }),
        );
    });

    it("never throws when the Resend API call itself fails", async () => {
        process.env.RESEND_API_KEY = "test-key";
        sendMock.mockRejectedValue(new Error("network down"));

        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const { sendEmail } = await import("@/lib/email");

        await expect(
            sendEmail({ to: "couple@example.com", subject: "Hi", html: "<p>Hi</p>" }),
        ).resolves.toBeUndefined();

        expect(errorSpy).toHaveBeenCalled();

        errorSpy.mockRestore();
    });

    it("never throws when Resend returns an error payload instead of throwing", async () => {
        process.env.RESEND_API_KEY = "test-key";
        sendMock.mockResolvedValue({
            data: null,
            error: { name: "validation_error", message: "invalid `to` field" },
        });

        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const { sendEmail } = await import("@/lib/email");

        await expect(
            sendEmail({ to: "not-an-email", subject: "Hi", html: "<p>Hi</p>" }),
        ).resolves.toBeUndefined();

        expect(errorSpy).toHaveBeenCalled();

        errorSpy.mockRestore();
    });
});

describe("rsvpNotificationEmail", () => {
    it("builds a subject and html mentioning the guest and status", async () => {
        const { rsvpNotificationEmail } = await import("@/lib/email");

        const { subject, html } = rsvpNotificationEmail({
            weddingName: "Sara & Drilon",
            guestName: "Elira Krasniqi",
            status: "confirmed",
            partySize: 2,
        });

        expect(subject).toContain("Elira Krasniqi");
        expect(html).toContain("Sara &amp; Drilon");
        expect(html).toContain("Elira Krasniqi");
        expect(html).toContain("2");
    });
});

describe("photoUploadNotificationEmail", () => {
    it('falls back to "A guest" when no guest name is provided', async () => {
        const { photoUploadNotificationEmail } = await import("@/lib/email");

        const { subject, html } = photoUploadNotificationEmail({
            weddingName: "Sara & Drilon",
            guestName: null,
        });

        expect(subject).toContain("A guest");
        expect(html).toContain("A guest");
    });
});
