import Link from 'next/link'
import {ArrowRight, Heart} from 'lucide-react'
import {getTranslations} from 'next-intl/server'

export async function SiteHeader() {
    const t = await getTranslations('landing')

    return (
        <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
            <div
                className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-2xl border border-border/60 bg-background/80 px-5 shadow-sm backdrop-blur-xl md:px-7">
                <Link
                    href="/"
                    className="flex items-center gap-2.5"
                    aria-label="Wedora"
                >
                    <div
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white">
                        <Heart className="h-3.5 w-3.5" fill="currentColor"/>
                    </div>

                    <span className="font-serif text-xl font-medium tracking-tight">
                        Wedora
                    </span>
                </Link>

                <nav className="hidden items-center gap-7 md:flex">
                    <Link href="#features" className="nav-link">
                        {t('nav.features')}
                    </Link>

                    <Link href="#how-it-works" className="nav-link">
                        {t('nav.howItWorks')}
                    </Link>

                    <Link href="#pricing" className="nav-link">
                        {t('nav.pricing')}
                    </Link>
                </nav>

                <Link
                    href="/demo"
                    className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--foreground))] px-5 py-2.5 text-xs font-medium tracking-wide text-background transition hover:opacity-85"
                >
                    {t('nav.demo')}
                    <ArrowRight className="h-3.5 w-3.5"/>
                </Link>
            </div>
        </header>
    )
}