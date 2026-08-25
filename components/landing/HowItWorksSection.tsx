import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

const STEPS = ['create', 'organise', 'share'] as const

export async function HowItWorksSection() {
    const t = await getTranslations('landing')

    return (
        <section
            id="how-it-works"
            // Was bg-[hsl(var(--dark))] — that token flips to a near-white
            // value in .dark mode (see globals.css), which made this whole
            // section render as a pale/cream box with barely-visible white
            // text whenever the site was in dark mode. --ink is fixed to
            // the same near-black value in both themes.
            className="bg-[hsl(var(--ink))] px-6 py-24 text-white lg:py-32"
        >
            <div className="mx-auto max-w-6xl">
                <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
                    <div>
                        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.25em] text-white/45">
                            {t('howItWorks.eyebrow')}
                        </p>

                        <h2 className="max-w-md font-serif text-4xl font-light leading-tight tracking-tight sm:text-5xl">
                            {t('howItWorks.title')}
                        </h2>

                        <p className="mt-6 max-w-md text-sm leading-7 text-white/55">
                            {t('howItWorks.description')}
                        </p>
                    </div>

                    <div>
                        {STEPS.map((step, index) => (
                            <div
                                key={step}
                                className="grid grid-cols-[50px_1fr] gap-5 border-b border-white/10 py-7 first:pt-0"
                            >
                                <span className="font-serif text-xl text-[hsl(var(--gold))]">
                                    0{index + 1}
                                </span>

                                <div>
                                    <h3 className="font-serif text-2xl">
                                        {t(`howItWorks.steps.${step}.title`)}
                                    </h3>

                                    <p className="mt-2 max-w-lg text-sm leading-6 text-white/50">
                                        {t(`howItWorks.steps.${step}.description`)}
                                    </p>
                                </div>
                            </div>
                        ))}

                        <Link
                            href="/demo"
                            className="group mt-8 inline-flex items-center gap-2 text-sm font-medium"
                        >
                            {t('howItWorks.cta')}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}