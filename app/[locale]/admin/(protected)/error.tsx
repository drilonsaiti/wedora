'use client'

import { useEffect } from 'react'

import {
    AlertCircle,
    LayoutDashboard,
    RefreshCw,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link } from '@/lib/navigation'

interface AdminErrorProps {
    error: Error & {
        digest?: string
    }
    reset: () => void
}

export default function AdminError({
                                       error,
                                       reset,
                                   }: AdminErrorProps) {
    const t = useTranslations('errors.admin')

    useEffect(() => {
        console.error(
            '[Admin error boundary]',
            error
        )
    }, [error])

    return (
        <main className="relative flex min-h-[calc(100dvh-80px)] items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
            {/* =====================================
                AMBIENT BACKGROUND
            ===================================== */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden"
            >
                <div className="absolute left-1/2 top-[-260px] h-[520px] w-[680px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/20 blur-[140px]" />
            </div>

            {/* =====================================
                CONTENT
            ===================================== */}
            <div className="relative z-10 w-full max-w-xl">
                <div className="card-wedding px-6 py-10 text-center sm:px-10 sm:py-12">
                    {/* Icon */}
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/15 bg-destructive/[0.05] text-destructive">
                        <AlertCircle
                            className="h-6 w-6"
                            strokeWidth={1.5}
                        />
                    </div>

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

                    {/* =================================
                        ACTIONS
                    ================================= */}
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <button
                            type="button"
                            onClick={reset}
                            className="btn-primary justify-center"
                        >
                            <RefreshCw
                                className="h-4 w-4"
                                strokeWidth={1.7}
                            />

                            {t('retry')}
                        </button>

                        <Link
                            href="/admin/dashboard"
                            className="btn-secondary justify-center"
                        >
                            <LayoutDashboard
                                className="h-4 w-4"
                                strokeWidth={1.7}
                            />

                            {t('dashboard')}
                        </Link>
                    </div>

                    {/* =================================
                        ERROR REFERENCE
                    ================================= */}
                    {error.digest && (
                        <div className="mt-7 border-t border-border/60 pt-5">
                            <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground/60">
                                {t('reference')}
                            </p>

                            <code className="mt-1 block break-all text-[10px] text-muted-foreground">
                                {error.digest}
                            </code>
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}