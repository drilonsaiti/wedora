import { getTranslations } from 'next-intl/server'

import { Skeleton } from '@/components/ui/skeleton'

export default async function WeddingsLoading() {
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
                HEADER
            ===================================== */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-3">
                    <Skeleton className="h-3 w-24 rounded-full" />

                    <Skeleton className="h-10 w-44 rounded-xl sm:h-12 sm:w-56" />

                    <Skeleton className="h-4 w-full max-w-[360px]" />
                </div>

                <Skeleton className="h-11 w-40 rounded-full" />
            </div>

            {/* =====================================
                TOOLBAR
            ===================================== */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Skeleton className="h-11 w-full rounded-xl sm:max-w-sm" />

                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-24 rounded-full" />
                    <Skeleton className="h-8 w-20 rounded-full" />
                </div>
            </div>

            {/* =====================================
                WEDDINGS LIST
            ===================================== */}
            <section className="mt-5 space-y-3">
                {Array.from({
                    length: 5,
                }).map((_, index) => (
                    <div
                        key={index}
                        className="card-wedding p-4 sm:p-5"
                    >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                            {/* Main wedding info */}
                            <div className="flex min-w-0 flex-1 items-start gap-4">
                                <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />

                                <div className="min-w-0 flex-1 space-y-2">
                                    <Skeleton
                                        className={
                                            index % 2 === 0
                                                ? 'h-5 w-48'
                                                : 'h-5 w-40'
                                        }
                                    />

                                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                                        <Skeleton className="h-3 w-24" />
                                        <Skeleton className="h-3 w-28" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </div>
                            </div>

                            {/* Metrics */}
                            <div className="grid grid-cols-3 gap-2 sm:w-auto lg:min-w-[290px]">
                                {Array.from({
                                    length: 3,
                                }).map((_, metricIndex) => (
                                    <div
                                        key={metricIndex}
                                        className="rounded-2xl bg-secondary/30 px-3 py-3 text-center"
                                    >
                                        <Skeleton className="mx-auto h-3 w-12" />
                                        <Skeleton className="mx-auto mt-2 h-5 w-8 rounded-md" />
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4 lg:justify-end lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                                <Skeleton className="h-7 w-20 rounded-full" />

                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-9 w-9 rounded-xl" />
                                    <Skeleton className="h-9 w-9 rounded-xl" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </section>

            {/* =====================================
                FOOTER COUNT
            ===================================== */}
            <div className="mt-5 flex justify-center">
                <Skeleton className="h-3 w-28" />
            </div>
        </div>
    )
}