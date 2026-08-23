import Link from 'next/link'
import { Heart } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function SiteFooter() {
    const t = await getTranslations('landing')

    return (
        <footer className="px-6 py-10">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 border-t border-border/70 pt-8 sm:flex-row">
                <Link href="/" className="flex items-center gap-2">
                    <Heart
                        className="h-4 w-4 text-[hsl(var(--primary))]"
                        fill="currentColor"
                    />

                    <span className="font-serif text-lg">Wedora</span>
                </Link>

                <div className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
                    <Link href="#features">{t('nav.features')}</Link>
                    <Link href="#pricing">{t('nav.pricing')}</Link>
                    <a href="mailto:contact@wedora.com">contact@wedora.com</a>
                </div>

                <p className="text-xs text-muted-foreground">{t('footer')}</p>
            </div>
        </footer>
    )
}