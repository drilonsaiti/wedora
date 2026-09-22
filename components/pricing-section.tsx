"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

/*
 * ============================================================
 * PRICING DATA
 * ============================================================
 *
 * Every feature name below maps to something that actually exists in the
 * app today (see the comment on each). The earlier reference mockup for
 * this redesign also listed QR-code sharing, automatic email
 * notifications, a separate "story gallery", custom background audio, and
 * per-guest personalized links -- none of which are built yet. Advertising
 * those on a pricing page before they exist would be selling something we
 * can't deliver, so they were deliberately left out here rather than
 * copied in. If/when those get built, add them as their own tier feature
 * or builder add-on the same way the others are defined below.
 *
 * Prices were checked against comparable digital-invitation/RSVP products
 * (Greenvelope: one-time from $19, a 100-guest mailing $99, 250 guests
 * $249; RSVPify: ~$108/yr; InviteDrop: $15.99-$74.99 by guest count).
 * Wedora bundles considerably more than any single one of those (seating
 * designer, admin guest/RSVP dashboard, moderated photo gallery, 7-language
 * guest experience), so sitting in the same €49-€179 band as their
 * mid-tier offers is competitive, not overpriced.
 */

type TierId = "basic" | "premium" | "unlimited";

interface Tier {
    id: TierId;
    price: number;
    featured?: boolean;
    /** Feature keys new to this tier (on top of everything the previous tier has). */
    ownFeatureKeys: string[];
}

const TIERS: Tier[] = [
    {
        id: "basic",
        price: 49,
        // Digital invitation page (public /{locale}/{slug} wedding page), a
        // custom color theme (lib/theme.ts + color-picker), Find My Seat,
        // RSVP status tracking (seating-management.tsx), guest list, and a
        // shareable link that can be opened any number of times.
        ownFeatureKeys: [
            "digitalInvitation",
            "customTheme",
            "findSeat",
            "rsvpManagement",
            "guestList",
            "shareableLink",
        ],
    },
    {
        id: "premium",
        price: 89,
        featured: true,
        // Drag-and-drop seating designer, guest photo uploads, and the
        // shareable public photo gallery -- all already built.
        ownFeatureKeys: ["tableArrangement", "photoUpload", "publicGallery"],
    },
    {
        id: "unlimited",
        price: 179,
        // No guest cap, unlimited photo uploads, the guest-facing pages in
        // all 7 supported languages, and a full year of post-wedding storage.
        ownFeatureKeys: [
            "unlimitedGuests",
            "unlimitedPhotos",
            "multilingual",
            "extendedStorage",
        ],
    },
];

interface Addon {
    id: string;
    price: number;
}

// Each add-on turns on a real feature that's otherwise gated behind Premium
// or Unlimited, so a couple who only needs one or two extras isn't forced
// to buy the whole next tier up.
const ADDONS: Addon[] = [
    { id: "tableArrangement", price: 19 },
    { id: "photoGallery", price: 20 },
    { id: "guestLimit", price: 15 },
    { id: "multilingual", price: 15 },
    { id: "extendedStorage", price: 10 },
];

const BASE_PRICE = 49; // matches TIERS.basic.price

function formatEuro(amount: number) {
    return `€${amount}`;
}

/*
 * There is no payment processor wired up yet (Stripe doesn't support
 * Macedonia-based sellers, and no alternative gateway is live in this app
 * yet -- see the payment-provider research). So a plan "purchase" here
 * cannot actually charge anyone. Turning every CTA into a plain mailto link
 * (rather than a fake "Choose plan" button that pretended to start a
 * checkout) makes that honest: it opens a pre-filled email so the couple
 * can follow up and arrange payment manually, instead of expecting an
 * online checkout that isn't there.
 */
function planInquiryHref(planName: string, extra?: string) {
    const subject = `Wedora – ${planName} plan inquiry`;
    const body = extra ? `\n\n${extra}` : "";

    return `mailto:contact@wedora.com?subject=${encodeURIComponent(subject)}${
        body ? `&body=${encodeURIComponent(body)}` : ""
    }`;
}

