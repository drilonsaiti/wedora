import {ArrowLeft, CalendarDays, LayoutDashboard, SearchX,} from 'lucide-react'
import {getTranslations} from 'next-intl/server'

import {Link} from '@/lib/navigation'

export default async function AdminNotFound() {
    const t =
        await getTranslations(
            'notFound.admin'
        )

    return (
        <main
            className="relative flex min-h-[calc(100dvh-80px)] items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
            {/* =====================================
                AMBIENT BACKGROUND
            ===================================== */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden"
            >
                <div
                    className="absolute left-1/2 top-[-280px] h-[520px] w-[680px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/20 blur-[140px]"/>
            </div>

            {/* =====================================
                CONTENT
            ===================================== */}
            <div className="relative z-10 w-full max-w-xl">
                <div className="card-wedding px-6 py-10 text-center sm:px-10 sm:py-12">
                    {/* Icon */}
                    <div
                        className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-secondary/60 text-foreground">
                        <SearchX
                            className="h-6 w-6"
                            strokeWidth={1.5}
                        />
                    </div>

                    {/* Copy */}
                    <div className="mx-auto mt-6 max-w-md">
                        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                            {t('eyebrow')}
                        </p>

                        <h1 className="mt-2 font-serif text-3xl font-light tracking-[-0.025em] text-foreground sm:text-4xl">
                            {t('title')}
                        </h1>

                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {t('description')}
                        </p>
                    </div>

                    {/* 404 */}
                    <div className="my-8 flex items-center gap-4">
                        <div className="h-px flex-1 bg-border/70"/>

                        <span className="text-[10px] font-medium tracking-[0.2em] text-muted-foreground/60">
                            404
                        </span>

                        <div className="h-px flex-1 bg-border/70"/>
                    </div>

                    {/* Primary actions */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Link
                            href="/admin/dashboard"
                            className="btn-primary justify-center"
                        >
                            <LayoutDashboard className="h-4 w-4"/>

                            {t('dashboard')}
                        </Link>

                        <Link
                            href="/admin/weddings"
                            className="btn-secondary justify-center"
                        >
                            <CalendarDays className="h-4 w-4"/>

                            {t('weddings')}
                        </Link>
                    </div>

                    {/* Secondary action */}
                    <div className="mt-6 border-t border-border/60 pt-5">
                        <Link
                            href="/admin/dashboard"
                            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ArrowLeft
                                className="h-3.5 w-3.5"
                                strokeWidth={1.7}
                            />

                            {t('back')}
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    )
}