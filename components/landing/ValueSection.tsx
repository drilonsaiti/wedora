import { ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function ValueSection() {
    const t = await getTranslations('landing')

    return (
        <section className="relative overflow-hidden border-y border-border/60 bg-card/55">
            {/* Ambient */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
            >
                <div className="absolute left-1/2 top-[-180px] h-[320px] w-[520px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/18 blur-[110px]" />
            </div>

            <div className="relative mx-auto max-w-7xl px-6 py-14 sm:py-16 lg:px-8">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-center lg:gap-16">
                    {/* Main statement */}
                    <div>
                        <div className="mb-5 flex items-center gap-3">
                            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />

                            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                                Wedora
                            </span>
                        </div>

                        <h2 className="max-w-2xl font-serif text-3xl font-light leading-[1.12] tracking-[-0.025em] text-foreground sm:text-4xl lg:text-[2.75rem]">
                            {t('value.title')}
                        </h2>
                    </div>

                    {/* Supporting copy */}
                    <div className="lg:border-l lg:border-border/60 lg:pl-10">
                        <p className="max-w-lg text-sm leading-7 text-muted-foreground sm:text-[15px]">
                            {t('value.description')}
                        </p>

                        <div className="mt-6 flex items-center gap-2 text-[11px] font-medium text-foreground">
                            <span>
                                Seating
                            </span>

                            <ArrowRight
                                className="h-3 w-3 text-muted-foreground"
                                strokeWidth={1.5}
                            />

                            <span>
                                Guests
                            </span>

                            <ArrowRight
                                className="h-3 w-3 text-muted-foreground"
                                strokeWidth={1.5}
                            />

                            <span>
                                Photos
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}