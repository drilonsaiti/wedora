import { getTranslations } from 'next-intl/server'

import { Skeleton } from '@/components/ui/skeleton'

export default async function WeddingLoading() {
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
                BACK
            ===================================== */}
            <Skeleton className="h-4 w-32" />

            {/* =====================================
                WEDDING HEADER
            ===================================== */}
            <section className="mt-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <Skeleton className="h-3 w-24 rounded-full" />
                            <Skeleton className="h-7 w-20 rounded-full" />
                        </div>

                        <Skeleton className="mt-4 h-11 w-64 rounded-xl sm:h-12 sm:w-80" />

                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-36" />
                        </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                        <Skeleton className="h-10 w-28 rounded-full" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                </div>
            </section>

            {/* =====================================
                OVERVIEW STATS
            ===================================== */}
            <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({
                    length: 4,
                }).map((_, index) => (
                    <div
                        key={index}
                        className="rounded-[1.75rem] border border-border/70 bg-card p-5 shadow-sm"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <Skeleton
                                    className={
                                        index === 0
                                            ? 'h-3 w-20'
                                            : index === 1
                                                ? 'h-3 w-24'
                                                : 'h-3 w-16'
                                    }
                                />

                                <Skeleton className="mt-3 h-7 w-14 rounded-lg" />
                            </div>

                            <Skeleton className="h-10 w-10 rounded-xl" />
                        </div>

                        <Skeleton className="mt-5 h-3 w-28" />
                    </div>
                ))}
            </section>

            {/* =====================================
                MANAGEMENT
            ===================================== */}
            <section className="mt-6 card-wedding overflow-hidden">
                <div className="border-b border-border/60 px-5 py-5 sm:px-6">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="mt-2 h-3 w-60 max-w-full" />
                </div>

                <div className="grid gap-px bg-border/50 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({
                        length: 3,
                    }).map((_, index) => (
                        <div
                            key={index}
                            className="bg-card p-5 sm:p-6"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <Skeleton className="h-11 w-11 rounded-xl" />

                                <Skeleton className="h-4 w-4 rounded-md" />
                            </div>

                            <Skeleton
                                className={
                                    index === 1
                                        ? 'mt-5 h-4 w-28'
                                        : 'mt-5 h-4 w-24'
                                }
                            />

                            <Skeleton className="mt-2 h-3 w-full max-w-[210px]" />
                            <Skeleton className="mt-1.5 h-3 w-40" />
                        </div>
                    ))}
                </div>
            </section>

            {/* =====================================
                DETAILS + PUBLIC EXPERIENCE
            ===================================== */}
            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                {/* Wedding details */}
                <section className="card-wedding p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="mt-2 h-3 w-52" />
                        </div>

                        <Skeleton className="h-9 w-20 rounded-full" />
                    </div>

                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        {Array.from({
                            length: 4,
                        }).map((_, index) => (
                            <div
                                key={index}
                                className="space-y-2"
                            >
                                <Skeleton className="h-3 w-20" />

                                <Skeleton
                                    className={
                                        index % 2 === 0
                                            ? 'h-4 w-36'
                                            : 'h-4 w-44'
                                    }
                                />
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 border-t border-border/60 pt-5">
                        <Skeleton className="h-3 w-20" />

                        <div className="mt-2 flex gap-2">
                            <Skeleton className="h-10 flex-1 rounded-xl" />
                            <Skeleton className="h-10 w-10 rounded-xl" />
                        </div>
                    </div>
                </section>

                {/* Guest experience */}
                <aside className="card-wedding p-5 sm:p-6">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="mt-2 h-3 w-48" />

                    <div className="mt-6 rounded-[1.5rem] border border-border/60 bg-secondary/20 p-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />

                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>

                        <Skeleton className="mt-5 h-28 w-full rounded-2xl" />

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <Skeleton className="h-9 rounded-full" />
                            <Skeleton className="h-9 rounded-full" />
                        </div>
                    </div>

                    <Skeleton className="mt-5 h-10 w-full rounded-full" />
                </aside>
            </div>
        </div>
    )
}