import { getTranslations } from 'next-intl/server'

export async function ValueSection() {
    const t = await getTranslations('landing')

    return (
        <section className="border-y border-border/60 bg-card/50 px-6 py-10">
            <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-5 text-center md:flex-row md:text-left">
                <p className="font-serif text-2xl font-light md:text-3xl">
                    {t('value.title')}
                </p>

                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                    {t('value.description')}
                </p>
            </div>
        </section>
    )
}