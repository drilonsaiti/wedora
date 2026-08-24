import {
    LogOut,
    MonitorCog,
    Settings2,
    ShieldCheck,
    UserRound,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { ThemeToggle } from '@/components/theme-toggle'
import { createClient } from '@/lib/supabase/server'

export default async function AdminSettingsPage() {
    const t =
        await getTranslations(
            'adminSettings'
        )

    const supabase =
        await createClient()

    const {
        data: {
            user,
        },
    } =
        await supabase.auth.getUser()

    if (!user) {
        redirect(
            '/admin/login'
        )
    }

    const email =
        user.email ??
        '—'

    return (
        <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
            {/* =====================================
                HEADER
            ===================================== */}
            <section className="mb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
                    <Settings2
                        className="h-4.5 w-4.5"
                        strokeWidth={1.6}
                    />
                </div>

                <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                    {t(
                        'eyebrow'
                    )}
                </p>

                <h1 className="mt-2 font-serif text-4xl font-light tracking-[-0.025em] text-foreground sm:text-5xl">
                    {t(
                        'title'
                    )}
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                    {t(
                        'description'
                    )}
                </p>
            </section>

            <div className="space-y-5">
                {/* =====================================
                    ACCOUNT
                ===================================== */}
                <section className="card-wedding overflow-hidden">
                    <div className="flex items-start gap-4 border-b border-border/60 px-5 py-5 sm:px-6">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                            <UserRound
                                className="h-4 w-4"
                                strokeWidth={1.6}
                            />
                        </div>

                        <div>
                            <h2 className="text-sm font-medium text-foreground">
                                {t(
                                    'account.title'
                                )}
                            </h2>

                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                {t(
                                    'account.description'
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="px-5 py-5 sm:px-6">
                        <div className="grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                            <div>
                                <p className="label-wedding mb-0">
                                    {t(
                                        'account.email'
                                    )}
                                </p>
                            </div>

                            <div className="flex min-h-11 items-center rounded-xl border border-border/70 bg-secondary/25 px-4">
                                <p className="truncate text-sm text-foreground">
                                    {email}
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-5 border-t border-border/60 pt-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                            <div>
                                <p className="label-wedding mb-0">
                                    {t(
                                        'account.role'
                                    )}
                                </p>
                            </div>

                            <div>
                                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-foreground">
                                    <ShieldCheck
                                        className="h-3.5 w-3.5 text-[hsl(var(--primary))]"
                                        strokeWidth={1.7}
                                    />

                                    {t(
                                        'account.admin'
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* =====================================
                    APPEARANCE
                ===================================== */}
                <section className="card-wedding overflow-hidden">
                    <div className="flex items-start gap-4 border-b border-border/60 px-5 py-5 sm:px-6">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                            <MonitorCog
                                className="h-4 w-4"
                                strokeWidth={1.6}
                            />
                        </div>

                        <div>
                            <h2 className="text-sm font-medium text-foreground">
                                {t(
                                    'appearance.title'
                                )}
                            </h2>

                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                {t(
                                    'appearance.description'
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                {t(
                                    'appearance.theme'
                                )}
                            </p>

                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                {t(
                                    'appearance.themeDescription'
                                )}
                            </p>
                        </div>

                        <ThemeToggle />
                    </div>
                </section>

                {/* =====================================
                    SECURITY
                ===================================== */}
                <section className="card-wedding overflow-hidden">
                    <div className="flex items-start gap-4 px-5 py-5 sm:px-6">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                            <ShieldCheck
                                className="h-4 w-4"
                                strokeWidth={1.6}
                            />
                        </div>

                        <div className="min-w-0 flex-1">
                            <h2 className="text-sm font-medium text-foreground">
                                {t(
                                    'security.title'
                                )}
                            </h2>

                            <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
                                {t(
                                    'security.description'
                                )}
                            </p>
                        </div>
                    </div>
                </section>

                {/* =====================================
                    SESSION
                ===================================== */}
                <section className="rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-sm font-medium text-foreground">
                                {t(
                                    'session.title'
                                )}
                            </h2>

                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                {t(
                                    'session.description'
                                )}
                            </p>
                        </div>

                        <form
                            action="/auth/signout"
                            method="post"
                        >
                            <button
                                type="submit"
                                className="btn-secondary justify-center"
                            >
                                <LogOut
                                    className="h-4 w-4"
                                    strokeWidth={1.6}
                                />

                                {t(
                                    'session.logout'
                                )}
                            </button>
                        </form>
                    </div>
                </section>
            </div>
        </main>
    )
}