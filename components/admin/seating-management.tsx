'use client'

import {
    type ReactNode,
    useMemo,
    useState,
    useTransition,
} from 'react'

import dynamic from 'next/dynamic'
import {
    ArrowLeft,
    Edit2,
    Images,
    LayoutGrid,
    Loader2,
    Map as MapIcon,
    Plus,
    Printer,
    Search,
    Trash2,
    Users,
} from 'lucide-react'
import {
    useTranslations,
} from 'next-intl'

import {
    deleteGuest,
    deleteTable,
} from '@/actions/seating'
import { GuestForm } from '@/components/admin/guest-form'
import { TableForm } from '@/components/admin/table-form'
import { GuestAvatar } from '@/components/guest-avatar'
import { Modal } from '@/components/ui/modal'
import {
    Link,
    useRouter,
} from '@/lib/navigation'
import { cn } from '@/lib/utils'
import type {
    GuestWithTable,
    TableWithSeats,
    VenueElement,
} from '@/types/seating'

/*
 * Dynamic designer loading component.
 *
 * Keeping useTranslations inside a proper
 * React component also keeps the hook usage
 * clean.
 */
function SeatingDesignerLoading() {
    const t =
        useTranslations(
            'seating'
        )

    return (
        <div className="flex min-h-[600px] flex-1 items-center justify-center bg-secondary/20">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />

                <p className="text-xs text-muted-foreground">
                    {t(
                        'loadingDesigner'
                    )}
                </p>
            </div>
        </div>
    )
}

const SeatingDesigner =
    dynamic(
        () =>
            import(
                '@/components/admin/designer/seating-designer'
                ).then(
                (module) =>
                    module.SeatingDesigner
            ),
        {
            loading:
            SeatingDesignerLoading,
            ssr: false,
        }
    )

interface WeddingContext {
    id: string
    groom_name: string | null
    bride_name: string | null
    slug: string | null
}

interface SeatingManagementProps {
    wedding: WeddingContext
    initialGuests: GuestWithTable[]
    initialTables: TableWithSeats[]
    initialVenueElements: VenueElement[]
}

type Tab =
    | 'guests'
    | 'tables'
    | 'designer'

