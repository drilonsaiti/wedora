import {ArrowLeft, Heart, LogIn, ShieldAlert,} from 'lucide-react'
import {getTranslations} from 'next-intl/server'

import {Link} from '@/lib/navigation'

export default async function AdminUnauthorizedPage() {
    const t =
        await getTranslations(
            'unauthorized.admin'
        )

    return (
        <main
            className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6">
            {/* =====================================
                AMBIENT BACKGROUND
            ===================================== */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden"
            >
                <div
                    className="absolute left-1/2 top-[-240px] h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/25 blur-[140px]"/>

                <div
                    className="absolute bottom-[-220px] right-[-180px] h-[420px] w-[420px] rounded-full bg-[hsl(var(--gold))]/8 blur-[130px]"/>
            </div>

            <div className="relative z-10 w-full max-w-xl">
                {/* =====================================
                    BRAND
                ===================================== */}
                <div className="mb-7 flex justify-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2.5"
                    >
                        <div
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white shadow-sm">
                            <Heart
                                className="h-3.5 w-3.5"
                                fill="currentColor"
                            />
                        </div>

                        <span className="font-serif text-xl tracking-tight text-foreground">
                            Wedora
                        </span>
                    </Link>
                </div>

                {/* =====================================
                    CARD
                ===================================== */}
                <section className="card-wedding px-6 py-10 text-center sm:px-10 sm:py-12">
                    <div
                        className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-secondary text-foreground">
                        <ShieldAlert
                            className="h-6 w-6"
                            strokeWidth={1.5}
                        />
                    </div>

                    <p className="mt-6 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        {t(
                            'eyebrow'
                        )}
                    </p>

                    <h1 className="mx-auto mt-2 max-w-md font-serif text-3xl font-light tracking-[-0.025em] text-foreground sm:text-4xl">
                        {t(
                            'title'
                        )}
                    </h1>

                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                        {t(
                            'description'
                        )}
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Link
                            href="/admin/login"
                            className="btn-primary justify-center"
                        >
                            <LogIn
                                className="h-4 w-4"
                                strokeWidth={1.7}
                            />

                            {t(
                                'login'
                            )}
                        </Link>

                        <Link
                            href="/"
                            className="btn-secondary justify-center"
                        >
                            <ArrowLeft
                                className="h-4 w-4"
                                strokeWidth={1.7}
                            />

                            {t(
                                'home'
                            )}
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    )
}