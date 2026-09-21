import {getTranslations} from 'next-intl/server'

import {Skeleton} from '@/components/ui/skeleton'

export default async function SeatingLoading() {
    const t = await getTranslations('common')

    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label={t('loading')}
            className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
        >
            <span className="sr-only">
                {t('loading')}
            </span>

            {/* =====================================
                HEADER
            ===================================== */}
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                    <Skeleton className="h-3 w-28 rounded-full"/>

                    <Skeleton className="h-10 w-56 rounded-xl sm:h-12 sm:w-72"/>

                    <Skeleton className="h-4 w-full max-w-[420px]"/>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-10 w-28 rounded-full"/>
                    <Skeleton className="h-10 w-32 rounded-full"/>
                    <Skeleton className="h-10 w-10 rounded-full"/>
                </div>
            </div>

            {/* =====================================
                SUMMARY
            ===================================== */}
            <div className="mt-6 grid grid-cols-3 gap-2 sm:max-w-md">
                {Array.from({
                    length: 3,
                }).map((_, index) => (
                    <div
                        key={index}
                        className="rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm"
                    >
                        <Skeleton className="h-2.5 w-14"/>
                        <Skeleton className="mt-2 h-6 w-9 rounded-md"/>
                    </div>
                ))}
            </div>

            {/* =====================================
                MAIN DESIGNER
            ===================================== */}
            <div className="mt-6 grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                {/* =================================
                    LEFT CONTROL PANEL
                ================================= */}
                <aside className="space-y-4">
                    {/* Tabs */}
                    <div className="card-wedding p-2">
                        <div className="grid grid-cols-2 gap-1">
                            <Skeleton className="h-10 rounded-xl"/>
                            <Skeleton className="h-10 rounded-xl"/>
                        </div>
                    </div>

                    {/* Search + action */}
                    <div className="card-wedding p-4">
                        <Skeleton className="h-10 w-full rounded-xl"/>

                        <Skeleton className="mt-3 h-10 w-full rounded-full"/>
                    </div>

                    {/* Guest/table list */}
                    <div className="card-wedding overflow-hidden">
                        <div className="border-b border-border/60 px-4 py-4">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-24"/>
                                <Skeleton className="h-6 w-10 rounded-full"/>
                            </div>
                        </div>

                        <div className="divide-y divide-border/50">
                            {Array.from({
                                length: 7,
                            }).map((_, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 px-4 py-3.5"
                                >
                                    <Skeleton className="h-9 w-9 shrink-0 rounded-full"/>

                                    <div className="min-w-0 flex-1 space-y-2">
                                        <Skeleton
                                            className={
                                                index % 3 === 0
                                                    ? 'h-3.5 w-32'
                                                    : index % 3 === 1
                                                        ? 'h-3.5 w-24'
                                                        : 'h-3.5 w-28'
                                            }
                                        />

                                        <Skeleton className="h-2.5 w-20"/>
                                    </div>

                                    <Skeleton className="h-8 w-8 shrink-0 rounded-lg"/>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* =================================
                    VENUE DESIGNER
                ================================= */}
                <section className="min-w-0">
                    <div className="card-wedding overflow-hidden">
                        {/* Designer toolbar */}
                        <div
                            className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-8 w-24 rounded-xl"/>
                                <Skeleton className="h-8 w-28 rounded-xl"/>
                            </div>

                            <div className="flex items-center gap-2">
                                <Skeleton className="h-8 w-8 rounded-xl"/>
                                <Skeleton className="h-8 w-8 rounded-xl"/>
                                <Skeleton className="h-8 w-20 rounded-xl"/>
                            </div>
                        </div>

                        {/* Canvas */}
                        <div
                            className="relative min-h-[520px] overflow-hidden bg-background sm:min-h-[620px] xl:min-h-[700px]">
                            {/* Very faint grid suggestion */}
                            <div
                                aria-hidden
                                className="pointer-events-none absolute inset-0 opacity-40"
                                style={{
                                    backgroundImage:
                                        'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
                                    backgroundSize:
                                        '24px 24px',
                                }}
                            />

                            {/* Venue element */}
                            <Skeleton className="absolute left-[7%] top-[10%] h-16 w-24 rounded-2xl"/>

                            {/* Table 1 */}
                            <div className="absolute left-[24%] top-[22%]">
                                <Skeleton className="h-28 w-28 rounded-full"/>

                                <Skeleton className="absolute -left-3 top-8 h-7 w-7 rounded-full"/>
                                <Skeleton className="absolute -right-3 top-8 h-7 w-7 rounded-full"/>
                                <Skeleton className="absolute left-[38px] -top-3 h-7 w-7 rounded-full"/>
                                <Skeleton className="absolute bottom-[-12px] left-[38px] h-7 w-7 rounded-full"/>
                            </div>

                            {/* Table 2 */}
                            <div className="absolute right-[18%] top-[18%]">
                                <Skeleton className="h-24 w-36 rounded-2xl"/>

                                <Skeleton className="absolute -top-3 left-5 h-7 w-7 rounded-full"/>
                                <Skeleton className="absolute -top-3 right-5 h-7 w-7 rounded-full"/>
                                <Skeleton className="absolute -bottom-3 left-5 h-7 w-7 rounded-full"/>
                                <Skeleton className="absolute -bottom-3 right-5 h-7 w-7 rounded-full"/>
                            </div>

                            {/* Table 3 */}
                            <div className="absolute bottom-[20%] left-[42%]">
                                <Skeleton className="h-28 w-28 rounded-2xl"/>

                                <Skeleton className="absolute -left-3 top-[38px] h-7 w-7 rounded-full"/>
                                <Skeleton className="absolute -right-3 top-[38px] h-7 w-7 rounded-full"/>
                                <Skeleton className="absolute left-[38px] -top-3 h-7 w-7 rounded-full"/>
                                <Skeleton className="absolute bottom-[-12px] left-[38px] h-7 w-7 rounded-full"/>
                            </div>

                            {/* Venue element */}
                            <Skeleton className="absolute bottom-[12%] right-[8%] h-20 w-32 rounded-2xl"/>
                        </div>

                        {/* Canvas footer/status */}
                        <div
                            className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3 sm:px-5">
                            <Skeleton className="h-3 w-36"/>

                            <div className="flex gap-2">
                                <Skeleton className="h-7 w-16 rounded-full"/>
                                <Skeleton className="h-7 w-16 rounded-full"/>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}