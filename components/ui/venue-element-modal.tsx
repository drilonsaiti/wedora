"use client";

import { useState } from "react";

import { Check, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Modal } from "@/components/ui/modal";
import {
    VENUE_COLORS,
    VENUE_ICONS,
    VENUE_PRESETS,
    type VenueColorKey,
    type VenueIconKey,
} from "@/lib/venue-icons";
import { cn } from "@/lib/utils";
import type { VenueElementShape } from "@/types/seating";

interface VenueElementModalProps {
    open: boolean;
    onClose: () => void;
    onCreate: (data: {
        type: string;
        label: string;
        icon: VenueIconKey;
        shape: VenueElementShape;
        color: VenueColorKey;
    }) => void;
}

/*
 * Dedicated swatch colors.
 *
 * Don't derive these from VENUE_COLORS with
 * `.split(' ')` because that is fragile and
 * breaks as soon as the venue color classes change.
 */
const COLOR_SWATCHES: Record<VenueColorKey, string> = {
    blue: "bg-sky-500",
    rose: "bg-rose-500",
    purple: "bg-violet-500",
    amber: "bg-amber-500",
    gray: "bg-slate-500",
    green: "bg-emerald-500",
    teal: "bg-teal-500",
    pink: "bg-pink-500",
};

export function VenueElementModal({
                                      open,
                                      onClose,
                                      onCreate,
                                  }: VenueElementModalProps) {
    const t = useTranslations("seating.venueEditor");

    const tp = useTranslations("seating.venuePresets");

    const [label, setLabel] = useState("");

    const [icon, setIcon] = useState<VenueIconKey>("MapPin");

    const [shape, setShape] = useState<VenueElementShape>("square");

    const [color, setColor] = useState<VenueColorKey>("gray");

    const resetCustomForm = () => {
        setLabel("");
        setIcon("MapPin");
        setShape("square");
        setColor("gray");
    };

    const handlePresetClick = (preset: (typeof VENUE_PRESETS)[number]) => {
        onCreate({
            type: preset.type,
            label: preset.label,
            icon: preset.icon,
            shape: preset.shape,
            color: preset.color,
        });

        resetCustomForm();
        onClose();
    };

    const handleCustomCreate = () => {
        const trimmedLabel = label.trim();

        if (!trimmedLabel) {
            return;
        }

        onCreate({
            type: "custom",
            label: trimmedLabel,
            icon,
            shape,
            color,
        });

        resetCustomForm();
        onClose();
    };

    const handleClose = () => {
        resetCustomForm();
        onClose();
    };

    return (
        <Modal open={open} onClose={handleClose} maxWidth="max-w-xl">
            <div className="space-y-7">
                {/* =====================================
                    HEADER
                ===================================== */}
                <div>
                    <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                        {t("eyebrow")}
                    </p>

                    <h2 className="font-serif text-2xl font-light tracking-[-0.02em] text-foreground">
                        {t("title")}
                    </h2>

                    <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">
                        {t("description")}
                    </p>
                </div>

                {/* =====================================
                    QUICK PRESETS
                ===================================== */}
                <section>
                    <div className="mb-3">
                        <p className="label-wedding mb-0">{t("quickPresets")}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {VENUE_PRESETS.map((preset) => {
                            const Icon = VENUE_ICONS[preset.icon];

                            const translatedLabel = tp(
                                preset.type as
                                    | "entrance"
                                    | "pool"
                                    | "couple_table"
                                    | "music"
                                    | "bar"
                                    | "toilet",
                            );

                            return (
                                <button
                                    key={preset.type}
                                    type="button"
                                    onClick={() => handlePresetClick(preset)}
                                    className={cn(
                                        "group flex min-h-[72px] items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                                        "hover:-translate-y-0.5 hover:shadow-sm",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
                                        VENUE_COLORS[preset.color],
                                    )}
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm">
                                        <Icon className="h-4 w-4" strokeWidth={1.6} />
                                    </div>

                                    <span className="min-w-0 text-xs font-medium">
                    {translatedLabel}
                  </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Divider */}
                <div className="relative flex items-center gap-3">
                    <div className="h-px flex-1 bg-border/60" />

                    <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {t("orCustom")}
          </span>

                    <div className="h-px flex-1 bg-border/60" />
                </div>

                {/* =====================================
                    CUSTOM ELEMENT
                ===================================== */}
                <section className="space-y-5">
                    {/* NAME */}
                    <div>
                        <label htmlFor="venue-element-label" className="label-wedding">
                            {t("name")}
                        </label>

                        <input
                            id="venue-element-label"
                            type="text"
                            value={label}
                            onChange={(event) => setLabel(event.target.value)}
                            placeholder={t("namePlaceholder")}
                            className="input-wedding h-11"
                            maxLength={30}
                            autoComplete="off"
                        />

                        <div className="mt-1.5 flex justify-end">
              <span className="text-[9px] tabular-nums text-muted-foreground/70">
                {label.length}
                  /30
              </span>
                        </div>
                    </div>

                    {/* =================================
                        ICON
                    ================================= */}
                    <div>
                        <p className="label-wedding">{t("icon")}</p>

                        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                            {(Object.keys(VENUE_ICONS) as VenueIconKey[]).map((key) => {
                                const Icon = VENUE_ICONS[key];

                                const active = icon === key;

                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setIcon(key)}
                                        aria-label={t("selectIcon", {
                                            icon: key,
                                        })}
                                        aria-pressed={active}
                                        title={key}
                                        className={cn(
                                            "relative flex aspect-square items-center justify-center rounded-xl border transition-all",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",

                                            active
                                                ? "border-foreground/20 bg-foreground text-background shadow-sm"
                                                : "border-border/70 bg-background text-muted-foreground hover:bg-secondary hover:text-foreground",
                                        )}
                                    >
                                        <Icon className="h-4 w-4" strokeWidth={1.6} />

                                        {active && (
                                            <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background text-foreground">
                        <Check className="h-2.5 w-2.5" strokeWidth={2.3} />
                      </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* =================================
                        SHAPE
                    ================================= */}
                    <div>
                        <p className="label-wedding">{t("shape")}</p>

                        <div className="grid grid-cols-3 gap-2">
                            {(["circle", "square", "rectangle"] as const).map((item) => {
                                const active = shape === item;

                                return (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => setShape(item)}
                                        aria-pressed={active}
                                        className={cn(
                                            "flex min-h-16 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 transition-all",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",

                                            active
                                                ? "border-foreground/20 bg-secondary/70 text-foreground shadow-sm"
                                                : "border-border/70 bg-background text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
                                        )}
                                    >
                                        <ShapePreview shape={item} active={active} />

                                        <span className="text-[10px] font-medium">
                      {t(`shapes.${item}`)}
                    </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* =================================
                        COLOR
                    ================================= */}
                    <div>
                        <p className="label-wedding">{t("color")}</p>

                        <div className="flex flex-wrap gap-2.5">
                            {(Object.keys(VENUE_COLORS) as VenueColorKey[]).map((key) => {
                                const active = color === key;

                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setColor(key)}
                                        aria-label={t(`colors.${key}`)}
                                        aria-pressed={active}
                                        title={t(`colors.${key}`)}
                                        className={cn(
                                            "relative flex h-9 w-9 items-center justify-center rounded-full transition-all",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2",

                                            active
                                                ? "scale-110 ring-2 ring-foreground/25 ring-offset-2 ring-offset-background"
                                                : "hover:scale-105",
                                        )}
                                    >
                    <span
                        className={cn(
                            "h-7 w-7 rounded-full border border-black/[0.06] shadow-sm dark:border-white/[0.08]",
                            COLOR_SWATCHES[key],
                        )}
                    />

                                        {active && (
                                            <Check
                                                className="absolute h-3.5 w-3.5 text-white drop-shadow"
                                                strokeWidth={2.4}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* =================================
                        CREATE
                    ================================= */}
                    <button
                        type="button"
                        onClick={handleCustomCreate}
                        disabled={!label.trim()}
                        className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4" />

                        {t("create")}
                    </button>
                </section>
            </div>
        </Modal>
    );
}

function ShapePreview({
                          shape,
                          active,
                      }: {
    shape: VenueElementShape;
    active: boolean;
}) {
    return (
        <span
            aria-hidden
            className={cn(
                "block border transition-colors",
                active
                    ? "border-foreground bg-foreground/5"
                    : "border-muted-foreground/60",

                shape === "circle" && "h-5 w-5 rounded-full",

                shape === "square" && "h-5 w-5 rounded-md",

                shape === "rectangle" && "h-4 w-7 rounded-md",
            )}
        />
    );
}
