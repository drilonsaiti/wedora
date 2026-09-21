import Link from 'next/link'
import {ArrowRight, Check} from 'lucide-react'
import {getTranslations} from 'next-intl/server'
import {DashboardPreview} from "@/components/landing/DashboardMetric";


export async function HeroSection() {
    const t = await getTranslations('landing')

    const points = [
        t('hero.pointOne'),
        t('hero.pointTwo'),
        t('hero.pointThree'),
    ]

    return (
        <section className="relative px-6 pb-24 pt-40 lg:pb-32 lg:pt-48">
            <div
                aria-hidden
                className="absolute left-1/2 top-20 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/35 blur-[140px]"
            />

            <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[0.9fr_1.1fr]">
                {/* HERO COPY */}
                <div className="max-w-xl">
                    <div
                        className="mb-6 inline-flex items-center rounded-full border border-border/70 bg-card/70 px-3.5 py-2 backdrop-blur">
    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {t('hero.eyebrow')}
    </span>
                    </div>

                    <h1 className="max-w-2xl font-serif text-[3.45rem] font-light leading-[0.97] tracking-[-0.035em] sm:text-6xl lg:text-[5.1rem]">
                        {t('hero.title')}
                    </h1>

                    <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
                        {t('hero.description')}
                    </p>

                    <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                        <Link href="/demo" className="btn-primary group">
                            {t('hero.primaryCta')}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                        </Link>

                        <Link href="#how-it-works" className="btn-secondary">
                            {t('hero.secondaryCta')}
                        </Link>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                        {points.map((item) => (
                            <span
                                key={item}
                                className="flex items-center gap-2 text-xs text-muted-foreground"
                            >
                                <Check className="h-3.5 w-3.5 text-[hsl(var(--primary))]"/>
                                {item}
                            </span>
                        ))}
                    </div>
                </div>

                {/* PRODUCT VISUAL */}
                <DashboardPreview/>
            </div>
        </section>
    )
}