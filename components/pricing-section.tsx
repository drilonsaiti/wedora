import { Check, X } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { cn } from '@/lib/utils'

interface PricingPlan {
    id: 'basic' | 'standard' | 'premium'
    price: string
    featured?: boolean
    features: {
        key:
            | 'findSeat'
            | 'tableArrangement'
            | 'photoUpload'
            | 'guestLimit'
            | 'storage'
            | 'publicGallery'
        included: boolean
    }[]
}

const PLANS: PricingPlan[] = [
    {
        id: 'basic',
        price: '€39',
        features: [
            { key: 'findSeat', included: true },
            { key: 'tableArrangement', included: true },
            { key: 'photoUpload', included: false },
            { key: 'guestLimit', included: true },
            { key: 'storage', included: true },
        ],
    },
    {
        id: 'standard',
        price: '€69',
        featured: true,
        features: [
            { key: 'findSeat', included: true },
            { key: 'tableArrangement', included: true },
            { key: 'photoUpload', included: true },
            { key: 'guestLimit', included: true },
            { key: 'storage', included: true },
            { key: 'publicGallery', included: true },
        ],
    },
    {
        id: 'premium',
        price: '€99',
        features: [
            { key: 'findSeat', included: true },
            { key: 'tableArrangement', included: true },
            { key: 'photoUpload', included: true },
            { key: 'guestLimit', included: true },
            { key: 'storage', included: true },
            { key: 'publicGallery', included: true },
        ],
    },
]

export async function PricingSection() {
    const t = await getTranslations('pricing')

    return (
        <div className="relative z-10 w-full max-w-5xl">
            {/* Header */}
            <div className="text-center mb-10">
                <p className="font-sans text-xs tracking-[0.3em] uppercase text-muted-foreground mb-3">
                    {t('eyebrow')}
                </p>

                <h2 className="font-serif text-3xl font-light text-foreground mb-2">
                    {t('title')}
                </h2>

                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {t('description')}
                </p>
            </div>

            {/* Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PLANS.map((plan) => (
                    <div
                        key={plan.id}
                        className={cn(
                            'card-wedding p-6 flex flex-col relative',
                            plan.featured &&
                            'border-2 border-[hsl(var(--primary))] shadow-lg md:-translate-y-2'
                        )}
                    >
                        {/* Featured badge */}
                        {plan.featured && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[hsl(var(--primary))] text-white text-[10px] uppercase tracking-widest font-medium px-3 py-1 rounded-full">
                                {t('mostPopular')}
                            </span>
                        )}

                        {/* Plan name */}
                        <h3 className="font-serif text-xl text-foreground mb-1">
                            {t(`plans.${plan.id}.name`)}
                        </h3>

                        {/* Description */}
                        <p className="text-xs text-muted-foreground mb-4">
                            {t(`plans.${plan.id}.description`)}
                        </p>

                        {/* Price */}
                        <div className="mb-6">
                            <span className="font-serif text-4xl text-foreground">
                                {plan.price}
                            </span>

                            <span className="text-xs text-muted-foreground ml-1">
                                {t('perWedding')}
                            </span>
                        </div>

                        {/* Features */}
                        <ul className="space-y-2.5 mb-6 flex-1">
                            {plan.features.map((feature) => (
                                <li
                                    key={feature.key}
                                    className="flex items-start gap-2 text-sm"
                                >
                                    {feature.included ? (
                                        <Check className="w-4 h-4 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                                    ) : (
                                        <X className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                                    )}

                                    <span
                                        className={cn(
                                            !feature.included &&
                                            'text-muted-foreground/50 line-through'
                                        )}
                                    >
                                        {t(
                                            `features.${plan.id}.${feature.key}`
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        {/* CTA */}
                        <Link
                            href="#contact"
                            className={cn(
                                'w-full py-3 rounded-xl text-center text-sm font-medium tracking-wide transition-all',
                                plan.featured
                                    ? 'btn-primary justify-center'
                                    : 'btn-ghost justify-center'
                            )}
                        >
                            {t('choosePlan', {
                                plan: t(`plans.${plan.id}.name`),
                            })}
                        </Link>
                    </div>
                ))}
            </div>

            {/* Bottom CTA */}
            <p className="text-center text-xs text-muted-foreground mt-8">
                {t('customPlan.text')}{' '}
                <a
                    href="#contact"
                    className="text-[hsl(var(--primary))] hover:underline"
                >
                    {t('customPlan.contact')}
                </a>{' '}
                {t('customPlan.suffix')}
            </p>
        </div>
    )
}