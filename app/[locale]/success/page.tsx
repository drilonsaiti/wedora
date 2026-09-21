'use client'

import {ArrowLeft, Camera, Check, Heart,} from 'lucide-react'
import {useTranslations} from 'next-intl'

import {Link} from '@/lib/navigation'

export default function SuccessPage() {
    const t = useTranslations('wedding')

    return (
        <main
            className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-16">
            {/* Ambient background */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
            >
                <div
                    className="absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(var(--blush))]/30 blur-[120px]"/>

                <div
                    className="absolute bottom-[-180px] right-[-120px] h-[400px] w-[400px] rounded-full bg-[hsl(var(--gold))]/10 blur-[120px]"/>
            </div>

            <section className="relative z-10 mx-auto w-full max-w-lg text-center">

                {/* Brand */}
                <Link
                    href="/"
                    className="mb-14 inline-flex items-center gap-2 text-foreground"
                >
                    <Heart
                        className="h-4 w-4 text-[hsl(var(--primary))]"
                        fill="currentColor"
                    />

                    <span className="font-serif text-lg">
                        Wedora
                    </span>
                </Link>

                {/* Success state */}
                <div
                    className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-[hsl(var(--primary))]/15 bg-[hsl(var(--accent))] shadow-sm">
                    <Check
                        className="h-7 w-7 text-[hsl(var(--primary))]"
                        strokeWidth={1.7}
                    />
                </div>

                <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.25em] text-[hsl(var(--primary))]">
                    {t('upload.success.eyebrow')}
                </p>

                <h1 className="font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
                    {t('upload.success.title')}
                </h1>

                <p className="mx-auto mt-5 max-w-md text-base leading-7 text-muted-foreground">
                    {t('upload.success.description')}
                </p>

                {/* Confirmation card */}
                <div className="mt-9 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur">
                    <div className="flex items-center gap-3 text-left">
                        <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                            <Camera
                                className="h-4 w-4 text-[hsl(var(--primary))]"
                                strokeWidth={1.6}
                            />
                        </div>

                        <div>
                            <p className="text-sm font-medium text-foreground">
                                {t('upload.success.savedTitle')}
                            </p>

                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {t('upload.success.savedDescription')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex flex-col gap-3">
                    <Link
                        href="/upload"
                        className="btn-primary w-full justify-center"
                    >
                        <Camera className="h-4 w-4"/>

                        {t('upload.success.uploadAnother')}
                    </Link>

                    <Link
                        href="/"
                        className="btn-secondary w-full justify-center"
                    >
                        <ArrowLeft className="h-4 w-4"/>

                        {t('upload.success.backHome')}
                    </Link>
                </div>

                <p className="mt-8 text-xs text-muted-foreground/70">
                    {t('upload.success.footer')}
                </p>
            </section>
        </main>
    )
}