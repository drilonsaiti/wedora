import {
    ArrowRight,
    Armchair,
    Camera,
    Heart,
    Images,
    LayoutDashboard,
    Plus,
    Users,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { getAdminDashboardStats } from '@/actions/admin'
import { CreateWeddingModalTrigger } from '@/components/admin/create-wedding-modal-trigger'
import { Link } from '@/lib/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboardPage() {
    const [
        stats,
        t,
    ] = await Promise.all([
        getAdminDashboardStats(),
        getTranslations(
            'dashboard'
        ),
    ])

    /*
     * We need the email for
     * CreateWeddingForm.
     *
     * Authentication itself is already
     * handled by AdminLayout.
     */
    const supabase =
        await createClient()

    const {
        data: { user },
    } =
        await supabase.auth.getUser()

    const adminEmail =
        user?.email ?? ''

    /*
     * EMPTY STATE
     */
    if (
        !stats ||
        stats.weddings.length === 0
    ) {
        return (
            <main className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6">
                <div className="w-full max-w-xl text-center">
                    <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[hsl(var(--primary))]/10 bg-[hsl(var(--accent))]">
                        <Heart
                            className="h-6 w-6 text-[hsl(var(--primary))]"
                            strokeWidth={
                                1.6
                            }
                        />
                    </div>

                    <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                        Wedora Admin
                    </p>

                    <h1 className="font-serif text-4xl font-light tracking-[-0.025em] text-foreground sm:text-5xl">
                        {t(
                            'noWeddings'
                        )}
                    </h1>

                    <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                        {t(
                            'noWeddingsDescription'
                        )}
                    </p>

                    {/* CREATE → MODAL */}
                    <CreateWeddingModalTrigger
                        adminEmail={
                            adminEmail
                        }
                        className="btn-primary mt-8 inline-flex"
                    >
                        <Plus className="h-4 w-4" />

                        {t(
                            'createWedding'
                        )}
                    </CreateWeddingModalTrigger>
                </div>
            </main>
        )
    }

    return (
        <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
            {/* ========================================
                PAGE HEADER
            ======================================== */}
            <section className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div>
                    <div className="mb-3 flex items-center gap-2">
                        <LayoutDashboard
                            className="h-3.5 w-3.5 text-[hsl(var(--primary))]"
                            strokeWidth={
                                1.6
                            }
                        />

                        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                            Wedora Admin
                        </p>
                    </div>

                    <h1 className="font-serif text-4xl font-light tracking-[-0.025em] text-foreground sm:text-5xl">
                        {t(
                            'overview'
                        )}
                    </h1>

                    <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                        {t(
                            'overviewDescription'
                        )}
                    </p>
                </div>

                {/* Main actions */}
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                        href="/admin/weddings"
                        className="btn-secondary justify-center"
                    >
                        {t(
                            'viewAllWeddings'
                        )}

                        <ArrowRight className="h-4 w-4" />
                    </Link>

                    {/* CREATE → MODAL */}
                    <CreateWeddingModalTrigger
                        adminEmail={
                            adminEmail
                        }
                        className="btn-primary justify-center"
                    >
                        <Plus className="h-4 w-4" />

                        {t(
                            'createWedding'
                        )}
                    </CreateWeddingModalTrigger>
                </div>
            </section>

            {/* ========================================
                STATS
            ======================================== */}
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                    icon={Heart}
                    value={
                        stats.weddings
                            .length
                    }
                    label={t(
                        'activeWeddings'
                    )}
                />

                <StatCard
                    icon={Users}
                    value={
                        stats.totalGuests
                    }
                    label={t(
                        'totalGuests'
                    )}
                />

                <StatCard
                    icon={Images}
                    value={
                        stats.totalPhotos
                    }
                    label={t(
                        'photosLabel'
                    )}
                />

                <StatCard
                    icon={Camera}
                    value={
                        stats.pendingPhotos
                    }
                    label={t(
                        'pendingPhotos'
                    )}
                    attention={
                        stats.pendingPhotos >
                        0
                    }
                />
            </section>

            {/* ========================================
                PENDING PHOTO NOTICE
            ======================================== */}
            {stats.pendingPhotos >
                0 && (
                    <section className="mt-6 rounded-[1.5rem] border border-[hsl(var(--primary))]/15 bg-[hsl(var(--accent))]/55 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background">
                                <Images
                                    className="h-4 w-4 text-[hsl(var(--primary))]"
                                    strokeWidth={
                                        1.6
                                    }
                                />
                            </div>

                            <div>
                                <p className="text-sm font-medium text-foreground">
                                    {t(
                                        'newPhotos',
                                        {
                                            count:
                                            stats.pendingPhotos,
                                        }
                                    )}
                                </p>

                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    {t(
                                        'pendingPhotosDescription'
                                    )}
                                </p>
                            </div>
                        </div>

                        <Link
                            href="/admin/weddings"
                            className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-foreground transition-opacity hover:opacity-60 sm:mt-0"
                        >
                            {t(
                                'reviewPhotos'
                            )}

                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </section>
                )}

            {/* ========================================
                MAIN GRID
            ======================================== */}
            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                {/* ====================================
                    RECENT WEDDINGS
                ==================================== */}
                <section>
                    <div className="mb-4 flex items-end justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                {t(
                                    'weddings'
                                )}
                            </p>

                            <h2 className="mt-1 font-serif text-2xl font-light tracking-tight text-foreground">
                                {t(
                                    'recentWeddings'
                                )}
                            </h2>
                        </div>

                        <Link
                            href="/admin/weddings"
                            className="hidden items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex"
                        >
                            {t(
                                'viewAll'
                            )}

                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/80 shadow-sm backdrop-blur">
                        <div className="divide-y divide-border/60">
                            {stats.weddings
                                .slice(
                                    0,
                                    5
                                )
                                .map(
                                    (
                                        wedding,
                                        index
                                    ) => (
                                        <div
                                            key={
                                                wedding.id
                                            }
                                            className="group flex flex-col gap-4 px-5 py-5 transition-colors hover:bg-secondary/25 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                                        >
                                            {/* Wedding */}
                                            <Link
                                                href={`/admin/weddings/${wedding.id}`}
                                                className="min-w-0 flex-1"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                                                        <span className="font-serif text-sm text-[hsl(var(--primary))]">
                                                            {String(
                                                                index +
                                                                1
                                                            ).padStart(
                                                                2,
                                                                '0'
                                                            )}
                                                        </span>
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="truncate font-serif text-xl font-light text-foreground">
                                                            {
                                                                wedding.groom_name
                                                            }{' '}
                                                            &{' '}
                                                            {
                                                                wedding.bride_name
                                                            }
                                                        </p>

                                                        <p className="mt-1 truncate text-[10px] text-muted-foreground">
                                                            /
                                                            {
                                                                wedding.slug
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </Link>

                                            {/* Wedding-specific actions */}
                                            <div className="flex items-center gap-1 sm:shrink-0">
                                                <Link
                                                    href={`/admin/weddings/${wedding.id}`}
                                                    aria-label={t(
                                                        'seating'
                                                    )}
                                                    className="flex h-9 items-center gap-2 rounded-full px-3 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                                                >
                                                    <Armchair
                                                        className="h-3.5 w-3.5"
                                                        strokeWidth={
                                                            1.6
                                                        }
                                                    />

                                                    <span className="hidden xl:inline">
                                                        {t(
                                                            'seating'
                                                        )}
                                                    </span>
                                                </Link>

                                                <Link
                                                    href={`/admin/weddings/${wedding.id}/photos`}
                                                    aria-label={t(
                                                        'photosLabel'
                                                    )}
                                                    className="flex h-9 items-center gap-2 rounded-full px-3 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                                                >
                                                    <Images
                                                        className="h-3.5 w-3.5"
                                                        strokeWidth={
                                                            1.6
                                                        }
                                                    />

                                                    <span className="hidden xl:inline">
                                                        {t(
                                                            'photosLabel'
                                                        )}
                                                    </span>
                                                </Link>

                                                <Link
                                                    href={`/admin/weddings/${wedding.id}`}
                                                    aria-label="Open"
                                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition group-hover:bg-foreground group-hover:text-background"
                                                >
                                                    <ArrowRight className="h-4 w-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    )
                                )}
                        </div>

                        {/* Mobile */}
                        <div className="border-t border-border/60 p-3 sm:hidden">
                            <Link
                                href="/admin/weddings"
                                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                            >
                                {t(
                                    'viewAllWeddings'
                                )}

                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ====================================
                    RIGHT COLUMN
                ==================================== */}
                <aside className="space-y-6">
                    {/* QUICK ACTIONS */}
                    <div>
                        <div className="mb-4">
                            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                {t(
                                    'management'
                                )}
                            </p>

                            <h2 className="mt-1 font-serif text-2xl font-light tracking-tight text-foreground">
                                {t(
                                    'quickActions'
                                )}
                            </h2>
                        </div>

                        <div className="rounded-[2rem] border border-border/70 bg-card/80 p-2 shadow-sm backdrop-blur">
                            {/* CREATE → MODAL */}
                            <CreateWeddingModalTrigger
                                adminEmail={
                                    adminEmail
                                }
                                className="group flex w-full items-center gap-4 rounded-[1.4rem] p-4 text-left transition-colors hover:bg-secondary/50"
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                                    <Plus
                                        className="h-4 w-4"
                                        strokeWidth={
                                            1.6
                                        }
                                    />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-foreground">
                                        {t(
                                            'createWedding'
                                        )}
                                    </p>

                                    <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                                        {t(
                                            'createWeddingDescription'
                                        )}
                                    </p>
                                </div>

                                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                            </CreateWeddingModalTrigger>

                            <QuickAction
                                href="/admin/weddings"
                                icon={
                                    Heart
                                }
                                title={t(
                                    'manageWeddings'
                                )}
                                description={t(
                                    'manageWeddingsDescription'
                                )}
                            />
                        </div>
                    </div>

                    {/* AT A GLANCE */}
                    <div className="rounded-[2rem] border border-border/70 bg-card/80 p-5 shadow-sm backdrop-blur">
                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            {t(
                                'atAGlance'
                            )}
                        </p>

                        <div className="mt-5 space-y-4">
                            <DashboardSummaryRow
                                label={t(
                                    'activeWeddings'
                                )}
                                value={
                                    stats
                                        .weddings
                                        .length
                                }
                            />

                            <DashboardSummaryRow
                                label={t(
                                    'totalGuests'
                                )}
                                value={
                                    stats.totalGuests
                                }
                            />

                            <DashboardSummaryRow
                                label={t(
                                    'photosLabel'
                                )}
                                value={
                                    stats.totalPhotos
                                }
                            />

                            <DashboardSummaryRow
                                label={t(
                                    'pendingPhotos'
                                )}
                                value={
                                    stats.pendingPhotos
                                }
                                attention={
                                    stats.pendingPhotos >
                                    0
                                }
                            />
                        </div>
                    </div>
                </aside>
            </div>

            {/* Footer */}
            <p className="mt-12 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/45">
                Wedora Admin
            </p>
        </main>
    )
}

