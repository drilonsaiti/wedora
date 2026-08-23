export function SectionHeading({
                                   eyebrow,
                                   title,
                                   description,
                                   centered = false,
                               }: {
    eyebrow: string
    title: string
    description: string
    centered?: boolean
}) {
    return (
        <div
            className={
                centered
                    ? 'mx-auto max-w-2xl text-center'
                    : 'max-w-2xl'
            }
        >
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.25em] text-[hsl(var(--primary))]">
                {eyebrow}
            </p>

            <h2 className="font-serif text-4xl font-light leading-tight tracking-tight sm:text-5xl">
                {title}
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
                {description}
            </p>
        </div>
    )
}