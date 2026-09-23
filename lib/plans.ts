/*
 * ============================================================
 * PLAN / ADD-ON ENTITLEMENTS -- single source of truth
 * ============================================================
 *
 * Weddings are still created manually by an admin (no payment processor is
 * wired up -- see components/pricing-section.tsx). This file is what turns
 * "this wedding is on the Premium plan, plus the multilingual add-on" into
 * a concrete set of booleans/limits the rest of the app can check.
 *
 * Two rules keep this from drifting out of sync with the marketing copy on
 * the pricing page and with the DB:
 *   1. PLAN_IDS / ADDON_IDS here must match the `check` constraints in
 *      supabase/migrations/20260923100000_wedding_plan_entitlements.sql.
 *   2. components/pricing-section.tsx imports its tier/add-on feature
 *      lists FROM here rather than hardcoding a second copy, so a plan
 *      can't advertise a feature this file doesn't actually grant.
 *
 * Everything here is pure data + pure functions -- no Supabase, no
 * 'use server' -- so it can be imported from client components, server
 * components and server actions alike, and unit tested directly.
 */

export const PLAN_IDS = ["basic", "premium", "unlimited", "custom"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const ADDON_IDS = [
    "tableArrangement",
    "photoGallery",
    "guestLimit",
    "multilingual",
    "extendedStorage",
    "bulkPhotoExport",
    "rsvpApiAccess",
    "qrCode",
    "personalGuestLinks",
] as const;
export type AddonId = (typeof ADDON_IDS)[number];

export interface WeddingEntitlements {
    guestLimit: number | null; // null = unlimited
    storageDays: number;
    tableArrangement: boolean;
    photoUpload: boolean;
    publicGallery: boolean;
    multilingual: boolean;
    bulkPhotoExport: boolean;
    rsvpApiAccess: boolean;
    qrCode: boolean;
    personalGuestLinks: boolean;
}

interface PlanDefinition {
    guestLimit: number | null;
    storageDays: number;
    features: Omit<WeddingEntitlements, "guestLimit" | "storageDays">;
}

/*
 * Base entitlements per plan. Matches components/pricing-section.tsx's
 * TIERS ownFeatureKeys: Basic = the core guest experience, Premium adds
 * the seating designer + photo gallery, Unlimited adds no caps +
 * multilingual + personal guest links (the highest-effort, most
 * differentiated feature -- see the monetization analysis doc), Custom
 * Design is Unlimited plus a bespoke design service (not a code feature,
 * so entitlement-wise it's identical to Unlimited).
 */
const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
    basic: {
        guestLimit: 150,
        storageDays: 30,
        features: {
            tableArrangement: false,
            photoUpload: false,
            publicGallery: false,
            multilingual: false,
            bulkPhotoExport: false,
            rsvpApiAccess: false,
            qrCode: false,
            personalGuestLinks: false,
        },
    },
    premium: {
        guestLimit: 300,
        storageDays: 90,
        features: {
            tableArrangement: true,
            photoUpload: true,
            publicGallery: true,
            multilingual: false,
            // Bulk export ships free in Premium+ (see the monetization
            // analysis doc) -- it's only an add-on for Basic.
            bulkPhotoExport: true,
            rsvpApiAccess: false,
            qrCode: false,
            personalGuestLinks: false,
        },
    },
    unlimited: {
        guestLimit: null,
        storageDays: 365,
        features: {
            tableArrangement: true,
            photoUpload: true,
            publicGallery: true,
            multilingual: true,
            bulkPhotoExport: true,
            rsvpApiAccess: false,
            qrCode: false,
            personalGuestLinks: true,
        },
    },
    custom: {
        guestLimit: null,
        storageDays: 365,
        features: {
            tableArrangement: true,
            photoUpload: true,
            publicGallery: true,
            multilingual: true,
            bulkPhotoExport: true,
            rsvpApiAccess: false,
            qrCode: false,
            personalGuestLinks: true,
        },
    },
};

/*
 * What each a la carte add-on unlocks, applied ON TOP OF the base plan
 * (never removes something the plan already grants). `qrCode` and
 * `rsvpApiAccess` are add-on-only by design -- no plan includes them for
 * free, matching the pricing page's "build your own" builder where they
 * only ever appear as toggles.
 */
function applyAddon(
    entitlements: WeddingEntitlements,
    addon: AddonId,
): WeddingEntitlements {
    switch (addon) {
        case "tableArrangement":
            return { ...entitlements, tableArrangement: true };
        case "photoGallery":
            return {
                ...entitlements,
                photoUpload: true,
                publicGallery: true,
            };
        case "guestLimit":
            return {
                ...entitlements,
                guestLimit:
                    entitlements.guestLimit === null
                        ? null
                        : Math.max(entitlements.guestLimit, 300),
            };
        case "multilingual":
            return { ...entitlements, multilingual: true };
        case "extendedStorage":
            return {
                ...entitlements,
                storageDays: Math.max(entitlements.storageDays, 365),
            };
        case "bulkPhotoExport":
            return { ...entitlements, bulkPhotoExport: true };
        case "rsvpApiAccess":
            return { ...entitlements, rsvpApiAccess: true };
        case "qrCode":
            return { ...entitlements, qrCode: true };
        case "personalGuestLinks":
            return { ...entitlements, personalGuestLinks: true };
        default:
            return entitlements;
    }
}

function isPlanId(value: string): value is PlanId {
    return (PLAN_IDS as readonly string[]).includes(value);
}

function isAddonId(value: string): value is AddonId {
    return (ADDON_IDS as readonly string[]).includes(value);
}

/*
 * Resolves a wedding's full entitlements from its raw `plan` + `addons`
 * DB columns. Deliberately tolerant of bad/unknown input (a plan value
 * that somehow isn't one of PLAN_IDS, or an addons array with a stray
 * string in it) -- falls back to the most restrictive plan (`basic`) and
 * ignores unrecognized addon ids, rather than throwing, since this runs
 * on every gated page/action and a malformed DB row should never turn
 * into a 500 or (worse) an entitlement bypass.
 */
export function getWeddingEntitlements(
    plan: string | null | undefined,
    addons: readonly string[] | null | undefined,
): WeddingEntitlements {
    const planId: PlanId = plan && isPlanId(plan) ? plan : "basic";

    const base = PLAN_DEFINITIONS[planId];

    let entitlements: WeddingEntitlements = {
        guestLimit: base.guestLimit,
        storageDays: base.storageDays,
        ...base.features,
    };

    for (const addon of addons ?? []) {
        if (isAddonId(addon)) {
            entitlements = applyAddon(entitlements, addon);
        }
    }

    return entitlements;
}