export function PricingSection() {
    const t = useTranslations("pricing");

    const [enabledAddons, setEnabledAddons] = useState<Record<string, boolean>>(
        {},
    );

    const addonsTotal = useMemo(
        () =>
            ADDONS.reduce(
                (sum, addon) => sum + (enabledAddons[addon.id] ? addon.price : 0),
                0,
            ),
        [enabledAddons],
    );

    const customTotal = BASE_PRICE + addonsTotal;

    function toggleAddon(id: string) {
        setEnabledAddons((current) => ({ ...current, [id]: !current[id] }));
    }

    return (
        <div className="mx-auto w-full max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
                <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.25em] text-[hsl(var(--primary))]">
                    {t("eyebrow")}
                </p>

                <h2 className="font-serif text-4xl font-light tracking-tight sm:text-5xl">
                    {t("title")}
                </h2>

                <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
                    {t("description")}
                </p>

                <p className="mx-auto mt-4 max-w-xl rounded-full border border-border/70 bg-secondary/60 px-4 py-2 text-xs leading-5 text-muted-foreground">
                    {t("paymentNotice")}
                </p>
            </div>

            {/* =====================================
                TIER CARDS
            ===================================== */}
            <div className="mt-14 grid gap-5 lg:grid-cols-4">
                {TIERS.map((tier, tierIndex) => {
                    const previousTier = TIERS[tierIndex - 1];

                    return (
                        <article
                            key={tier.id}
                            className={cn(
                                "relative flex min-h-[560px] flex-col rounded-[2rem] border bg-card p-7 transition duration-300 md:p-8",
                                tier.featured
                                    ? "border-[hsl(var(--primary))]/45 shadow-[0_25px_70px_-35px_rgba(130,60,78,0.45)] lg:-translate-y-3"
                                    : "border-border/70 shadow-sm hover:-translate-y-1 hover:shadow-lg",
                            )}
                        >
                            {tier.featured && (
                                <span className="absolute right-6 top-6 rounded-full bg-[hsl(var(--accent))] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">
                  {t("mostPopular")}
                </span>
                            )}

                            <div>
                                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                    {t(`tiers.${tier.id}.eyebrow`)}
                                </p>

                                <h3 className="mt-3 font-serif text-3xl font-light">
                                    {t(`tiers.${tier.id}.name`)}
                                </h3>

                                <p className="mt-3 min-h-[48px] max-w-xs text-sm leading-6 text-muted-foreground">
                                    {t(`tiers.${tier.id}.description`)}
                                </p>
                            </div>

                            <div className="my-8 border-y border-border/70 py-6">
                                <div className="flex items-end gap-2">
                  <span className="font-serif text-5xl font-light tracking-tight">
                    {formatEuro(tier.price)}
                  </span>

                                    <span className="pb-1.5 text-xs text-muted-foreground">
                    {t("perWedding")}
                  </span>
                                </div>
                            </div>

                            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                {previousTier
                                    ? t("everythingInPlus", {
                                        plan: t(`tiers.${previousTier.id}.name`),
                                    })
                                    : t("included")}
                            </p>

                            <ul className="mb-8 space-y-3.5">
                                {tier.ownFeatureKeys.map((feature) => (
                                    <li key={feature} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
                      <Check className="h-3 w-3" />
                    </span>

                                        <span className="text-sm leading-5">
                      {t(`features.${feature}`)}
                    </span>
                                    </li>
                                ))}
                            </ul>

                            <a
                                href={planInquiryHref(t(`tiers.${tier.id}.name`))}
                                className={cn(
                                    "mt-auto flex w-full items-center justify-center rounded-full px-6 py-3.5 text-sm font-medium transition",
                                    tier.featured
                                        ? "bg-[hsl(var(--primary))] text-white hover:opacity-90"
                                        : "border border-border bg-background hover:bg-secondary",
                                )}
                            >
                                {tier.id === "basic"
                                    ? t("getStarted")
                                    : t("choosePlan", {
                                        plan: t(`tiers.${tier.id}.name`),
                                    })}
                            </a>
                        </article>
                    );
                })}

                {/* Custom design -- a bespoke design service, not a software
                    feature, so it's real regardless of what's shipped in code. */}
                <article className="relative flex min-h-[560px] flex-col rounded-[2rem] border border-dashed border-border/70 bg-secondary/40 p-7 md:p-8">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            {t("tiers.custom.eyebrow")}
                        </p>

                        <h3 className="mt-3 font-serif text-3xl font-light">
                            {t("tiers.custom.name")}
                        </h3>

                        <p className="mt-3 min-h-[48px] max-w-xs text-sm leading-6 text-muted-foreground">
                            {t("tiers.custom.description")}
                        </p>
                    </div>

                    <div className="my-8 border-y border-border/70 py-6">
            <span className="font-serif text-3xl font-light tracking-tight text-[hsl(var(--primary))]">
              {t("onRequest")}
            </span>
                    </div>

                    <ul className="mb-8 space-y-3.5">
                        {(["customLayout", "dedicatedSupport"] as const).map((feature) => (
                            <li key={feature} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
                  <Check className="h-3 w-3" />
                </span>

                                <span className="text-sm leading-5">
                  {t(`features.${feature}`)}
                </span>
                            </li>
                        ))}

                        <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
                <Check className="h-3 w-3" />
              </span>

                            <span className="text-sm leading-5">
                {t("everythingIn", {
                    plan: t("tiers.unlimited.name"),
                })}
              </span>
                        </li>
                    </ul>

                    <a
                        href={planInquiryHref(t("tiers.custom.name"))}
                        className="mt-auto flex w-full items-center justify-center rounded-full border border-[hsl(var(--primary))]/40 bg-background px-6 py-3.5 text-sm font-medium text-[hsl(var(--primary))] transition hover:bg-[hsl(var(--accent))]"
                    >
                        {t("contactUs")}
                    </a>
                </article>
            </div>

            {/* =====================================
                BUILD YOUR OWN
            ===================================== */}
            <div className="mt-16 rounded-[2rem] border border-border/70 bg-card p-6 md:p-10">
                <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-[hsl(var(--primary))]">
                    {t("builder.eyebrow")}
                </p>

                <h3 className="mt-2 font-serif text-2xl font-light tracking-tight sm:text-3xl">
                    {t("builder.title")}
                </h3>

                <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-3">
                        {ADDONS.map((addon) => {
                            const enabled = Boolean(enabledAddons[addon.id]);

                            return (
                                <label
                                    key={addon.id}
                                    className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border/60 bg-secondary/40 p-4"
                                >
                                    <div>
                                        <p className="text-sm font-medium">
                                            {t(`builder.addons.${addon.id}.name`)}
                                        </p>

                                        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                                            {t(`builder.addons.${addon.id}.description`)}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-medium text-[hsl(var(--primary))]">
                      +{formatEuro(addon.price)}
                    </span>

                                        {/*
                                          A native checkbox input, visually hidden, driving the
                                          switch look via `peer-checked:`. The earlier version
                                          used a plain <button role="switch"> with its checked
                                          state driven entirely by manually re-computed Tailwind
                                          classes on every render -- functionally fine, but it
                                          reimplemented behavior (keyboard toggling, checked-state
                                          semantics) that a native <input type="checkbox"> already
                                          gets right for free, and it's easy for the visual state
                                          to drift from the real `enabled` value across re-renders.
                                          `peer-checked:` reads the actual DOM checked state
                                          directly, so the switch can't visually disagree with it.
                                        */}
                                        <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full">
                      <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => toggleAddon(addon.id)}
                          aria-label={t(`builder.addons.${addon.id}.name`)}
                          className="peer sr-only"
                      />

                      <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-full bg-muted transition-colors peer-checked:bg-[hsl(var(--primary))]"
                      />

                      <span
                          aria-hidden
                          className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-[22px]"
                      />
                    </span>
                                    </div>
                                </label>
                            );
                        })}
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-secondary/40 p-6">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {t("builder.summaryTitle")}
                        </p>

                        <p className="mt-3 font-serif text-4xl font-light tracking-tight">
                            {formatEuro(customTotal)}
                        </p>

                        <p className="text-xs text-muted-foreground">
                            {t("builder.oneTimePayment")}
                        </p>

                        <div className="mt-5 space-y-2 border-t border-border/70 pt-4 text-xs">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span>{t("builder.baseLabel")}</span>
                                <span>{formatEuro(BASE_PRICE)}</span>
                            </div>

                            {ADDONS.filter((addon) => enabledAddons[addon.id]).map(
                                (addon) => (
                                    <div
                                        key={addon.id}
                                        className="flex items-center justify-between text-muted-foreground"
                                    >
                                        <span>{t(`builder.addons.${addon.id}.name`)}</span>
                                        <span>+{formatEuro(addon.price)}</span>
                                    </div>
                                ),
                            )}

                            <div className="flex items-center justify-between border-t border-border/70 pt-2 font-medium text-foreground">
                                <span>{t("builder.total")}</span>
                                <span>{formatEuro(customTotal)}</span>
                            </div>
                        </div>

                        <div className="mt-5 rounded-xl bg-background/70 p-4">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                {t("builder.alwaysIncluded")}
                            </p>

                            <ul className="mt-2 space-y-1.5">
                                {TIERS[0].ownFeatureKeys.map((feature) => (
                                    <li
                                        key={feature}
                                        className="flex items-center gap-2 text-xs text-muted-foreground"
                                    >
                                        <Check className="h-3 w-3 shrink-0 text-[hsl(var(--primary))]" />
                                        {t(`features.${feature}`)}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <a
                            href={planInquiryHref(
                                t("builder.summaryTitle"),
                                `${t("builder.baseLabel")}: ${formatEuro(
                                    BASE_PRICE,
                                )}\n${ADDONS.filter((addon) => enabledAddons[addon.id])
                                    .map(
                                        (addon) =>
                                            `+ ${t(
                                                `builder.addons.${addon.id}.name`,
                                            )}: +${formatEuro(addon.price)}`,
                                    )
                                    .join("\n")}\n${t(
                                    "builder.total",
                                )}: ${formatEuro(customTotal)}`,
                            )}
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-6 py-3.5 text-sm font-medium text-white transition hover:opacity-90"
                        >
                            {t("builder.cta")}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
