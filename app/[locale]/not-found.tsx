import {
    ArrowLeft,
    Heart,
    Home,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/lib/navigation'

export default async function NotFound() {
    const t =
        await getTranslations(
            'notFound'
        )

    return (
        <main className="relative flex min-h-screen overflow-hidden bg-background px-6 py-10">
            {/* =====================================
                AMBIENT BACKGROUND
            ===================================== */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
            >
                <div className="absolute left-1/2 top-[-240px] h-[600px] w-[760px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/30 blur-[140px]" />

                <div className="absolute bottom-[-220px] right-[-180px] h-[420px] w-[420px] rounded-full bg-[hsl(var(--gold))]/8 blur-[130px]" />
            </div>

            <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col">
                {/* =================================
                    BRAND
                ================================= */}
                <Link
                    href="/"
                    className="mx-auto inline-flex items-center gap-2.5"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white shadow-sm">
                        <Heart
                            className="h-3.5 w-3.5"
                            fill="currentColor"
                            strokeWidth={1.5}
                        />
                    </div>

                    <span className="font-serif text-xl tracking-tight text-foreground">
                        Wedora
                    </span>
                </Link>

                {/* =================================
                    CONTENT
                ================================= */}
                <div className="flex flex-1 items-center justify-center py-16 sm:py-24">
                    <div className="w-full max-w-xl text-center">
                        {/* 404 */}
                        <div className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-border/70 bg-card/75 shadow-sm backdrop-blur">
                            <span className="font-serif text-5xl font-light tracking-[-0.05em] text-foreground">
                                404
                            </span>

                            <span className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full border-4 border-background bg-[hsl(var(--primary))]" />
                        </div>

                        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[hsl(var(--primary))]">
                            {t('eyebrow')}
                        </p>

                        <h1 className="font-serif text-4xl font-light tracking-[-0.03em] text-foreground sm:text-5xl">
                            {t('title')}
                        </h1>

                        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                            {t('description')}
                        </p>

                        {/* Actions */}
                        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <Link
                                href="/"
                                className="btn-primary min-w-[160px] justify-center"
                            >
                                <Home className="h-4 w-4" />

                                {t('home')}
                            </Link>

                        </div>

                        <div className="mt-7">
                            <Link
                                href="/"
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

                {/* =================================
                    FOOTER
                ================================= */}
                <p className="text-center text-[9px] uppercase tracking-[0.2em] text-muted-foreground/45">
                    Wedora
                </p>
            </div>
        </main>
    )
}