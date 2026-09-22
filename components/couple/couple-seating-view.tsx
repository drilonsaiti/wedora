"use client";

import {
    Armchair,
    Heart,
    Images,
    LayoutGrid,
    LogOut,
    Users,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { signOutAction } from "@/actions/admin";
import { VenueMap } from "@/components/venue-map";
import { Link } from "@/lib/navigation";
import type { GuestWithTable, Table, VenueElement } from "@/types/seating";

interface CoupleSeatingViewProps {
    guests: GuestWithTable[];
    tables: Table[];
    venueElements: VenueElement[];
    weddingId: string;
}

export function CoupleSeatingView({
                                      guests,
                                      tables,
                                      venueElements,
                                      weddingId,
                                  }: CoupleSeatingViewProps) {
    const t = useTranslations("couple.seating");

    const seatedCount = guests.filter((guest) => guest.table_id).length;

    const unseatedCount = guests.length - seatedCount;

    const seatedPercentage =
        guests.length > 0 ? Math.round((seatedCount / guests.length) * 100) : 0;

    return (
        <div className="relative min-h-screen overflow-hidden bg-background">
            {/* Ambient background */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-[-320px] h-[650px] w-[900px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/20 blur-[150px]" />
            </div>

            {/* HEADER */}
            <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
                    {/* Brand */}
                    <Link
                        href={`/couple/weddings/${weddingId}`}
                        className="flex items-center gap-2.5"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white shadow-sm">
                            <Heart className="h-3.5 w-3.5" fill="currentColor" />
                        </div>

                        <span className="font-serif text-xl tracking-tight text-foreground">
              Wedora
            </span>
                    </Link>

                    {/* Navigation */}
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/couple/weddings/${weddingId}/photos`}
                            className="hidden h-9 items-center gap-2 rounded-full px-4 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground md:flex"
                        >
                            <Images className="h-3.5 w-3.5" strokeWidth={1.6} />

                            {t("photos")}
                        </Link>

                        <button
                            type="button"
                            onClick={() => void signOutAction("couple")}
                            className="flex h-9 items-center gap-2 rounded-full border border-border/70 bg-card px-3.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                        >
                            <LogOut className="h-3.5 w-3.5" strokeWidth={1.6} />

                            <span className="hidden sm:inline">{t("logout")}</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* CONTENT */}
            <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
                {/* Page heading */}
                <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                    <div>
                        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                            {t("eyebrow")}
                        </p>

                        <h1 className="font-serif text-4xl font-light tracking-[-0.025em] text-foreground sm:text-5xl">
                            {t("title")}
                        </h1>

                        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                            {t("description")}
                        </p>
                    </div>

                    <Link
                        href={`/couple/weddings/${weddingId}/photos`}
                        className="btn-secondary w-full justify-center sm:w-auto md:hidden"
                    >
                        <Images className="h-4 w-4" />

                        {t("photos")}
                    </Link>
                </div>

                {/* Stats */}
                <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard
                        icon={Users}
                        label={t("stats.guests")}
                        value={guests.length}
                    />

                    <StatCard
                        icon={Armchair}
                        label={t("stats.seated")}
                        value={seatedCount}
                    />

                    <StatCard
                        icon={LayoutGrid}
                        label={t("stats.tables")}
                        value={tables.length}
                    />

                    <StatCard
                        icon={Users}
                        label={t("stats.unseated")}
                        value={unseatedCount}
                    />
                </section>

                {/* Seating progress */}
                <section className="mb-6 rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm backdrop-blur">
                    <div className="mb-3 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-medium text-foreground">
                                {t("seatingProgress")}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                                {t("seatedCount", {
                                    seated: seatedCount,
                                    total: guests.length,
                                })}
                            </p>
                        </div>

                        <span className="font-serif text-2xl font-light text-foreground">
              {seatedPercentage}%
            </span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                            className="h-full rounded-full bg-[hsl(var(--primary))] transition-[width] duration-500"
                            style={{
                                width: `${seatedPercentage}%`,
                            }}
                        />
                    </div>
                </section>

                {/* Venue Map */}
                <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/85 shadow-sm backdrop-blur">
                    <div className="flex items-center justify-between border-b border-border/60 px-5 py-5 sm:px-7">
                        <div>
                            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                {t("venueEyebrow")}
                            </p>

                            <h2 className="mt-1 font-serif text-2xl font-light tracking-tight text-foreground">
                                {t("venueTitle")}
                            </h2>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                            <LayoutGrid
                                className="h-4 w-4 text-[hsl(var(--primary))]"
                                strokeWidth={1.6}
                            />
                        </div>
                    </div>

                    <div className="bg-background/40 p-3 sm:p-5">
                        <div className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-background">
                            <VenueMap
                                tables={tables}
                                venueElements={venueElements}
                                highlightedTableId={null}
                                maxHeight={700}
                            />
                        </div>
                    </div>
                </section>

                {/* Guests */}
                <section className="mt-8">
                    <div className="mb-4 flex items-end justify-between">
                        <div>
                            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                {t("guestEyebrow")}
                            </p>

                            <h2 className="mt-1 font-serif text-2xl font-light tracking-tight text-foreground">
                                {t("guests", {
                                    count: guests.length,
                                })}
                            </h2>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/80 shadow-sm backdrop-blur">
                        {guests.length > 0 ? (
                            <div className="divide-y divide-border/60">
                                {guests.map((guest) => (
                                    <GuestRow
                                        key={guest.id}
                                        guest={guest}
                                        tableLabel={
                                            guest.tables
                                                ? t("table", {
                                                    number: guest.tables.number,
                                                })
                                                : t("noTable")
                                        }
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="px-6 py-12 text-center">
                                <Users
                                    className="mx-auto h-5 w-5 text-muted-foreground"
                                    strokeWidth={1.5}
                                />

                                <p className="mt-3 text-sm text-muted-foreground">
                                    {t("emptyGuests")}
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Footer */}
                <p className="mt-12 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
                    Wedora
                </p>
            </main>
        </div>
    );
}

function StatCard({
                      icon: Icon,
                      label,
                      value,
                  }: {
    icon: typeof Users;
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-[1.4rem] border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur sm:p-5">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                <Icon
                    className="h-4 w-4 text-[hsl(var(--primary))]"
                    strokeWidth={1.6}
                />
            </div>

            <p className="font-serif text-3xl font-light tracking-tight text-foreground">
                {value}
            </p>

            <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                {label}
            </p>
        </div>
    );
}

function GuestRow({
                      guest,
                      tableLabel,
                  }: {
    guest: GuestWithTable;
    tableLabel: string;
}) {
    const seated = Boolean(guest.table_id);

    return (
        <div className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-secondary/30 sm:px-6">
            <div className="flex min-w-0 items-center gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-medium uppercase text-foreground">
                    {guest.initials ??
                        `${guest.first_name?.[0] ?? ""}${guest.last_name?.[0] ?? ""}`}
                </div>

                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                        {guest.first_name} {guest.last_name}
                    </p>

                    <p className="mt-0.5 text-[10px] text-muted-foreground sm:hidden">
                        {tableLabel}
                    </p>
                </div>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
        <span
            className={
                seated
                    ? "h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]"
                    : "h-1.5 w-1.5 rounded-full bg-border"
            }
        />

                <span
                    className={
                        seated ? "text-xs text-foreground" : "text-xs text-muted-foreground"
                    }
                >
          {tableLabel}
        </span>
            </div>
        </div>
    );
}
