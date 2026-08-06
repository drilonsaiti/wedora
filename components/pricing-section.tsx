import { Check, X } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface PricingPlan {
    name: string
    price: string
    period: string
    description: string
    featured?: boolean
    features: { label: string; included: boolean }[]
}

const PLANS: PricingPlan[] = [
    {
        name: 'Bazë',
        price: '€19',
        period: 'për dasmë',
        description: 'Për dasma të vogla, vetëm gjetja e vendit',
        features: [
            { label: 'Gjej Vendin Tim', included: true },
            { label: 'Sistemimi i tavolinave', included: true },
            { label: 'Ngarko Foto', included: false },
            { label: 'Deri 150 të ftuar', included: true },
            { label: 'Ruajtje 30 ditë pas dasmës', included: true },
        ],
    },
    {
        name: 'Standard',
        price: '€39',
        period: 'për dasmë',
        description: 'Kombinimi më i kërkuar — vend + foto',
        featured: true,
        features: [
            { label: 'Gjej Vendin Tim', included: true },
            { label: 'Sistemimi i tavolinave', included: true },
            { label: 'Ngarko Foto — deri 300 foto', included: true },
            { label: 'Deri 300 të ftuar', included: true },
            { label: 'Ruajtje 90 ditë pas dasmës', included: true },
            { label: 'Galeri e ndashme (link publik)', included: true },
        ],
    },
    {
        name: 'Premium',
        price: '€69',
        period: 'për dasmë',
        description: 'Pa limite, për dasma të mëdha',
        features: [
            { label: 'Gjej Vendin Tim', included: true },
            { label: 'Sistemimi i tavolinave', included: true },
            { label: 'Ngarko Foto — pa limit', included: true },
            { label: 'Të ftuar pa limit', included: true },
            { label: 'Ruajtje 1 vit pas dasmës', included: true },
            { label: 'Galeri e ndashme (link publik)', included: true },
            { label: 'Llogari për çiftin (couple login)', included: true },
        ],
    },
]

export function PricingSection() {
    return (
        <div className="relative z-10 w-full max-w-5xl">
            <div className="text-center mb-10">
                <p className="font-sans text-xs tracking-[0.3em] uppercase text-muted-foreground mb-3">
                    Çmimet
                </p>
                <h2 className="font-serif text-3xl font-light text-foreground mb-2">
                    Zgjidhni planin që ju përshtatet
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Pagesë e vetme për dasmën tuaj — jo abonim mujor.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PLANS.map((plan) => (
                    <div
                        key={plan.name}
                        className={cn(
                            'card-wedding p-6 flex flex-col relative',
                            plan.featured && 'border-2 border-[hsl(var(--primary))] shadow-lg md:-translate-y-2'
                        )}
                    >
                        {plan.featured && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[hsl(var(--primary))] text-white text-[10px] uppercase tracking-widest font-medium px-3 py-1 rounded-full">
                Më i kërkuari
              </span>
                        )}

                        <h3 className="font-serif text-xl text-foreground mb-1">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>

                        <div className="mb-6">
                            <span className="font-serif text-4xl text-foreground">{plan.price}</span>
                            <span className="text-xs text-muted-foreground ml-1">{plan.period}</span>
                        </div>

                        <ul className="space-y-2.5 mb-6 flex-1">
                            {plan.features.map((f) => (
                                <li key={f.label} className="flex items-start gap-2 text-sm">
                                    {f.included ? (
                                        <Check className="w-4 h-4 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                                    ) : (
                                        <X className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                                    )}
                                    <span className={cn(!f.included && 'text-muted-foreground/50 line-through')}>
                    {f.label}
                  </span>
                                </li>
                            ))}
                        </ul>

                        <Link
                            href="#contact"
                            className={cn(
                                'w-full py-3 rounded-xl text-center text-sm font-medium tracking-wide transition-all',
                                plan.featured ? 'btn-primary justify-center' : 'btn-ghost justify-center'
                            )}
                        >
                            Zgjidh {plan.name}
                        </Link>
                    </div>
                ))}
            </div>

            <p className="text-center text-xs text-muted-foreground mt-8">
                Nuk gjetët çfarë kërkuat? <a href="#contact" className="text-[hsl(var(--primary))] hover:underline">Na kontaktoni</a> për plan të personalizuar.
            </p>
        </div>
    )
}