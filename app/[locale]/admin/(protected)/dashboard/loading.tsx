import {getTranslations} from 'next-intl/server'

import {Skeleton} from '@/components/ui/skeleton'

export default async function DashboardLoading() {
    const t = await getTranslations('common')

    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label={t('loading')}
            className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
        >
            <span className="sr-only">
                {t('loading')}
            </span>

            {/* =====================================
                PAGE HEADER
            ===================================== */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-3">
                    <Skeleton className="h-3 w-20 rounded-full"/>

                    <Skeleton className="h-10 w-52 rounded-xl sm:h-12 sm:w-64"/>

                    <Skeleton className="h-4 w-full max-w-[340px]"/>
                </div>

                <Skeleton className="h-11 w-40 rounded-full"/>
            </div>

            {/* =====================================
                STATS
            ===================================== */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({
                    length: 4,
                }).map((_, index) => (
                    <div
                        key={index}
                        className="rounded-[1.75rem] border border-border/70 bg-card p-5 shadow-sm"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-3">
                                <Skeleton className="h-3 w-24"/>
                                <Skeleton className="h-8 w-16 rounded-lg"/>
                            </div>

                            <Skeleton className="h-10 w-10 rounded-xl"/>
                        </div>

                        <Skeleton className="mt-5 h-3 w-28"/>
                    </div>
                ))}
            </div>

            {/* =====================================
                MAIN CONTENT
            ===================================== */}
            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                {/* Recent weddings */}
                <section className="card-wedding overflow-hidden">
                    <div
                        className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-5 sm:px-6">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-36"/>
                            <Skeleton className="h-3 w-52"/>
                        </div>

                        <Skeleton className="h-8 w-20 rounded-full"/>
                    </div>

                    <div className="divide-y divide-border/60">
                        {Array.from({
                            length: 4,
                        }).map((_, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-4 px-5 py-5 sm:px-6"
                            >
                                {/* Date */}
                                <Skeleton className="h-12 w-12 shrink-0 rounded-xl"/>

                                {/* Wedding */}
                                <div className="min-w-0 flex-1 space-y-2">
                                    <Skeleton
                                        className={
                                            index % 2 === 0
                                                ? 'h-4 w-44'
                                                : 'h-4 w-36'
                                        }
                                    />

                                    <div className="flex gap-2">
                                        <Skeleton className="h-3 w-20"/>
                                        <Skeleton className="h-3 w-16"/>
                                    </div>
                                </div>

                                {/* Status */}
                                <Skeleton className="hidden h-7 w-20 rounded-full sm:block"/>

                                {/* Action */}
                                <Skeleton className="h-9 w-9 shrink-0 rounded-xl"/>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Quick actions */}
                <aside className="card-wedding p-5 sm:p-6">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-28"/>
                        <Skeleton className="h-3 w-44"/>
                    </div>

                    <div className="mt-5 space-y-3">
                        {Array.from({
                            length: 3,
                        }).map((_, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background p-3.5"
                            >
                                <Skeleton className="h-10 w-10 shrink-0 rounded-xl"/>

                                <div className="min-w-0 flex-1 space-y-2">
                                    <Skeleton
                                        className={
                                            index === 1
                                                ? 'h-3.5 w-28'
                                                : 'h-3.5 w-32'
                                        }
                                    />

                                    <Skeleton className="h-3 w-full max-w-[180px]"/>
                                </div>

                                <Skeleton className="h-4 w-4 shrink-0 rounded-md"/>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>

            {/* =====================================
                LOWER SUMMARY
            ===================================== */}
            <section className="mt-6 card-wedding p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-24"/>
                        <Skeleton className="h-3 w-56"/>
                    </div>

                    <div className="flex gap-2">
                        <Skeleton className="h-8 w-24 rounded-full"/>
                        <Skeleton className="h-8 w-20 rounded-full"/>
                    </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {Array.from({
                        length: 3,
                    }).map((_, index) => (
                        <div
                            key={index}
                            className="rounded-2xl bg-secondary/35 p-4"
                        >
                            <Skeleton className="h-3 w-20"/>
                            <Skeleton className="mt-3 h-6 w-12 rounded-md"/>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}