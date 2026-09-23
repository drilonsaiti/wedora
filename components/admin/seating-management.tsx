"use client";

import {
    type ChangeEvent,
    type ReactNode,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
} from "react";

import { useVirtualizer } from "@tanstack/react-virtual";
import dynamic from "next/dynamic";
import {
    ArrowLeft,
    Download,
    Edit2,
    Images,
    KeyRound,
    LayoutGrid,
    Link2,
    Loader2,
    Map as MapIcon,
    Plus,
    Printer,
    Search,
    Trash2,
    Upload,
    Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Papa from "papaparse";

import {
    bulkImportGuestsAction,
    deleteGuest,
    deleteTable,
    type RsvpTrendPoint,
} from "@/actions/seating";
import { updateGuestRsvpAction } from "@/actions/rsvp";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getWeddingEntitlements } from "@/lib/plans";
import { GuestForm } from "@/components/admin/guest-form";
import { RsvpTrendChart } from "@/components/admin/rsvp-trend-chart";
import { TableForm } from "@/components/admin/table-form";
import { GuestAvatar } from "@/components/guest-avatar";
import { Modal } from "@/components/ui/modal";
import { Link, useRouter } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type {
    GuestWithTable,
    TableWithSeats,
    VenueElement,
} from "@/types/seating";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

/*
 * Dynamic designer loading component.
 *
 * Keeping useTranslations inside a proper
 * React component also keeps the hook usage
 * clean.
 */
function SeatingDesignerLoading() {
    const t = useTranslations("seating");

    return (
        <div className="flex min-h-[600px] flex-1 items-center justify-center bg-secondary/20">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />

                <p className="text-xs text-muted-foreground">{t("loadingDesigner")}</p>
            </div>
        </div>
    );
}

const SeatingDesigner = dynamic(
    () =>
        import("@/components/admin/designer/seating-designer").then(
            (module) => module.SeatingDesigner,
        ),
    {
        loading: SeatingDesignerLoading,
        ssr: false,
    },
);

/*
 * CSV EXPORT
 *
 * Hand-rolled, RFC 4149-style escaping: a field is wrapped in
 * quotes when it contains a comma, quote or newline, and any
 * embedded quote is doubled. No dependency needed for building
 * a CSV this simple -- parsing untrusted uploads is a different
 * matter (see the papaparse import used for CSV import below).
 */
function escapeCsvField(value: string): string {
    if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
}

