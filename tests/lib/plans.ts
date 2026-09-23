import { describe, expect, it } from "vitest";

import { getWeddingEntitlements } from "@/lib/plans";

describe("getWeddingEntitlements", () => {
    it("grants the base Basic entitlements with no add-ons", () => {
        const entitlements = getWeddingEntitlements("basic", []);

        expect(entitlements).toEqual({
            guestLimit: 150,
            storageDays: 30,
            tableArrangement: false,
            photoUpload: false,
            publicGallery: false,
            multilingual: false,
            bulkPhotoExport: false,
            rsvpApiAccess: false,
            qrCode: false,
            personalGuestLinks: false,
        });
    });

    it("grants Premium its higher guest limit and photo features, but not the Unlimited-only ones", () => {
        const entitlements = getWeddingEntitlements("premium", []);

        expect(entitlements.guestLimit).toBe(300);
        expect(entitlements.storageDays).toBe(90);
        expect(entitlements.tableArrangement).toBe(true);
        expect(entitlements.photoUpload).toBe(true);
        expect(entitlements.publicGallery).toBe(true);
        expect(entitlements.bulkPhotoExport).toBe(true);
        expect(entitlements.multilingual).toBe(false);
        expect(entitlements.personalGuestLinks).toBe(false);
    });

    it("grants Unlimited an uncapped guest limit and every feature except add-on-only ones", () => {
        const entitlements = getWeddingEntitlements("unlimited", []);

        expect(entitlements.guestLimit).toBeNull();
        expect(entitlements.storageDays).toBe(365);
        expect(entitlements.multilingual).toBe(true);
        expect(entitlements.personalGuestLinks).toBe(true);
        expect(entitlements.rsvpApiAccess).toBe(false);
        expect(entitlements.qrCode).toBe(false);
    });

    it("treats Custom identically to Unlimited, feature-wise", () => {
        const custom = getWeddingEntitlements("custom", []);
        const unlimited = getWeddingEntitlements("unlimited", []);

        expect(custom).toEqual(unlimited);
    });

    it("layers add-ons on top of the base plan without removing anything the plan already grants", () => {
        const entitlements = getWeddingEntitlements("basic", [
            "rsvpApiAccess",
            "qrCode",
            "personalGuestLinks",
        ]);

        expect(entitlements.rsvpApiAccess).toBe(true);
        expect(entitlements.qrCode).toBe(true);
        expect(entitlements.personalGuestLinks).toBe(true);
        // still Basic otherwise
        expect(entitlements.tableArrangement).toBe(false);
        expect(entitlements.publicGallery).toBe(false);
    });

    it("the photoGallery add-on unlocks both photo upload and public gallery together", () => {
        const entitlements = getWeddingEntitlements("basic", ["photoGallery"]);

        expect(entitlements.photoUpload).toBe(true);
        expect(entitlements.publicGallery).toBe(true);
    });

    it("the guestLimit add-on raises a capped plan to at least 300, but never lowers an uncapped one", () => {
        const basicWithAddon = getWeddingEntitlements("basic", ["guestLimit"]);
        expect(basicWithAddon.guestLimit).toBe(300);

        const premiumWithAddon = getWeddingEntitlements("premium", ["guestLimit"]);
        expect(premiumWithAddon.guestLimit).toBe(300);

        const unlimitedWithAddon = getWeddingEntitlements("unlimited", [
            "guestLimit",
        ]);
        expect(unlimitedWithAddon.guestLimit).toBeNull();
    });

    it("the extendedStorage add-on raises storageDays to at least 365", () => {
        const entitlements = getWeddingEntitlements("basic", ["extendedStorage"]);

        expect(entitlements.storageDays).toBe(365);
    });

    it("ignores unrecognized add-on ids instead of throwing", () => {
        expect(() =>
            getWeddingEntitlements("basic", ["not-a-real-addon"]),
        ).not.toThrow();

        const entitlements = getWeddingEntitlements("basic", ["not-a-real-addon"]);
        expect(entitlements.tableArrangement).toBe(false);
    });

    it("falls back to the most restrictive plan (basic) for an unrecognized plan id", () => {
        const entitlements = getWeddingEntitlements("enterprise", []);

        expect(entitlements).toEqual(getWeddingEntitlements("basic", []));
    });

    it("falls back to basic for null/undefined plan and addons rather than throwing", () => {
        expect(() => getWeddingEntitlements(null, null)).not.toThrow();
        expect(() => getWeddingEntitlements(undefined, undefined)).not.toThrow();

        expect(getWeddingEntitlements(null, null)).toEqual(
            getWeddingEntitlements("basic", []),
        );
    });
});