/*
 * STAT CARD
 */
function StatCard({
                      icon: Icon,
                      value,
                      label,
                      attention = false,
                  }: {
    icon: typeof Heart
    value: number
    label: string
    attention?: boolean
}) {
    return (
        <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur sm:p-5">
            <div className="mb-5 flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                    <Icon
                        className="h-4 w-4 text-[hsl(var(--primary))]"
                        strokeWidth={
                            1.6
                        }
                    />
                </div>

                {attention &&
                    value > 0 && (
                        <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
                    )}
            </div>

            <p className="font-serif text-3xl font-light tracking-tight text-foreground sm:text-4xl">
                {value}
            </p>

            <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                {label}
            </p>
        </div>
    )
}

/*
 * QUICK ACTION
 */
function QuickAction({
                         href,
                         icon: Icon,
                         title,
                         description,
                     }: {
    href: string
    icon: typeof Heart
    title: string
    description: string
}) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-4 rounded-[1.4rem] p-4 transition-colors hover:bg-secondary/50"
        >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                <Icon
                    className="h-4 w-4"
                    strokeWidth={
                        1.6
                    }
                />
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                    {title}
                </p>

                <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                    {description}
                </p>
            </div>

            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
    )
}

/*
 * SUMMARY ROW
 */
function DashboardSummaryRow({
                                 label,
                                 value,
                                 attention = false,
                             }: {
    label: string
    value: number
    attention?: boolean
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
                {attention && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
                )}

                <span className="text-xs text-muted-foreground">
                    {label}
                </span>
            </div>

            <span className="text-sm font-medium tabular-nums text-foreground">
                {value}
            </span>
        </div>
    )
}