function buildGuestsCsv(
    guests: GuestWithTable[],
    headers: [string, string, string, string, string],
): string {
    const rows = [
        headers,
        ...guests.map((guest) => [
            guest.first_name ?? "",
            guest.last_name ?? "",
            guest.rsvp_status ?? "",
            guest.rsvp_party_size != null ? String(guest.rsvp_party_size) : "",
            guest.tables ? String(guest.tables.number) : "",
        ]),
    ];

    return rows
        .map((row) => row.map((field) => escapeCsvField(field)).join(","))
        .join("\r\n");
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
    /*
     * Leading BOM helps Excel correctly detect UTF-8 when the
     * file is reopened there instead of guessing Latin-1.
     */
    const blob = new Blob(["﻿", content], {
        type: mimeType,
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/*
 * CSV IMPORT
 *
 * Matches header columns case-insensitively and tolerates any
 * reasonable header order/spelling for the two required
 * columns. Returns null when no usable name column was found
 * at all, so the caller can show a clear error instead of
 * silently importing zero guests.
 */
const FIRST_NAME_HEADER_ALIASES = [
    "firstname",
    "first_name",
    "first",
    "given_name",
    "givenname",
];

const LAST_NAME_HEADER_ALIASES = [
    "lastname",
    "last_name",
    "last",
    "surname",
    "family_name",
    "familyname",
];

function normalizeHeader(header: string): string {
    return header
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

function parseGuestsCsv(csvText: string): {
    rows: {
        firstName: string;
        lastName: string;
    }[];
    error: "empty" | "noNameColumns" | null;
} {
    const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader,
    });

    const fields = parsed.meta.fields ?? [];

    if (fields.length === 0) {
        return {
            rows: [],
            error: "empty",
        };
    }

    const firstNameKey = fields.find((field) =>
        FIRST_NAME_HEADER_ALIASES.includes(field),
    );

    const lastNameKey = fields.find((field) =>
        LAST_NAME_HEADER_ALIASES.includes(field),
    );

    if (!firstNameKey && !lastNameKey) {
        return {
            rows: [],
            error: "noNameColumns",
        };
    }

    const rows = (parsed.data ?? []).map((row) => ({
        firstName: (firstNameKey ? row[firstNameKey] : "")?.trim() ?? "",

        lastName: (lastNameKey ? row[lastNameKey] : "")?.trim() ?? "",
    }));

    return {
        rows,
        error: null,
    };
}

interface WeddingContext {
    id: string;
    groom_name: string | null;
    bride_name: string | null;
    slug: string | null;
    plan?: string | null;
    addons?: string[] | null;
}

interface SeatingManagementProps {
    wedding: WeddingContext;
    locale: string;
    initialGuests: GuestWithTable[];
    initialTables: TableWithSeats[];
    initialVenueElements: VenueElement[];
    rsvpTrend: RsvpTrendPoint[];
}

type Tab = "guests" | "tables" | "designer";

/*
 * Builds a guest's personal link
 * (/{locale}/{slug}/g/{guest_token}), matching the share-URL pattern
 * QrCodeCard uses for the wedding's own invitation link.
 */
function buildGuestPersonalLink(
    locale: string,
    slug: string,
    guestToken: string,
) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

    return `${appUrl}/${locale}/${slug}/g/${guestToken}`;
}

export function SeatingManagement({
                                      wedding,
                                      locale,
                                      initialGuests,
                                      initialTables,
                                      initialVenueElements,
                                      rsvpTrend,
                                  }: SeatingManagementProps) {
    "use no memo";

    const router = useRouter();

    const t = useTranslations("seating");

    const td = useTranslations("dashboard");

    const tc = useTranslations("common");

    /*
     * UI-level gating only -- purely cosmetic (hides a button/tab this
     * wedding's plan doesn't include). The actual enforcement is
     * server-side: getGuestByToken()/submitGuestRsvpByTokenAction() in
     * actions/seating.ts + actions/rsvp.ts re-check this same
     * entitlement independently, and addTable()/createVenueElement()
     * re-check tableArrangement independently, so a disallowed action
     * is rejected on the backend even if this hidden button were somehow
     * still triggered.
     */
    const entitlements = getWeddingEntitlements(wedding.plan, wedding.addons);

    const [isPending, startTransition] = useTransition();

    const [activeTab, setActiveTab] = useState<Tab>("guests");

    const [searchQuery, setSearchQuery] = useState("");

    /*
     * Modal state
     */
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);

    const [isTableModalOpen, setIsTableModalOpen] = useState(false);

    const [editingGuest, setEditingGuest] = useState<GuestWithTable | null>(null);

    const [editingTable, setEditingTable] = useState<TableWithSeats | null>(null);

    const [guestToDelete, setGuestToDelete] = useState<{
        id: string;
        name: string;
    } | null>(null);

    const [tableToDelete, setTableToDelete] = useState<{
        id: string;
        number: number;
    } | null>(null);

    const [rsvpUpdatingId, setRsvpUpdatingId] = useState<string | null>(null);

    const [isImportingCsv, setIsImportingCsv] = useState(false);

    const csvFileInputRef = useRef<HTMLInputElement>(null);

    /*
     * Optimistic RSVP override, keyed by guest id.
     *
     * `initialGuests` only reflects the new status once
     * router.refresh()'s server round-trip commits, but
     * `setRsvpUpdatingId(null)` in handleRsvpCycle's
     * `finally` runs right away -- so without this, the
     * button flips back to its non-loading state still
     * showing the OLD status for a beat, and only catches
     * up to the truth on the next unrelated re-render
     * (e.g. clicking another guest's button). This holds
     * the status the admin just chose until the refreshed
     * `initialGuests` prop actually agrees with it.
     */
    const [optimisticRsvp, setOptimisticRsvp] = useState<
        Record<string, GuestWithTable["rsvp_status"]>
    >({});

    useEffect(() => {
        setOptimisticRsvp((current) => {
            if (Object.keys(current).length === 0) {
                return current;
            }

            const next = { ...current };
            let changed = false;

            for (const guest of initialGuests) {
                if (
                    next[guest.id] !== undefined &&
                    next[guest.id] === guest.rsvp_status
                ) {
                    delete next[guest.id];
                    changed = true;
                }
            }

            return changed ? next : current;
        });
    }, [initialGuests]);

    /*
     * Wedding name
     */
    const weddingName =
        [wedding.groom_name, wedding.bride_name].filter(Boolean).join(" & ") ||
        wedding.slug ||
        t("title");

    /*
     * Search
     *
     * The input itself stays bound to `searchQuery` so every
     * keystroke is reflected instantly, but the expensive part
     * -- filtering the (potentially large) guest array and
     * re-rendering the whole list -- only runs against
     * `debouncedSearchQuery`, which settles 200ms after typing
     * stops instead of on every single keystroke.
     */
    const debouncedSearchQuery = useDebouncedValue(searchQuery, 200);

    const filteredGuests = useMemo(() => {
        const query = debouncedSearchQuery.trim().toLowerCase();

        if (!query) {
            return initialGuests;
        }

        return initialGuests.filter((guest) =>
            `${guest.first_name} ${guest.last_name}`.toLowerCase().includes(query),
        );
    }, [initialGuests, debouncedSearchQuery]);

    /*
     * Virtualized guest list.
     *
     * The list previously rendered every filtered guest's full
     * row markup (avatar, RSVP badge, edit/delete buttons) on
     * every render, unbounded -- fine for a handful of guests,
     * but a wedding with hundreds of guests re-rendered hundreds
     * of DOM rows on every keystroke and RSVP update. Only the
     * rows actually scrolled into view (plus a small overscan
     * buffer) are mounted now; the container gets a bounded
     * height so this list scrolls independently of the page.
     */
    const guestListParentRef = useRef<HTMLDivElement>(null);

    const guestRowVirtualizer = useVirtualizer({
        count: filteredGuests.length,
        getScrollElement: () => guestListParentRef.current,
        estimateSize: () => 80,
        overscan: 8,
    });

    /*
     * Guest statistics
     */
    const guestStats = useMemo(() => {
        const total = initialGuests.length;

        const seated = initialGuests.filter((guest) =>
            Boolean(guest.table_id),
        ).length;

        return {
            total,
            seated,
            unseated: total - seated,
        };
    }, [initialGuests]);

    /*
     * RSVP statistics
     *
     * Reuses the already-fetched `initialGuests` prop -- no extra
     * query needed for the stat row above the trend chart.
     */
    const rsvpStats = useMemo(() => {
        let confirmed = 0;
        let declined = 0;
        let pending = 0;

        for (const guest of initialGuests) {
            if (guest.rsvp_status === "confirmed") {
                confirmed += 1;
            } else if (guest.rsvp_status === "declined") {
                declined += 1;
            } else {
                pending += 1;
            }
        }

        return {
            total: initialGuests.length,
            confirmed,
            declined,
            pending,
        };
    }, [initialGuests]);

    /*
     * Table occupancy
     *
     * Avoid filtering the entire guest array
     * once again for every table.
     */
    const guestCountByTable = useMemo(() => {
        const counts = new Map<string, number>();

        for (const guest of initialGuests) {
            if (!guest.table_id) {
                continue;
            }

            counts.set(guest.table_id, (counts.get(guest.table_id) ?? 0) + 1);
        }

        return counts;
    }, [initialGuests]);

    /*
     * Print-safe sorted array.
     *
     * Do not mutate initialTables using .sort()
     * directly.
     */
    const sortedTables = useMemo(
        () => [...initialTables].sort((a, b) => a.number - b.number),
        [initialTables],
    );

    const confirmDeleteGuest = async () => {
        if (!guestToDelete) {
            return;
        }

        try {
            await deleteGuest(guestToDelete.id);

            toast.success(t("notifications.guestDeleted"));

            startTransition(() => {
                router.refresh();
            });
        } catch (error) {
            console.error("Delete guest error:", error);

            toast.error(t("deleteGuestFailed"));
            throw error;
        }
    };

    const confirmDeleteTable = async () => {
        if (!tableToDelete) {
            return;
        }

        try {
            await deleteTable(tableToDelete.id);

            toast.success(t("notifications.tableDeleted"));

            startTransition(() => {
                router.refresh();
            });
        } catch (error) {
            console.error("Delete table error:", error);

            toast.error(t("deleteTableFailed"));
            throw error;
        }
    };

    /*
     * Cycles a guest's RSVP status pending -> confirmed -> declined -> pending
     * on click, so an admin can record a phone call or paper reply without
     * leaving the guest list. Uses the same server action the external API
     * relies on for a manual override (rsvp_source becomes "admin").
     */
    const cycleRsvpStatus = (
        current: GuestWithTable["rsvp_status"],
    ): GuestWithTable["rsvp_status"] => {
        if (current === "pending") return "confirmed";
        if (current === "confirmed") return "declined";
        return "pending";
    };

    const handleRsvpCycle = async (guest: GuestWithTable) => {
        // Cycle from whatever is currently displayed, not
        // guest.rsvp_status directly -- if an earlier
        // update's router.refresh() hasn't landed yet,
        // guest.rsvp_status here is still stale and would
        // cycle from the wrong starting point.
        const nextStatus = cycleRsvpStatus(
            optimisticRsvp[guest.id] ?? guest.rsvp_status,
        );

        setRsvpUpdatingId(guest.id);

        // Show the new status right away rather than
        // waiting on router.refresh()'s round trip -- see
        // the comment on `optimisticRsvp` above.
        setOptimisticRsvp((current) => ({
            ...current,
            [guest.id]: nextStatus,
        }));

        try {
            const result = await updateGuestRsvpAction(wedding.id, {
                guestId: guest.id,
                status: nextStatus,
            });

            if (!result.success) {
                setOptimisticRsvp((current) => {
                    const next = { ...current };
                    delete next[guest.id];
                    return next;
                });

                toast.error(result.error ?? t("rsvpUpdateFailed"));
                return;
            }

            toast.success(
                t("notifications.rsvpUpdated", {
                    status: t(`rsvpStatus.${nextStatus}`),
                }),
            );

            startTransition(() => {
                router.refresh();
            });
        } catch (error) {
            setOptimisticRsvp((current) => {
                const next = { ...current };
                delete next[guest.id];
                return next;
            });

            console.error("Update guest RSVP error:", error);

            toast.error(t("rsvpUpdateFailed"));
        } finally {
            setRsvpUpdatingId(null);
        }
    };

    const handleCopyPersonalLink = async (guest: GuestWithTable) => {
        if (!wedding.slug) {
            return;
        }

        const link = buildGuestPersonalLink(
            locale,
            wedding.slug,
            guest.guest_token,
        );

        try {
            await navigator.clipboard.writeText(link);

            toast.success(t("personalLinkCopied"));
        } catch (error) {
            console.error("Copy personal link error:", error);

            toast.error(t("personalLinkCopyFailed"));
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportCsv = () => {
        if (initialGuests.length === 0) {
            toast.error(t("csvImport.exportEmpty"));
            return;
        }

        const csv = buildGuestsCsv(initialGuests, [
            t("firstName"),
            t("lastName"),
            t("csvImport.rsvpStatusColumn"),
            t("csvImport.partySizeColumn"),
            t("csvImport.tableColumn"),
        ]);

        const filename = `${wedding.slug ?? "guests"}-guest-list.csv`;

        downloadTextFile(filename, csv, "text/csv;charset=utf-8;");

        toast.success(t("csvImport.exportSuccess"));
    };

    const openCsvFilePicker = () => {
        csvFileInputRef.current?.click();
    };

    const handleCsvFileSelected = async (
        event: ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];

        /*
         * Reset the input immediately so selecting the same
         * file twice in a row still fires onChange.
         */
        event.target.value = "";

        if (!file) {
            return;
        }

        setIsImportingCsv(true);

        try {
            const text = await file.text();

            if (!text.trim()) {
                toast.error(t("csvImport.emptyFile"));
                return;
            }

            const { rows, error: parseError } = parseGuestsCsv(text);

            if (parseError === "empty") {
                toast.error(t("csvImport.emptyFile"));
                return;
            }

            if (parseError === "noNameColumns") {
                toast.error(t("csvImport.noNameColumns"));
                return;
            }

            if (rows.length === 0) {
                toast.error(t("csvImport.emptyFile"));
                return;
            }

            const result = await bulkImportGuestsAction(wedding.id, rows);

            if (result.imported > 0) {
                toast.success(
                    t("csvImport.importSuccess", {
                        imported: result.imported,
                        skipped: result.skipped,
                    }),
                );

                startTransition(() => {
                    router.refresh();
                });
            } else {
                toast.error(t("csvImport.importNothingImported"));
            }
        } catch (error) {
            console.error("CSV import error:", error);

            toast.error(t("csvImport.importFailed"));
        } finally {
            setIsImportingCsv(false);
        }
    };

    const openNewGuest = () => {
        setEditingGuest(null);
        setIsGuestModalOpen(true);
    };

    const openGuest = (guest: GuestWithTable) => {
        setEditingGuest(guest);

        setIsGuestModalOpen(true);
    };

    const openNewTable = () => {
        setEditingTable(null);
        setIsTableModalOpen(true);
    };

    const openTable = (table: TableWithSeats) => {
        setEditingTable(table);

        setIsTableModalOpen(true);
    };

    return (
        <div className="relative min-h-[calc(100vh-4rem)]">
            {/* ======================================
                NORMAL VIEW
            ====================================== */}
            <div className="print:hidden">
                <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
                    {/* ==================================
                        BACK
                    ================================== */}
                    <Link
                        href="/admin/weddings"
                        className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />

                        {t("backToWeddings")}
                    </Link>

                    {/* ==================================
                        PAGE HEADER
                    ================================== */}
                    <section className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                        <div>
                            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                                {t("title")}
                            </p>

                            <h1 className="font-serif text-4xl font-light tracking-[-0.025em] text-foreground sm:text-5xl">
                                {weddingName}
                            </h1>

                            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                                {t("description")}
                            </p>

                            {wedding.slug && (
                                <p className="mt-2 text-[10px] text-muted-foreground/70">
                                    /{wedding.slug}
                                </p>
                            )}
                        </div>

                        {/* Page actions */}
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="btn-secondary justify-center"
                            >
                                <Printer className="h-4 w-4" />

                                {t("print")}
                            </button>

                            <Link
                                href={`/admin/weddings/${wedding.id}/photos`}
                                className="btn-secondary justify-center"
                            >
                                <Images className="h-4 w-4" />

                                {t("photos")}
                            </Link>

                            <Link
                                href={`/admin/weddings/${wedding.id}/settings`}
                                className="btn-secondary justify-center"
                            >
                                <KeyRound className="h-4 w-4" />

                                {t("rsvpApi")}
                            </Link>
                        </div>
                    </section>

                    {/* ==================================
                        TABS
                    ================================== */}
                    <section className="mb-7 flex gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-card/70 p-1.5 shadow-sm">
                        <TabButton
                            active={activeTab === "guests"}
                            onClick={() => setActiveTab("guests")}
                            icon={<Users className="h-3.5 w-3.5" />}
                            label={t("guests")}
                        />

                        {entitlements.tableArrangement && (
                            <>
                                <TabButton
                                    active={activeTab === "tables"}
                                    onClick={() => setActiveTab("tables")}
                                    icon={<LayoutGrid className="h-3.5 w-3.5" />}
                                    label={t("tables")}
                                />

                                <TabButton
                                    active={activeTab === "designer"}
                                    onClick={() => setActiveTab("designer")}
                                    icon={<MapIcon className="h-3.5 w-3.5" />}
                                    label={t("designerLabel")}
                                />
                            </>
                        )}
                    </section>

                    {/* ==================================
                        GUESTS
                    ================================== */}
                    {activeTab === "guests" && (
                        <div>
                            {/* Stats */}
                            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <StatCard value={guestStats.total} label={t("total")} />

                                <StatCard value={guestStats.seated} label={t("seated")} />

                                <StatCard
                                    value={guestStats.unseated}
                                    label={t("unseated")}
                                    attention={guestStats.unseated > 0}
                                />

                                <StatCard value={initialTables.length} label={t("tables")} />
                            </div>

                            {/* RSVP trend */}
                            <div className="mb-6">
                                <RsvpTrendChart data={rsvpTrend} stats={rsvpStats} />
                            </div>

                            {/* Toolbar */}
                            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                <div className="relative w-full sm:max-w-sm">
                                    <Search
                                        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                                        strokeWidth={1.6}
                                    />

                                    <input
                                        type="search"
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                        placeholder={t("searchGuests")}
                                        className="input-wedding h-11 pl-11"
                                    />
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <input
                                        ref={csvFileInputRef}
                                        type="file"
                                        accept=".csv,text/csv"
                                        className="hidden"
                                        onChange={handleCsvFileSelected}
                                    />

                                    <button
                                        type="button"
                                        onClick={handleExportCsv}
                                        className="btn-secondary justify-center"
                                    >
                                        <Download className="h-4 w-4" />

                                        {t("csvImport.exportButton")}
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isImportingCsv}
                                        onClick={openCsvFilePicker}
                                        className="btn-secondary justify-center disabled:opacity-50"
                                    >
                                        {isImportingCsv ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Upload className="h-4 w-4" />
                                        )}

                                        {t("csvImport.importButton")}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={openNewGuest}
                                        className="btn-primary justify-center"
                                    >
                                        <Plus className="h-4 w-4" />

                                        {t("addGuest")}
                                    </button>
                                </div>
                            </div>

                            {/* Guest list */}
                            <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/80 shadow-sm backdrop-blur">
                                {filteredGuests.length > 0 ? (
                                    <div
                                        ref={guestListParentRef}
                                        className="max-h-[68vh] overflow-y-auto"
                                    >
                                        <div
                                            style={{
                                                height: `${guestRowVirtualizer.getTotalSize()}px`,
                                                position: "relative",
                                            }}
                                        >
                                            {guestRowVirtualizer
                                                .getVirtualItems()
                                                .map((virtualRow) => {
                                                    const guest = filteredGuests[virtualRow.index];

                                                    const initials =
                                                        guest.initials ||
                                                        `${guest.first_name?.[0] ?? ""}${guest.last_name?.[0] ?? ""}`.toUpperCase();

                                                    const displayRsvpStatus =
                                                        optimisticRsvp[guest.id] ?? guest.rsvp_status;

                                                    return (
                                                        <div
                                                            key={guest.id}
                                                            data-index={virtualRow.index}
                                                            ref={guestRowVirtualizer.measureElement}
                                                            style={{
                                                                position: "absolute",
                                                                top: 0,
                                                                left: 0,
                                                                width: "100%",
                                                                transform: `translateY(${virtualRow.start}px)`,
                                                            }}
                                                            className={cn(
                                                                "group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-secondary/20 sm:px-6",
                                                                virtualRow.index !==
                                                                filteredGuests.length - 1 &&
                                                                "border-b border-border/60",
                                                            )}
                                                        >
                                                            <div className="flex min-w-0 items-center gap-4">
                                                                <GuestAvatar initials={initials} />

                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-medium text-foreground">
                                                                        {guest.first_name} {guest.last_name}
                                                                    </p>

                                                                    <div className="mt-1 flex items-center gap-2">
                                    <span
                                        className={cn(
                                            "h-1.5 w-1.5 rounded-full",
                                            guest.tables
                                                ? "bg-[hsl(var(--primary))]"
                                                : "bg-muted-foreground/35",
                                        )}
                                    />

                                                                        <p className="text-xs text-muted-foreground">
                                                                            {guest.tables
                                                                                ? t("tableNumber", {
                                                                                    number: guest.tables.number,
                                                                                })
                                                                                : t("unseated")}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex shrink-0 items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    disabled={rsvpUpdatingId === guest.id}
                                                                    onClick={() => void handleRsvpCycle(guest)}
                                                                    title={t("rsvpCycleHint")}
                                                                    className={cn(
                                                                        "flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium capitalize transition-colors disabled:opacity-50",
                                                                        displayRsvpStatus === "confirmed" &&
                                                                        "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                                                                        displayRsvpStatus === "declined" &&
                                                                        "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
                                                                        displayRsvpStatus === "pending" &&
                                                                        "border-border/70 bg-secondary/40 text-muted-foreground hover:bg-secondary",
                                                                    )}
                                                                >
                                                                    {rsvpUpdatingId === guest.id ? (
                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                    ) : (
                                                                        t(`rsvpStatus.${displayRsvpStatus}`)
                                                                    )}
                                                                </button>

                                                                {entitlements.personalGuestLinks && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={!wedding.slug}
                                                                        onClick={() =>
                                                                            void handleCopyPersonalLink(guest)
                                                                        }
                                                                        aria-label={t("copyPersonalLink")}
                                                                        title={t("copyPersonalLink")}
                                                                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
                                                                    >
                                                                        <Link2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}

                                                                <button
                                                                    type="button"
                                                                    onClick={() => openGuest(guest)}
                                                                    aria-label={t("editGuest")}
                                                                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                                                >
                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    disabled={isPending}
                                                                    onClick={() =>
                                                                        setGuestToDelete({
                                                                            id: guest.id,
                                                                            name: `${guest.first_name} ${guest.last_name}`.trim(),
                                                                        })
                                                                    }
                                                                    aria-label={t("delete")}
                                                                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/[0.08] hover:text-destructive disabled:opacity-50"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                ) : (
                                    <EmptyState icon={Search} title={t("noGuests")} />
                                )}
                            </div>
                        </div>
                    )}

                    {/* ==================================
                        TABLES
                    ================================== */}
                    {activeTab === "tables" && (
                        <div>
                            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                                <div>
                                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                        {t("tables")}
                                    </p>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {initialTables.length} {t("tables").toLowerCase()}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={openNewTable}
                                    className="btn-primary justify-center"
                                >
                                    <Plus className="h-4 w-4" />

                                    {t("addNewTable")}
                                </button>
                            </div>

                            {initialTables.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {initialTables.map((table) => {
                                        const occupied = guestCountByTable.get(table.id) ?? 0;

                                        return (
                                            <div
                                                key={table.id}
                                                className="group relative rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm transition-all hover:border-border hover:shadow-md"
                                            >
                                                {/* Actions */}
                                                <div className="absolute right-3 top-3 flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => openTable(table)}
                                                        aria-label={t("editTable")}
                                                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={isPending}
                                                        onClick={() =>
                                                            setTableToDelete({
                                                                id: table.id,
                                                                number: table.number,
                                                            })
                                                        }
                                                        aria-label={t("delete")}
                                                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/[0.08] hover:text-destructive disabled:opacity-50"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>

                                                {/* Table illustration */}
                                                <div className="mb-6 flex min-h-[100px] items-center">
                                                    <div
                                                        className={cn(
                                                            "flex flex-col items-center justify-center border border-dashed border-foreground/20 bg-secondary/30",
                                                            table.shape === "rectangle"
                                                                ? "h-16 w-28 rounded-xl"
                                                                : table.shape === "round"
                                                                    ? "h-20 w-20 rounded-full"
                                                                    : "h-20 w-20 rounded-2xl",
                                                        )}
                                                    >
                            <span className="text-[8px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                              {t("table")}
                            </span>

                                                        <span className="mt-0.5 font-serif text-2xl font-light text-foreground">
                              {table.number}
                            </span>
                                                    </div>
                                                </div>

                                                <h3 className="text-sm font-medium text-foreground">
                                                    {t("table")} {table.number}
                                                </h3>

                                                {table.label && (
                                                    <p className="mt-1 truncate text-xs text-muted-foreground">
                                                        {table.label}
                                                    </p>
                                                )}

                                                {/* Occupancy */}
                                                <div className="mt-4">
                                                    <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>
                              {occupied} / {table.seats}
                            </span>

                                                        <span>{t("occupied")}</span>
                                                    </div>

                                                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                                                        <div
                                                            className="h-full rounded-full bg-foreground transition-all"
                                                            style={{
                                                                width: `${Math.min(
                                                                    100,
                                                                    table.seats > 0
                                                                        ? (occupied / table.seats) * 100
                                                                        : 0,
                                                                )}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-[2rem] border border-border/70 bg-card/80 shadow-sm">
                                    <EmptyState
                                        icon={LayoutGrid}
                                        title={t("noTablesCreated")}
                                        action={
                                            <button
                                                type="button"
                                                onClick={openNewTable}
                                                className="btn-primary mt-5 inline-flex"
                                            >
                                                <Plus className="h-4 w-4" />

                                                {t("addNewTable")}
                                            </button>
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ==================================
                        DESIGNER
                    ================================== */}
                    {activeTab === "designer" && (
                        <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-sm">
                            <div className="h-[calc(100vh-260px)] min-h-[650px]">
                                <SeatingDesigner
                                    guests={initialGuests}
                                    tables={initialTables}
                                    venueElements={initialVenueElements}
                                    weddingId={wedding.id}
                                />
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* ======================================
                PRINT VIEW
            ====================================== */}
            <div
                className="hidden print:block print:w-full print:p-8"
                style={{
                    colorAdjust: "exact",
                    WebkitPrintColorAdjust: "exact",
                }}
            >
                <h1
                    className="mb-2 text-center font-serif text-3xl"
                    style={{
                        color: "#000000",
                    }}
                >
                    {weddingName}
                </h1>

                <h2
                    className="mb-8 text-center text-lg"
                    style={{
                        color: "#000000",
                    }}
                >
                    {t("printTitle")}
                </h2>

                <div className="space-y-8">
                    {sortedTables.map((table) => (
                        <div
                            key={table.id}
                            className="border-b pb-5"
                            style={{
                                borderColor: "#000000",
                            }}
                        >
                            <h3
                                className="mb-3 text-lg font-bold"
                                style={{
                                    color: "#000000",
                                }}
                            >
                                {t("table")} <span className="text-2xl">{table.number}</span>
                                {table.label ? ` – ${table.label}` : ""}
                            </h3>

                            <div className="grid grid-cols-2 gap-2">
                                {initialGuests
                                    .filter((guest) => guest.table_id === table.id)
                                    .sort((a, b) => a.first_name.localeCompare(b.first_name))
                                    .map((guest) => (
                                        <div
                                            key={guest.id}
                                            className="text-sm"
                                            style={{
                                                color: "#000000",
                                            }}
                                        >
                                            • {guest.first_name} {guest.last_name}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ======================================
                GUEST MODAL
            ====================================== */}
            <Modal
                open={isGuestModalOpen}
                onClose={() => setIsGuestModalOpen(false)}
                maxWidth="max-w-lg"
            >
                <div className="pr-10">
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--primary))]">
                        {t("guests")}
                    </p>

                    <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
                        {editingGuest ? t("editGuest") : t("addNewGuest")}
                    </h2>
                </div>

                <div className="mt-7">
                    <GuestForm
                        weddingId={wedding.id}
                        initialValues={editingGuest ?? undefined}
                        tables={initialTables}
                        onSuccess={() => {
                            toast.success(
                                editingGuest
                                    ? t("notifications.guestUpdated")
                                    : t("notifications.guestCreated"),
                            );

                            setIsGuestModalOpen(false);

                            setEditingGuest(null);

                            startTransition(() => router.refresh());
                        }}
                        onCancel={() => setIsGuestModalOpen(false)}
                    />
                </div>
            </Modal>

            {/* ======================================
                TABLE MODAL
            ====================================== */}
            <Modal
                open={isTableModalOpen}
                onClose={() => setIsTableModalOpen(false)}
                maxWidth="max-w-lg"
            >
                <div className="pr-10">
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--primary))]">
                        {t("tables")}
                    </p>

                    <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
                        {editingTable ? t("editTable") : t("addNewTable")}
                    </h2>
                </div>

                <div className="mt-7">
                    <TableForm
                        initialValues={
                            editingTable
                                ? {
                                    id: editingTable.id,
                                    number: editingTable.number,
                                    seats: editingTable.seats,
                                    shape: editingTable.shape,
                                    label: editingTable.label ?? undefined,
                                }
                                : undefined
                        }
                        weddingId={wedding.id}
                        onSuccess={() => {
                            toast.success(
                                editingTable
                                    ? t("notifications.tableUpdated")
                                    : t("notifications.tableCreated"),
                            );

                            setIsTableModalOpen(false);

                            setEditingTable(null);

                            startTransition(() => router.refresh());
                        }}
                        onCancel={() => setIsTableModalOpen(false)}
                    />
                </div>
            </Modal>

            <ConfirmationModal
                open={guestToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setGuestToDelete(null);
                    }
                }}
                variant="destructive"
                title={t("confirmations.deleteGuest.title")}
                description={
                    guestToDelete
                        ? t("confirmations.deleteGuest.description", {
                            name: guestToDelete.name,
                        })
                        : undefined
                }
                confirmLabel={t("confirmations.deleteGuest.confirm")}
                cancelLabel={tc("cancel")}
                onConfirm={confirmDeleteGuest}
            />

            <ConfirmationModal
                open={tableToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setTableToDelete(null);
                    }
                }}
                variant="destructive"
                title={t("confirmations.deleteTable.title")}
                description={
                    tableToDelete
                        ? t("confirmations.deleteTable.description", {
                            number: tableToDelete.number,
                        })
                        : undefined
                }
                confirmLabel={t("confirmations.deleteTable.confirm")}
                cancelLabel={tc("cancel")}
                onConfirm={confirmDeleteTable}
            />
        </div>
    );
}

/*
 * TABS
 */
function TabButton({
                       active,
                       onClick,
                       icon,
                       label,
                   }: {
    active: boolean;
    onClick: () => void;
    icon: ReactNode;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all",
                active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
        >
            {icon}

            {label}
        </button>
    );
}

/*
 * STAT CARD
 */
function StatCard({
                      value,
                      label,
                      attention = false,
                  }: {
    value: number;
    label: string;
    attention?: boolean;
}) {
    return (
        <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur sm:p-5">
            <div className="mb-4 flex items-start justify-between">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />

                {attention && value > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
                )}
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

/*
 * EMPTY STATE
 */
function EmptyState({
                        icon: Icon,
                        title,
                        action,
                    }: {
    icon: typeof Users;
    title: string;
    action?: ReactNode;
}) {
    return (
        <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
                <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </div>

            <p className="mt-4 text-sm text-muted-foreground">{title}</p>

            {action}
        </div>
    );
}
