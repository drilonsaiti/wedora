import {getTranslations} from 'next-intl/server'
import {SectionHeading} from "@/components/ui/SectionHeading";


const FAQ_ITEMS = ['one', 'two', 'three', 'four'] as const

export async function FaqSection() {
    const t = await getTranslations('landing')

    return (
        <section id="faq" className="border-t border-border/60 px-6 py-24">
            <div className="mx-auto max-w-3xl">
                <SectionHeading
                    eyebrow={t('faq.eyebrow')}
                    title={t('faq.title')}
                    description={t('faq.description')}
                    centered
                />

                <div className="mt-12 divide-y divide-border">
                    {FAQ_ITEMS.map((item) => (
                        <details key={item} className="group py-5">
                            <summary
                                className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                                {t(`faq.items.${item}.question`)}

                                <span
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition group-open:rotate-45">
                                    +
                                </span>
                            </summary>

                            <p className="max-w-2xl pb-2 pt-4 text-sm leading-7 text-muted-foreground">
                                {t(`faq.items.${item}.answer`)}
                            </p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    )
}