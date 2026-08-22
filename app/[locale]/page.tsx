import Link from 'next/link'
import {
    ArrowRight,
    Camera,
    Heart,
    Mail,
    MapPin,
    Palette,
    Phone,
    Users,
} from 'lucide-react'
import {getTranslations} from 'next-intl/server'

import {PricingSection} from '@/components/pricing-section'

const FEATURES = [
    {
        id: 'guests',
        icon: Users,
    },
    {
        id: 'seat',
        icon: MapPin,
    },
    {
        id: 'photos',
        icon: Camera,
    },
    {
        id: 'theme',
        icon: Palette,
    },
] as const

export default async function PortfolioLandingPage() {
    const t = await getTranslations('landing')

    return (
        <main className="min-h-screen bg-background flex flex-col items-center px-6 py-16 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none">
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[hsl(var(--blush))] opacity-20 blur-3xl"
                />

                <div
                    className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-[hsl(var(--gold))] opacity-10 blur-3xl"
                />
            </div>

            {/* Hero */}
            <div className="relative z-10 w-full max-w-2xl text-center">
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="h-px w-16 bg-[hsl(var(--gold))] opacity-60" />

                    <Heart
                        className="w-4 h-4 text-[hsl(var(--primary))]"
                        fill="currentColor"
                    />

                    <div className="h-px w-16 bg-[hsl(var(--gold))] opacity-60" />
                </div>

                <p className="font-sans text-xs tracking-[0.3em] uppercase text-muted-foreground mb-4">
                    {t('eyebrow')}
                </p>

                <h1 className="font-serif text-5xl sm:text-6xl font-light text-foreground leading-tight mb-6">
                    Wedora
                </h1>

                <p className="font-sans text-base text-muted-foreground leading-relaxed max-w-md mx-auto mb-10">
                    {t('hero.description')}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                        href="/demo"
                        className="btn-primary py-4 px-8 rounded-2xl shadow-lg w-full sm:w-auto justify-center"
                    >
                        {t('hero.demoButton')}

                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* Divider */}
            <div className="h-px w-full max-w-2xl bg-gradient-to-r from-transparent via-border to-transparent my-16" />

            {/* Features */}
            <div className="relative z-10 w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-6">
                {FEATURES.map(({id, icon: Icon}) => (
                    <div
                        key={id}
                        className="card-wedding p-6 text-left"
                    >
                        <div
                            className="w-11 h-11 rounded-xl bg-[hsl(var(--accent))] flex items-center justify-center mb-4"
                        >
                            <Icon
                                className="w-5 h-5 text-[hsl(var(--primary))]"
                                strokeWidth={1.5}
                            />
                        </div>

                        <h3 className="font-serif text-lg text-foreground mb-1.5">
                            {t(`features.${id}.title`)}
                        </h3>

                        <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                            {t(`features.${id}.description`)}
                        </p>
                    </div>
                ))}
            </div>

            {/* Divider */}
            <div className="h-px w-full max-w-2xl bg-gradient-to-r from-transparent via-border to-transparent my-16" />

            {/* Pricing */}
            <PricingSection />

            {/* Divider */}
            <div className="h-px w-full max-w-2xl bg-gradient-to-r from-transparent via-border to-transparent my-16" />

            {/* Contact */}
            <div
                id="contact"
                className="relative z-10 w-full max-w-md text-center"
            >
                <p className="font-sans text-xs tracking-[0.3em] uppercase text-muted-foreground mb-3">
                    {t('contact.eyebrow')}
                </p>

                <h2 className="font-serif text-2xl font-light text-foreground mb-6">
                    {t('contact.title')}
                </h2>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                        href="mailto:contact@wedora.com"
                        className="btn-ghost py-3 px-6 rounded-2xl w-full sm:w-auto justify-center"
                    >
                        <Mail className="w-4 h-4" />
                        contact@wedora.com
                    </a>

                    <a
                        href="tel:+38970602153"
                        className="btn-ghost py-3 px-6 rounded-2xl w-full sm:w-auto justify-center"
                    >
                        <Phone className="w-4 h-4" />
                        +389 70 602 153
                    </a>
                </div>
            </div>

            {/* Footer decoration */}
            <div className="flex items-center gap-3 mt-16">
                <div className="h-px w-16 bg-[hsl(var(--gold))] opacity-60" />

                <Heart
                    className="w-3 h-3 text-[hsl(var(--primary))]"
                    fill="currentColor"
                />

                <div className="h-px w-16 bg-[hsl(var(--gold))] opacity-60" />
            </div>

            <p className="font-sans text-xs text-muted-foreground mt-6">
                {t('footer')}
            </p>
        </main>
    )
}