import {
    Armchair,
    Heart,
    LayoutGrid,
    Map as MapIcon,
    Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

/*
 * This mockup is meant to look like the real /admin/weddings/[id] "Guest
 * Seating" screen (components/admin/seating-management.tsx), not a
 * generic dashboard -- same tab bar (TabButton), same stat card style
 * (StatCard: rounded-[1.5rem], serif value, uppercase tracked label),
 * same avatar/RSVP badge colors (components/guest-avatar.tsx, the
 * confirmed/pending badge classes in seating-management.tsx). An earlier
 * version of this preview showed a left icon sidebar and a dark "app
 * screen" that don't exist anywhere in the real product -- worth keeping
 * this one honest as the real UI evolves, rather than letting it drift
 * back into an idealized screen no customer will actually see.
 */

function StatTile({ value, label }: { value: string; label: string }) {
    return (
        <div className="rounded-[1.1rem] border border-border/70 bg-card/80 p-3 shadow-sm">
            <span className="mb-2 block h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />

            <p className="font-serif text-xl font-light tracking-tight text-foreground">
                {value}
            </p>

            <p className="mt-0.5 text-[8px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {label}
            </p>
        </div>
    );
}

function TabPill({
                     active,
                     icon: Icon,
                     label,
                 }: {
    active?: boolean;
    icon: typeof Users;
    label: string;
}) {
    return (
        <div
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-medium ${
                active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground"
            }`}
        >
            <Icon className="h-3 w-3" strokeWidth={1.8} />
            {label}
        </div>
    );
}

const GUEST_ROWS = [
    {
        initials: "EW",
        name: "Emma Wilson",
        table: "Table 02",
        status: "confirmed",
    },
    {
        initials: "JC",
        name: "James Carter",
        table: "Table 04",
        status: "confirmed",
    },
    { initials: "ML", name: "Maria Lopez", table: "Unseated", status: "pending" },
] as const;

const AVATAR_COLORS: Record<string, string> = {
    EW: "bg-rose-100 text-rose-700",
    JC: "bg-blue-100 text-blue-700",
    ML: "bg-emerald-100 text-emerald-700",
};

function RsvpBadge({ status }: { status: "confirmed" | "pending" }) {
    if (status === "confirmed") {
        return (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[8px] font-medium text-emerald-700">
        Confirmed
      </span>
        );
    }

    return (
        <span className="rounded-full border border-border/70 bg-secondary/40 px-2 py-0.5 text-[8px] font-medium text-muted-foreground">
      Pending
    </span>
    );
}

export async function DashboardPreview() {
    const t = await getTranslations("landing");

    return (
        <div className="relative mx-auto w-full max-w-[700px]">
            <div
                aria-hidden
                className="absolute -inset-10 rounded-full bg-[hsl(var(--primary))]/10 blur-3xl"
            />

            <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card p-2 shadow-[0_35px_100px_-35px_rgba(39,28,24,0.35)]">
                {/* Browser header */}
                <div className="flex h-12 items-center justify-between border-b border-border/60 px-4">
                    <div className="flex gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-border" />
                        <span className="h-2.5 w-2.5 rounded-full bg-border" />
                        <span className="h-2.5 w-2.5 rounded-full bg-border" />
                    </div>

                    <div className="rounded-full bg-secondary px-4 py-1.5 text-[10px] text-muted-foreground">
                        wedora.app
                    </div>

                    <div className="w-10" />
                </div>

                {/* Screen -- mirrors the real Guest Seating admin page */}
                <div className="relative min-h-[460px] bg-[hsl(var(--cream))] p-5 sm:p-7">
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--primary))]">
                                {t("preview.eyebrow")}
                            </p>

                            <h3 className="mt-1 font-serif text-2xl">Sofia & James</h3>
                        </div>

                        <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white sm:flex">
                            <Heart className="h-3.5 w-3.5" fill="currentColor" />
                        </div>
                    </div>

                    {/* Tab bar */}
                    <div className="mb-4 flex w-fit gap-1 rounded-xl border border-border/70 bg-card/70 p-1 shadow-sm">
                        <TabPill active icon={Users} label={t("preview.tabGuests")} />
                        <TabPill icon={LayoutGrid} label={t("preview.tabTables")} />
                        <TabPill icon={MapIcon} label={t("preview.tabDesigner")} />
                    </div>

                    {/* Stats */}
                    <div className="mb-4 grid grid-cols-3 gap-2.5">
                        <StatTile value="128" label={t("preview.statTotal")} />
                        <StatTile value="96" label={t("preview.statSeated")} />
                        <StatTile value="32" label={t("preview.statUnseated")} />
                    </div>

                    {/* Guest list */}
                    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
                        {GUEST_ROWS.map((guest, index) => (
                            <div
                                key={guest.name}
                                className={`flex items-center justify-between gap-3 px-4 py-3 ${
                                    index !== GUEST_ROWS.length - 1
                                        ? "border-b border-border/50"
                                        : ""
                                }`}
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <div
                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/50 text-[9px] font-semibold shadow-sm ${AVATAR_COLORS[guest.initials]}`}
                                    >
                                        {guest.initials}
                                    </div>

                                    <div className="min-w-0">
                                        <p className="truncate text-[11px] font-medium text-foreground">
                                            {guest.name}
                                        </p>

                                        <p className="text-[9px] text-muted-foreground">
                                            {guest.table}
                                        </p>
                                    </div>
                                </div>

                                <RsvpBadge status={guest.status} />
                            </div>
                        ))}
                    </div>

                    {/* Guest-facing "find your seat" result -- light card,
                        matching components/guest-result-modal.tsx's actual
                        mobile layout (not a dark phone-screen mockup). */}
                    <div className="absolute -bottom-7 -right-3 w-[190px] rounded-[1.7rem] border border-border/70 bg-card p-3.5 shadow-2xl sm:-right-7 sm:w-[210px]">
                        <p className="mb-1.5 text-center text-[8px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                            {t("preview.yourSeatEyebrow")}
                        </p>

                        <p className="text-center font-serif text-base leading-tight text-foreground">
                            Emma Wilson
                        </p>

                        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-border/70 bg-background px-3 py-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--accent))]">
                                <Armchair
                                    className="h-3.5 w-3.5 text-[hsl(var(--primary))]"
                                    strokeWidth={1.6}
                                />
                            </div>

                            <div className="min-w-0">
                                <p className="text-[7px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                                    {t("preview.yourTable")}
                                </p>

                                <p className="font-serif text-sm text-foreground">Table 02</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
