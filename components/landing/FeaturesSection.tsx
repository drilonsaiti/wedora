import {Camera, LayoutGrid, MapPin, Palette} from 'lucide-react'
import {getTranslations} from 'next-intl/server'
import {SectionHeading} from "@/components/ui/SectionHeading";

const BENEFITS = [
    {
        id: 'seat',
        icon: MapPin,
        className: 'lg:col-span-7',
    },
    {
        id: 'guests',
        icon: LayoutGrid,
        className: 'lg:col-span-5',
    },
    {
        id: 'photos',
        icon: Camera,
        className: 'lg:col-span-5',
    },
    {
        id: 'theme',
        icon: Palette,
        className: 'lg:col-span-7',
    },
] as const

function FeatureDecoration({type}: { type: string }) {
    if (type === 'seat') {
        return (
            <div
                className="absolute bottom-[-45px] right-[-15px] w-[55%] min-w-[260px] rounded-[1.7rem] border border-border/70 bg-background p-4 shadow-xl transition-transform duration-500 group-hover:-translate-y-2">
                <p className="mb-3 text-[9px] uppercase tracking-widest text-muted-foreground">
                    Find your seat
                </p>

                <div className="rounded-xl border border-border bg-card px-3 py-3">
                    <p className="text-[10px] text-muted-foreground">
                        Emma Wilson
                    </p>

                    <div className="mt-3 flex items-end justify-between">
                        <div>
                            <p className="text-[8px] uppercase tracking-widest text-muted-foreground">
                                Your table
                            </p>

                            <p className="mt-0.5 font-serif text-2xl">
                                Table 02
                            </p>
                        </div>

                        <MapPin className="h-4 w-4 text-[hsl(var(--primary))]"/>
                    </div>
                </div>
            </div>
        )
    }

    if (type === 'guests') {
        return (
            <div
                className="absolute bottom-[-25px] right-[-20px] grid w-[55%] grid-cols-2 gap-2 rotate-[-4deg] opacity-90">
                {[1, 2, 3, 4].map((item) => (
                    <div
                        key={item}
                        className="aspect-square rounded-full border border-border bg-background shadow-sm"
                    />
                ))}
            </div>
        )
    }

    if (type === 'photos') {
        return (
            <div className="absolute -bottom-10 -right-6 grid w-[58%] rotate-3 grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((item) => (
                    <div
                        key={item}
                        className={`aspect-[4/5] rounded-xl ${
                            item % 2
                                ? 'bg-gradient-to-br from-[hsl(var(--blush))] to-[hsl(var(--secondary))]'
                                : 'bg-gradient-to-br from-[hsl(var(--gold))]/30 to-[hsl(var(--accent))]'
                        }`}
                    />
                ))}
            </div>
        )
    }

    return (
        <div
            className="absolute bottom-[-50px] right-[-20px] h-[220px] w-[220px] rounded-full border-[35px] border-[hsl(var(--accent))] opacity-80 transition-transform duration-500 group-hover:scale-110"/>
    )
}

export async function FeaturesSection() {
    const t = await getTranslations('landing')

    return (
        <section id="features" className="px-6 py-24 lg:py-32">
            <div className="mx-auto max-w-7xl">
                <SectionHeading
                    eyebrow={t('features.eyebrow')}
                    title={t('features.title')}
                    description={t('features.description')}
                />

                <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-12">
                    {BENEFITS.map(({id, icon: Icon, className}) => (
                        <article
                            key={id}
                            className={`group relative min-h-[340px] overflow-hidden rounded-[2rem] border border-border/70 bg-card p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl md:p-9 ${className}`}
                        >
                            <div className="relative z-10 max-w-md">
                                <div
                                    className="mb-7 flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                                    <Icon
                                        className="h-5 w-5 text-[hsl(var(--primary))]"
                                        strokeWidth={1.5}
                                    />
                                </div>

                                <h3 className="font-serif text-2xl font-light md:text-3xl">
                                    {t(`features.items.${id}.title`)}
                                </h3>

                                <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                                    {t(`features.items.${id}.description`)}
                                </p>
                            </div>

                            <FeatureDecoration type={id}/>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}