"use client";

import { type FormEvent, useState, useTransition } from "react";

import { Armchair, Check, Heart, Loader2, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { submitGuestRsvpByTokenAction } from "@/actions/rsvp";
import { GuestAvatar } from "@/components/guest-avatar";
import { VenueMap } from "@/components/venue-map";
import { cn } from "@/lib/utils";
import type {
    GuestWithTable,
    RsvpStatus,
    Table,
    VenueElement,
} from "@/types/seating";

interface GuestPersonalLinkClientProps {
    guest: GuestWithTable;
    weddingSlug: string;
    token: string;
    tables: Table[];
    venueElements: VenueElement[];
    groomName: string;
    brideName: string;
}

const STATUS_OPTIONS: RsvpStatus[] = ["confirmed", "declined", "pending"];

export function GuestPersonalLinkClient({
                                            guest,
                                            weddingSlug,
                                            token,
                                            tables,
                                            venueElements,
                                            groomName,
                                            brideName,
                                        }: GuestPersonalLinkClientProps) {
    const t = useTranslations("guestLink");

    const [isPending, startTransition] = useTransition();

    const [status, setStatus] = useState<RsvpStatus>(guest.rsvp_status);

    const [partySize, setPartySize] = useState(
        guest.rsvp_party_size != null ? String(guest.rsvp_party_size) : "",
    );

    const [note, setNote] = useState(guest.rsvp_note ?? "");

    const [respondedAt, setRespondedAt] = useState(guest.rsvp_responded_at);

    const seatNumber =
        guest.table_seats?.seat_index != null
            ? guest.table_seats.seat_index + 1
            : null;

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        startTransition(async () => {
            const parsedPartySize =
                partySize.trim() === "" ? undefined : Number(partySize);

            const result = await submitGuestRsvpByTokenAction({
                weddingSlug,
                token,
                status,
                partySize: parsedPartySize,
                note: note.trim() === "" ? null : note,
            });

            if (!result.success) {
                toast.error(t("submitError"));

                return;
            }

            setRespondedAt(new Date().toISOString());

            toast.success(t("submitSuccess"));
        });
    };

    const initials =
        guest.initials ||
        `${guest.first_name?.[0] ?? ""}${guest.last_name?.[0] ?? ""}`.toUpperCase();

    return (
        <div className="mx-auto max-w-xl px-5 pb-32 pt-10 sm:px-6">
            {/* =====================================
                HEADER
            ===================================== */}
            <header className="text-center">
                <div className="mx-auto mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white shadow-sm">
                    <Heart
                        className="h-3.5 w-3.5"
                        fill="currentColor"
                        strokeWidth={1.5}
                    />
                </div>

                {(groomName || brideName) && (
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        {t("weddingOf", {
                            bride: brideName,
                            groom: groomName,
                        })}
                    </p>
                )}

                <div className="mx-auto flex flex-col items-center gap-3">
                    <GuestAvatar initials={initials} size="lg" />

                    <h1 className="font-serif text-3xl font-light tracking-[-0.02em] text-foreground">
                        {guest.first_name} {guest.last_name}
                    </h1>
                </div>
            </header>

            {/* =====================================
                SEAT ASSIGNMENT
            ===================================== */}
            <section className="mt-8 rounded-[1.75rem] border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6">
                {guest.tables ? (
                    <>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <AssignmentRow
                                icon={Armchair}
                                label={t("yourTable")}
                                value={String(guest.tables.number)}
                            />

                            {seatNumber != null && (
                                <AssignmentRow
                                    icon={MapPin}
                                    label={t("seat")}
                                    value={String(seatNumber)}
                                />
                            )}
                        </div>

                        <div className="mt-5">
                            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                {t("venueMap")}
                            </p>

                            <VenueMap
                                tables={tables}
                                venueElements={venueElements}
                                highlightedTableId={guest.table_id}
                                highlightedSeatId={guest.seat_id}
                                maxHeight={320}
                            />
                        </div>
                    </>
                ) : (
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                            <Armchair
                                className="h-4.5 w-4.5 text-[hsl(var(--primary))]"
                                strokeWidth={1.5}
                            />
                        </div>

                        <p className="font-serif text-lg font-light text-foreground">
                            {t("noTable")}
                        </p>

                        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                            {t("noTableDescription")}
                        </p>
                    </div>
                )}
            </section>

            {/* =====================================
                RSVP FORM
            ===================================== */}
            <section className="mt-6 rounded-[1.75rem] border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {t("rsvpTitle")}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                    {t("rsvpDescription")}
                </p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {STATUS_OPTIONS.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setStatus(option)}
                                className={cn(
                                    "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                                    status === option
                                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--accent))] text-[hsl(var(--primary))]"
                                        : "border-border/70 bg-background text-muted-foreground hover:bg-secondary/50",
                                )}
                            >
                                {status === option && <Check className="h-3.5 w-3.5" />}

                                {t(`rsvpStatus.${option}`)}
                            </button>
                        ))}
                    </div>

                    {status === "confirmed" && (
                        <div>
                            <label
                                htmlFor="party-size"
                                className="mb-1.5 block text-xs font-medium text-muted-foreground"
                            >
                                {t("partySizeLabel")}
                            </label>

                            <input
                                id="party-size"
                                type="number"
                                min={0}
                                max={50}
                                inputMode="numeric"
                                value={partySize}
                                onChange={(event) => setPartySize(event.target.value)}
                                placeholder={t("partySizePlaceholder")}
                                className="w-full rounded-xl border border-border/70 bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-[hsl(var(--primary))]"
                            />
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor="rsvp-note"
                            className="mb-1.5 block text-xs font-medium text-muted-foreground"
                        >
                            {t("noteLabel")}
                        </label>

                        <textarea
                            id="rsvp-note"
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            maxLength={500}
                            rows={3}
                            placeholder={t("notePlaceholder")}
                            className="w-full resize-none rounded-xl border border-border/70 bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-[hsl(var(--primary))]"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="btn-primary w-full justify-center disabled:opacity-60"
                    >
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4" />
                        )}

                        {isPending ? t("submitting") : t("submit")}
                    </button>

                    {respondedAt && (
                        <p className="text-center text-xs text-muted-foreground">
                            {t("lastResponded", {
                                date: new Date(respondedAt).toLocaleDateString(),
                            })}
                        </p>
                    )}
                </form>
            </section>
        </div>
    );
}

/*
 * ============================================
 * ASSIGNMENT ROW
 * ============================================
 */
function AssignmentRow({
                           icon: Icon,
                           label,
                           value,
                       }: {
    icon: typeof Armchair;
    label: string;
    value: string;
}) {
    return (
        <div className="flex flex-1 items-center gap-3 rounded-2xl border border-border/70 bg-background p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                <Icon
                    className="h-4 w-4 text-[hsl(var(--primary))]"
                    strokeWidth={1.6}
                />
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-[8px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {label}
                </p>

                <p className="mt-0.5 text-base font-medium tabular-nums text-foreground">
                    {value}
                </p>
            </div>
        </div>
    );
}
