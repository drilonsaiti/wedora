import { getTranslations } from 'next-intl/server'

import { Skeleton } from '@/components/ui/skeleton'

export default async function AdminSettingsLoading() {
    const t =
        await getTranslations(
            'common'
        )

    return (
        <main
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label={t(
                'loading'
            )}
            className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
        >
            <span className="sr-only">
                {t(
                    'loading'
                )}
            </span>

            {/* =====================================
                HEADER
            ===================================== */}
            <section className="mb-8">
                <Skeleton className="h-10 w-10 rounded-xl" />

                <Skeleton className="mt-5 h-3 w-16 rounded-full" />

                <Skeleton className="mt-3 h-11 w-48 rounded-xl sm:h-12 sm:w-56" />

                <Skeleton className="mt-3 h-4 w-full max-w-[420px]" />
            </section>

            <div className="space-y-5">
                {/* =====================================
                    ACCOUNT
                ===================================== */}
                <section className="card-wedding overflow-hidden">
                    <div className="flex items-start gap-4 border-b border-border/60 px-5 py-5 sm:px-6">
                        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />

                        <div className="min-w-0 flex-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="mt-2 h-3 w-full max-w-[320px]" />
                        </div>
                    </div>

                    <div className="px-5 py-5 sm:px-6">
                        <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                            <Skeleton className="h-3 w-20" />

                            <Skeleton className="h-11 w-full rounded-xl" />
                        </div>

                        <div className="mt-5 grid gap-3 border-t border-border/60 pt-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                            <Skeleton className="h-3 w-14" />

                            <Skeleton className="h-8 w-32 rounded-full" />
                        </div>
                    </div>
                </section>

                {/* =====================================
                    APPEARANCE
                ===================================== */}
                <section className="card-wedding overflow-hidden">
                    <div className="flex items-start gap-4 border-b border-border/60 px-5 py-5 sm:px-6">
                        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />

                        <div className="min-w-0 flex-1">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="mt-2 h-3 w-full max-w-[340px]" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div className="min-w-0 flex-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="mt-2 h-3 w-full max-w-[300px]" />
                        </div>

                        <Skeleton className="h-9 w-20 shrink-0 rounded-xl" />
                    </div>
                </section>

                {/* =====================================
                    SECURITY
                ===================================== */}
                <section className="card-wedding">
                    <div className="flex items-start gap-4 px-5 py-5 sm:px-6">
                        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />

                        <div className="min-w-0 flex-1">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="mt-2 h-3 w-full max-w-[380px]" />
                            <Skeleton className="mt-1.5 h-3 w-full max-w-[260px]" />
                        </div>
                    </div>
                </section>

                {/* =====================================
                    SESSION
                ===================================== */}
                <section className="card-wedding p-5 sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="mt-2 h-3 w-full max-w-[320px]" />
                        </div>

                        <Skeleton className="h-11 w-28 shrink-0 rounded-full" />
                    </div>
                </section>
            </div>
        </main>
    )
}