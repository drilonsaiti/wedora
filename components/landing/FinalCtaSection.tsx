import Link from 'next/link'
import { ArrowRight, Heart } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function FinalCtaSection() {
    const t = await getTranslations('landing')

    return (
        <section className="px-6 pb-10">
            <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[hsl(var(--primary))] px-7 py-20 text-center text-white sm:px-12 lg:py-24">
                <div
                    aria-hidden
                    className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl"
                />

                <div className="relative mx-auto max-w-2xl">
                    <Heart className="mx-auto mb-6 h-5 w-5" fill="currentColor" />

                    <h2 className="font-serif text-4xl font-light tracking-tight sm:text-5xl">
                        {t('finalCta.title')}
                    </h2>

                    <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-white/70">
                        {t('finalCta.description')}
                    </p>

                    <Link
                        href="/demo"
                        className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-medium text-[hsl(var(--primary))] transition hover:scale-[1.02]"
                    >
                        {t('finalCta.button')}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </section>
    )
}