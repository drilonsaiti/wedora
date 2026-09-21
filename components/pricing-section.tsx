import {Check, X} from 'lucide-react'
import Link from 'next/link'
import {getTranslations} from 'next-intl/server'

import {cn} from '@/lib/utils'

interface PricingPlan {
    id: 'basic' | 'standard' | 'premium'
    price: string
    featured?: boolean
}

const PLANS: PricingPlan[] = [
    {
        id: 'basic',
        price: '€39',
    },
    {
        id: 'standard',
        price: '€69',
        featured: true,
    },
    {
        id: 'premium',
        price: '€99',
    },
]

const FEATURES = [
    'findSeat',
    'tableArrangement',
    'photoUpload',
    'guestLimit',
    'storage',
    'publicGallery',
] as const

const INCLUDED: Record<
    PricingPlan['id'],
    Record<(typeof FEATURES)[number], boolean>
> = {
    basic: {
        findSeat: true,
        tableArrangement: true,
        photoUpload: false,
        guestLimit: true,
        storage: true,
        publicGallery: false,
    },
    standard: {
        findSeat: true,
        tableArrangement: true,
        photoUpload: true,
        guestLimit: true,
        storage: true,
        publicGallery: true,
    },
    premium: {
        findSeat: true,
        tableArrangement: true,
        photoUpload: true,
        guestLimit: true,
        storage: true,
        publicGallery: true,
    },
}

export async function PricingSection() {
    const t = await getTranslations('pricing')

    return (
        <div className="mx-auto w-full max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
                <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.25em] text-[hsl(var(--primary))]">
                    {t('eyebrow')}
                </p>

                <h2 className="font-serif text-4xl font-light tracking-tight sm:text-5xl">
                    {t('title')}
                </h2>

                <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
                    {t('description')}
                </p>
            </div>

            <div className="mt-14 grid gap-5 lg:grid-cols-3">
                {PLANS.map((plan) => (
                    <article
                        key={plan.id}
                        className={cn(
                            'relative flex min-h-[560px] flex-col rounded-[2rem] border bg-card p-7 transition duration-300 md:p-8',
                            plan.featured
                                ? 'border-[hsl(var(--primary))]/45 shadow-[0_25px_70px_-35px_rgba(130,60,78,0.45)] lg:-translate-y-3'
                                : 'border-border/70 shadow-sm hover:-translate-y-1 hover:shadow-lg'
                        )}
                    >
                        {plan.featured && (
                            <span
                                className="absolute right-6 top-6 rounded-full bg-[hsl(var(--accent))] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">
                                {t('mostPopular')}
                            </span>
                        )}

                        <div>
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                {t(`plans.${plan.id}.eyebrow`)}
                            </p>

                            <h3 className="mt-3 font-serif text-3xl font-light">
                                {t(`plans.${plan.id}.name`)}
                            </h3>

                            <p className="mt-3 min-h-[48px] max-w-xs text-sm leading-6 text-muted-foreground">
                                {t(`plans.${plan.id}.description`)}
                            </p>
                        </div>

                        <div className="my-8 border-y border-border/70 py-6">
                            <div className="flex items-end gap-2">
                                <span className="font-serif text-5xl font-light tracking-tight">
                                    {plan.price}
                                </span>

                                <span className="pb-1.5 text-xs text-muted-foreground">
                                    {t('perWedding')}
                                </span>
                            </div>
                        </div>

                        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {t('included')}
                        </p>

                        <ul className="mb-8 space-y-3.5">
                            {FEATURES.map((feature) => {
                                const included =
                                    INCLUDED[plan.id][feature]

                                return (
                                    <li
                                        key={feature}
                                        className="flex items-start gap-3"
                                    >
                                        <span
                                            className={cn(
                                                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                                                included
                                                    ? 'bg-[hsl(var(--accent))] text-[hsl(var(--primary))]'
                                                    : 'bg-muted text-muted-foreground/40'
                                            )}
                                        >
                                            {included ? (
                                                <Check className="h-3 w-3"/>
                                            ) : (
                                                <X className="h-3 w-3"/>
                                            )}
                                        </span>

                                        <span
                                            className={cn(
                                                'text-sm leading-5',
                                                !included &&
                                                'text-muted-foreground/40'
                                            )}
                                        >
                                            {t(
                                                `features.${plan.id}.${feature}`
                                            )}
                                        </span>
                                    </li>
                                )
                            })}
                        </ul>

                        <Link
                            href="#contact"
                            className={cn(
                                'mt-auto flex w-full items-center justify-center rounded-full px-6 py-3.5 text-sm font-medium transition',
                                plan.featured
                                    ? 'bg-[hsl(var(--primary))] text-white hover:opacity-90'
                                    : 'border border-border bg-background hover:bg-secondary'
                            )}
                        >
                            {t('choosePlan', {
                                plan: t(`plans.${plan.id}.name`),
                            })}
                        </Link>
                    </article>
                ))}
            </div>

            <p className="mt-8 text-center text-xs text-muted-foreground">
                {t('customPlan.text')}{' '}
                <a
                    href="mailto:contact@wedora.com"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                    {t('customPlan.contact')}
                </a>{' '}
                {t('customPlan.suffix')}
            </p>
        </div>
    )
}