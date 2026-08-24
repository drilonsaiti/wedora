import { getTranslations } from 'next-intl/server'

import { Skeleton } from '@/components/ui/skeleton'

export default async function PhotosLoading() {
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
                HEADER
            ===================================== */}
            <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <Skeleton className="h-3 w-20 rounded-full" />

                    <Skeleton className="mt-3 h-10 w-44 rounded-xl sm:h-12 sm:w-52" />

                    <Skeleton className="mt-3 h-4 w-full max-w-[380px]" />
                </div>

                <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-10 w-32 rounded-full" />
                    <Skeleton className="h-10 w-32 rounded-full" />
                </div>
            </div>

            {/* =====================================
                FILTERS
            ===================================== */}
            <div className="mt-8 flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-1 overflow-hidden rounded-2xl border border-border/70 bg-card p-1">
                    {Array.from({
                        length: 4,
                    }).map((_, index) => (
                        <Skeleton
                            key={index}
                            className={
                                index === 0
                                    ? 'h-9 w-24 rounded-xl'
                                    : 'h-9 w-20 rounded-xl'
                            }
                        />
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-24 rounded-full" />
                    <Skeleton className="h-8 w-20 rounded-full" />
                </div>
            </div>

            {/* =====================================
                PHOTO GRID
            ===================================== */}
            <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({
                    length: 15,
                }).map((_, index) => {
                    const tall =
                        index === 1 ||
                        index === 5 ||
                        index === 9 ||
                        index === 13

                    return (
                        <div
                            key={index}
                            className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-card shadow-sm"
                        >
                            {/* Photo */}
                            <Skeleton
                                className={
                                    tall
                                        ? 'h-64 w-full rounded-none sm:h-72'
                                        : 'h-48 w-full rounded-none sm:h-56'
                                }
                            />

                            {/* Metadata */}
                            <div className="p-3">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-7 w-7 shrink-0 rounded-full" />

                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <Skeleton className="h-3 w-20" />
                                        <Skeleton className="h-2.5 w-14" />
                                    </div>

                                    <Skeleton className="h-7 w-7 rounded-lg" />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </section>

            {/* =====================================
                LOAD MORE
            ===================================== */}
            <div className="mt-8 flex justify-center">
                <Skeleton className="h-10 w-32 rounded-full" />
            </div>
        </div>
    )
}