export function SeatingManagement({
                                      wedding,
                                      initialGuests,
                                      initialTables,
                                      initialVenueElements,
                                  }: SeatingManagementProps) {
    const router =
        useRouter()

    const t =
        useTranslations(
            'seating'
        )

    const td =
        useTranslations(
            'dashboard'
        )

    const [
        isPending,
        startTransition,
    ] = useTransition()

    const [
        activeTab,
        setActiveTab,
    ] =
        useState<Tab>(
            'guests'
        )

    const [
        searchQuery,
        setSearchQuery,
    ] = useState('')

    /*
     * Modal state
     */
    const [
        isGuestModalOpen,
        setIsGuestModalOpen,
    ] = useState(false)

    const [
        isTableModalOpen,
        setIsTableModalOpen,
    ] = useState(false)

    const [
        editingGuest,
        setEditingGuest,
    ] =
        useState<GuestWithTable | null>(
            null
        )

    const [
        editingTable,
        setEditingTable,
    ] =
        useState<TableWithSeats | null>(
            null
        )

    /*
     * Wedding name
     */
    const weddingName =
        [
            wedding.groom_name,
            wedding.bride_name,
        ]
            .filter(Boolean)
            .join(' & ') ||
        wedding.slug ||
        t('title')

    /*
     * Search
     */
    const filteredGuests =
        useMemo(() => {
            const query =
                searchQuery
                    .trim()
                    .toLowerCase()

            if (!query) {
                return initialGuests
            }

            return initialGuests.filter(
                (guest) =>
                    `${guest.first_name} ${guest.last_name}`
                        .toLowerCase()
                        .includes(
                            query
                        )
            )
        }, [
            initialGuests,
            searchQuery,
        ])

    /*
     * Guest statistics
     */
    const guestStats =
        useMemo(() => {
            const total =
                initialGuests.length

            const seated =
                initialGuests.filter(
                    (guest) =>
                        Boolean(
                            guest.table_id
                        )
                ).length

            return {
                total,
                seated,
                unseated:
                    total -
                    seated,
            }
        }, [initialGuests])

    /*
     * Table occupancy
     *
     * Avoid filtering the entire guest array
     * once again for every table.
     */
    const guestCountByTable =
        useMemo(() => {
            const counts =
                new Map<
                    string,
                    number
                >()

            for (const guest of initialGuests) {
                if (
                    !guest.table_id
                ) {
                    continue
                }

                counts.set(
                    guest.table_id,
                    (counts.get(
                        guest.table_id
                    ) ?? 0) + 1
                )
            }

            return counts
        }, [initialGuests])

    /*
     * Print-safe sorted array.
     *
     * Do not mutate initialTables using .sort()
     * directly.
     */
    const sortedTables =
        useMemo(
            () =>
                [
                    ...initialTables,
                ].sort(
                    (a, b) =>
                        a.number -
                        b.number
                ),
            [initialTables]
        )

    const handleDeleteGuest =
        async (
            id: string
        ) => {
            if (
                !window.confirm(
                    t(
                        'confirmDeleteGuest'
                    )
                )
            ) {
                return
            }

            try {
                await deleteGuest(id)

                startTransition(
                    () =>
                        router.refresh()
                )
            } catch (
                error
                ) {
                console.error(
                    'Delete guest error:',
                    error
                )

                window.alert(
                    t(
                        'deleteGuestFailed'
                    )
                )
            }
        }

    const handleDeleteTable =
        async (
            id: string
        ) => {
            if (
                !window.confirm(
                    t(
                        'confirmDeleteTable'
                    )
                )
            ) {
                return
            }

            try {
                await deleteTable(id)

                startTransition(
                    () =>
                        router.refresh()
                )
            } catch (
                error
                ) {
                console.error(
                    'Delete table error:',
                    error
                )

                window.alert(
                    t(
                        'deleteTableFailed'
                    )
                )
            }
        }

    const handlePrint =
        () => {
            window.print()
        }

    const openNewGuest =
        () => {
            setEditingGuest(null)
            setIsGuestModalOpen(
                true
            )
        }

    const openGuest =
        (
            guest: GuestWithTable
        ) => {
            setEditingGuest(
                guest
            )

            setIsGuestModalOpen(
                true
            )
        }

    const openNewTable =
        () => {
            setEditingTable(null)
            setIsTableModalOpen(
                true
            )
        }

    const openTable =
        (
            table: TableWithSeats
        ) => {
            setEditingTable(
                table
            )

            setIsTableModalOpen(
                true
            )
        }

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
                        <ArrowLeft
                            className="h-3.5 w-3.5"
                            strokeWidth={
                                1.6
                            }
                        />

                        {t(
                            'backToWeddings'
                        )}
                    </Link>

                    {/* ==================================
                        PAGE HEADER
                    ================================== */}
                    <section className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                        <div>
                            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                                {t(
                                    'title'
                                )}
                            </p>

                            <h1 className="font-serif text-4xl font-light tracking-[-0.025em] text-foreground sm:text-5xl">
                                {
                                    weddingName
                                }
                            </h1>

                            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                                {t(
                                    'description'
                                )}
                            </p>

                            {wedding.slug && (
                                <p className="mt-2 text-[10px] text-muted-foreground/70">
                                    /
                                    {
                                        wedding.slug
                                    }
                                </p>
                            )}
                        </div>

                        {/* Page actions */}
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={
                                    handlePrint
                                }
                                className="btn-secondary justify-center"
                            >
                                <Printer className="h-4 w-4" />

                                {t(
                                    'print'
                                )}
                            </button>

                            <Link
                                href={`/admin/weddings/${wedding.id}/photos`}
                                className="btn-secondary justify-center"
                            >
                                <Images className="h-4 w-4" />

                                {t(
                                    'photos'
                                )}
                            </Link>
                        </div>
                    </section>

                    {/* ==================================
                        TABS
                    ================================== */}
                    <section className="mb-7 flex gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-card/70 p-1.5 shadow-sm">
                        <TabButton
                            active={
                                activeTab ===
                                'guests'
                            }
                            onClick={() =>
                                setActiveTab(
                                    'guests'
                                )
                            }
                            icon={
                                <Users className="h-3.5 w-3.5" />
                            }
                            label={t(
                                'guests'
                            )}
                        />

                        <TabButton
                            active={
                                activeTab ===
                                'tables'
                            }
                            onClick={() =>
                                setActiveTab(
                                    'tables'
                                )
                            }
                            icon={
                                <LayoutGrid className="h-3.5 w-3.5" />
                            }
                            label={t(
                                'tables'
                            )}
                        />

                        <TabButton
                            active={
                                activeTab ===
                                'designer'
                            }
                            onClick={() =>
                                setActiveTab(
                                    'designer'
                                )
                            }
                            icon={
                                <MapIcon className="h-3.5 w-3.5" />
                            }
                            label={t(
                                'designer'
                            )}
                        />
                    </section>

                    {/* ==================================
                        GUESTS
                    ================================== */}
                    {activeTab ===
                        'guests' && (
                            <div>
                                {/* Stats */}
                                <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                                    <StatCard
                                        value={
                                            guestStats.total
                                        }
                                        label={t(
                                            'total'
                                        )}
                                    />

                                    <StatCard
                                        value={
                                            guestStats.seated
                                        }
                                        label={t(
                                            'seated'
                                        )}
                                    />

                                    <StatCard
                                        value={
                                            guestStats.unseated
                                        }
                                        label={t(
                                            'unseated'
                                        )}
                                        attention={
                                            guestStats.unseated >
                                            0
                                        }
                                    />

                                    <StatCard
                                        value={
                                            initialTables.length
                                        }
                                        label={t(
                                            'tables'
                                        )}
                                    />
                                </div>

                                {/* Toolbar */}
                                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                    <div className="relative w-full sm:max-w-sm">
                                        <Search
                                            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                                            strokeWidth={
                                                1.6
                                            }
                                        />

                                        <input
                                            type="search"
                                            value={
                                                searchQuery
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setSearchQuery(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder={t(
                                                'searchGuests'
                                            )}
                                            className="input-wedding h-11 pl-11"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={
                                            openNewGuest
                                        }
                                        className="btn-primary justify-center"
                                    >
                                        <Plus className="h-4 w-4" />

                                        {t(
                                            'addGuest'
                                        )}
                                    </button>
                                </div>

                                {/* Guest list */}
                                <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/80 shadow-sm backdrop-blur">
                                    {filteredGuests.length >
                                    0 ? (
                                        <div className="divide-y divide-border/60">
                                            {filteredGuests.map(
                                                (
                                                    guest
                                                ) => {
                                                    const initials =
                                                        guest.initials ||
                                                        `${guest.first_name?.[0] ?? ''}${guest.last_name?.[0] ?? ''}`.toUpperCase()

                                                    return (
                                                        <div
                                                            key={
                                                                guest.id
                                                            }
                                                            className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-secondary/20 sm:px-6"
                                                        >
                                                            <div className="flex min-w-0 items-center gap-4">
                                                                <GuestAvatar
                                                                    initials={
                                                                        initials
                                                                    }
                                                                />

                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-medium text-foreground">
                                                                        {
                                                                            guest.first_name
                                                                        }{' '}
                                                                        {
                                                                            guest.last_name
                                                                        }
                                                                    </p>

                                                                    <div className="mt-1 flex items-center gap-2">
                                                                    <span
                                                                        className={cn(
                                                                            'h-1.5 w-1.5 rounded-full',
                                                                            guest.tables
                                                                                ? 'bg-[hsl(var(--primary))]'
                                                                                : 'bg-muted-foreground/35'
                                                                        )}
                                                                    />

                                                                        <p className="text-xs text-muted-foreground">
                                                                            {guest.tables
                                                                                ? t(
                                                                                    'tableNumber',
                                                                                    {
                                                                                        number:
                                                                                        guest
                                                                                            .tables
                                                                                            .number,
                                                                                    }
                                                                                )
                                                                                : t(
                                                                                    'unseated'
                                                                                )}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex shrink-0 items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        openGuest(
                                                                            guest
                                                                        )
                                                                    }
                                                                    aria-label={t(
                                                                        'editGuest'
                                                                    )}
                                                                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                                                >
                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        isPending
                                                                    }
                                                                    onClick={() =>
                                                                        void handleDeleteGuest(
                                                                            guest.id
                                                                        )
                                                                    }
                                                                    aria-label="Delete"
                                                                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/[0.08] hover:text-destructive disabled:opacity-50"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                            )}
                                        </div>
                                    ) : (
                                        <EmptyState
                                            icon={
                                                Search
                                            }
                                            title={t(
                                                'noGuests'
                                            )}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                    {/* ==================================
                        TABLES
                    ================================== */}
                    {activeTab ===
                        'tables' && (
                            <div>
                                <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                                    <div>
                                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                            {t(
                                                'tables'
                                            )}
                                        </p>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {
                                                initialTables.length
                                            }{' '}
                                            {t(
                                                'tables'
                                            ).toLowerCase()}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={
                                            openNewTable
                                        }
                                        className="btn-primary justify-center"
                                    >
                                        <Plus className="h-4 w-4" />

                                        {t(
                                            'addNewTable'
                                        )}
                                    </button>
                                </div>

                                {initialTables.length >
                                0 ? (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        {initialTables.map(
                                            (
                                                table
                                            ) => {
                                                const occupied =
                                                    guestCountByTable.get(
                                                        table.id
                                                    ) ??
                                                    0

                                                return (
                                                    <div
                                                        key={
                                                            table.id
                                                        }
                                                        className="group relative rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm transition-all hover:border-border hover:shadow-md"
                                                    >
                                                        {/* Actions */}
                                                        <div className="absolute right-3 top-3 flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openTable(
                                                                        table
                                                                    )
                                                                }
                                                                aria-label={t(
                                                                    'editTable'
                                                                )}
                                                                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    isPending
                                                                }
                                                                onClick={() =>
                                                                    void handleDeleteTable(
                                                                        table.id
                                                                    )
                                                                }
                                                                aria-label="Delete"
                                                                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/[0.08] hover:text-destructive disabled:opacity-50"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>

                                                        {/* Table illustration */}
                                                        <div className="mb-6 flex min-h-[100px] items-center">
                                                            <div
                                                                className={cn(
                                                                    'flex flex-col items-center justify-center border border-dashed border-foreground/20 bg-secondary/30',
                                                                    table.shape ===
                                                                    'rectangle'
                                                                        ? 'h-16 w-28 rounded-xl'
                                                                        : table.shape ===
                                                                        'round'
                                                                            ? 'h-20 w-20 rounded-full'
                                                                            : 'h-20 w-20 rounded-2xl'
                                                                )}
                                                            >
                                                            <span className="text-[8px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                                                                {t(
                                                                    'table'
                                                                )}
                                                            </span>

                                                                <span className="mt-0.5 font-serif text-2xl font-light text-foreground">
                                                                {
                                                                    table.number
                                                                }
                                                            </span>
                                                            </div>
                                                        </div>

                                                        <h3 className="text-sm font-medium text-foreground">
                                                            {t(
                                                                'table'
                                                            )}{' '}
                                                            {
                                                                table.number
                                                            }
                                                        </h3>

                                                        {table.label && (
                                                            <p className="mt-1 truncate text-xs text-muted-foreground">
                                                                {
                                                                    table.label
                                                                }
                                                            </p>
                                                        )}

                                                        {/* Occupancy */}
                                                        <div className="mt-4">
                                                            <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground">
                                                            <span>
                                                                {
                                                                    occupied
                                                                }{' '}
                                                                /{' '}
                                                                {
                                                                    table.seats
                                                                }
                                                            </span>

                                                                <span>
                                                                {t(
                                                                    'occupied'
                                                                )}
                                                            </span>
                                                            </div>

                                                            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                                                                <div
                                                                    className="h-full rounded-full bg-foreground transition-all"
                                                                    style={{
                                                                        width: `${Math.min(
                                                                            100,
                                                                            table.seats >
                                                                            0
                                                                                ? (occupied /
                                                                                    table.seats) *
                                                                                100
                                                                                : 0
                                                                        )}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                        )}
                                    </div>
                                ) : (
                                    <div className="rounded-[2rem] border border-border/70 bg-card/80 shadow-sm">
                                        <EmptyState
                                            icon={
                                                LayoutGrid
                                            }
                                            title={t(
                                                'noTablesCreated'
                                            )}
                                            action={
                                                <button
                                                    type="button"
                                                    onClick={
                                                        openNewTable
                                                    }
                                                    className="btn-primary mt-5 inline-flex"
                                                >
                                                    <Plus className="h-4 w-4" />

                                                    {t(
                                                        'addNewTable'
                                                    )}
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
                    {activeTab ===
                        'designer' && (
                            <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-sm">
                                <div className="h-[calc(100vh-260px)] min-h-[650px]">
                                    <SeatingDesigner
                                        guests={
                                            initialGuests
                                        }
                                        tables={
                                            initialTables
                                        }
                                        venueElements={
                                            initialVenueElements
                                        }
                                        weddingId={
                                            wedding.id
                                        }
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
                    colorAdjust:
                        'exact',
                    WebkitPrintColorAdjust:
                        'exact',
                }}
            >
                <h1
                    className="mb-2 text-center font-serif text-3xl"
                    style={{
                        color: '#000000',
                    }}
                >
                    {weddingName}
                </h1>

                <h2
                    className="mb-8 text-center text-lg"
                    style={{
                        color: '#000000',
                    }}
                >
                    {t(
                        'printTitle'
                    )}
                </h2>

                <div className="space-y-8">
                    {sortedTables.map(
                        (
                            table
                        ) => (
                            <div
                                key={
                                    table.id
                                }
                                className="border-b pb-5"
                                style={{
                                    borderColor:
                                        '#000000',
                                }}
                            >
                                <h3
                                    className="mb-3 text-lg font-bold"
                                    style={{
                                        color: '#000000',
                                    }}
                                >
                                    {t(
                                        'table'
                                    )}{' '}
                                    <span className="text-2xl">
                                        {
                                            table.number
                                        }
                                    </span>

                                    {table.label
                                        ? ` – ${table.label}`
                                        : ''}
                                </h3>

                                <div className="grid grid-cols-2 gap-2">
                                    {initialGuests
                                        .filter(
                                            (
                                                guest
                                            ) =>
                                                guest.table_id ===
                                                table.id
                                        )
                                        .sort(
                                            (
                                                a,
                                                b
                                            ) =>
                                                a.first_name.localeCompare(
                                                    b.first_name
                                                )
                                        )
                                        .map(
                                            (
                                                guest
                                            ) => (
                                                <div
                                                    key={
                                                        guest.id
                                                    }
                                                    className="text-sm"
                                                    style={{
                                                        color: '#000000',
                                                    }}
                                                >
                                                    •{' '}
                                                    {
                                                        guest.first_name
                                                    }{' '}
                                                    {
                                                        guest.last_name
                                                    }
                                                </div>
                                            )
                                        )}
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* ======================================
                GUEST MODAL
            ====================================== */}
            <Modal
                open={
                    isGuestModalOpen
                }
                onClose={() =>
                    setIsGuestModalOpen(
                        false
                    )
                }
                maxWidth="max-w-lg"
            >
                <div className="pr-10">
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--primary))]">
                        {t(
                            'guests'
                        )}
                    </p>

                    <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
                        {editingGuest
                            ? t(
                                'editGuest'
                            )
                            : t(
                                'addNewGuest'
                            )}
                    </h2>
                </div>

                <div className="mt-7">
                    <GuestForm
                        initialValues={
                            editingGuest ??
                            undefined
                        }
                        tables={
                            initialTables
                        }
                        onSuccess={() => {
                            setIsGuestModalOpen(
                                false
                            )

                            startTransition(
                                () =>
                                    router.refresh()
                            )
                        }}
                        onCancel={() =>
                            setIsGuestModalOpen(
                                false
                            )
                        }
                    />
                </div>
            </Modal>

            {/* ======================================
                TABLE MODAL
            ====================================== */}
            <Modal
                open={
                    isTableModalOpen
                }
                onClose={() =>
                    setIsTableModalOpen(
                        false
                    )
                }
                maxWidth="max-w-lg"
            >
                <div className="pr-10">
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--primary))]">
                        {t(
                            'tables'
                        )}
                    </p>

                    <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
                        {editingTable
                            ? t(
                                'editTable'
                            )
                            : t(
                                'addNewTable'
                            )}
                    </h2>
                </div>

                <div className="mt-7">
                    <TableForm
                        initialValues={
                            editingTable
                                ? {
                                    id: editingTable.id,
                                    number:
                                    editingTable.number,
                                    seats: editingTable.seats,
                                    shape: editingTable.shape,
                                    label:
                                        editingTable.label ??
                                        undefined,
                                }
                                : undefined
                        }
                        weddingId={
                            wedding.id
                        }
                        onSuccess={() => {
                            setIsTableModalOpen(
                                false
                            )

                            startTransition(
                                () =>
                                    router.refresh()
                            )
                        }}
                        onCancel={() =>
                            setIsTableModalOpen(
                                false
                            )
                        }
                    />
                </div>
            </Modal>
        </div>
    )
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
    active: boolean
    onClick: () => void
    icon: ReactNode
    label: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all',
                active
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
        >
            {icon}

            {label}
        </button>
    )
}

/*
 * STAT CARD
 */
function StatCard({
                      value,
                      label,
                      attention = false,
                  }: {
    value: number
    label: string
    attention?: boolean
}) {
    return (
        <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur sm:p-5">
            <div className="mb-4 flex items-start justify-between">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />

                {attention &&
                    value > 0 && (
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
    )
}

/*
 * EMPTY STATE
 */
function EmptyState({
                        icon: Icon,
                        title,
                        action,
                    }: {
    icon: typeof Users
    title: string
    action?: ReactNode
}) {
    return (
        <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
                <Icon
                    className="h-4 w-4 text-muted-foreground"
                    strokeWidth={
                        1.5
                    }
                />
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
                {title}
            </p>

            {action}
        </div>
    )
}