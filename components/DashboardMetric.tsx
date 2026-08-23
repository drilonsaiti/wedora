import { Camera, Heart, Images, LayoutGrid, MapPin, Users } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

function DashboardMetric({ value, label }: { value: string; label: string }) {
    return (
        <div className="rounded-xl border border-border/50 bg-card p-3.5">
            <p className="font-serif text-xl">{value}</p>

            <p className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                {label}
            </p>
        </div>
    )
}

export async function DashboardPreview() {
    const t = await getTranslations('landing')

    return (
        <div className="relative mx-auto w-full max-w-[700px]">
            <div
                aria-hidden
                className="absolute -inset-10 rounded-full bg-[hsl(var(--primary))]/10 blur-3xl"
            />

            <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card p-2 shadow-[0_35px_100px_-35px_rgba(39,28,24,0.35)]">
                {/* Browser header */}
                <div className="flex h-12 items-center justify-between border-b border-border/60 px-4">
                    <div className="flex gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-border" />
                        <span className="h-2.5 w-2.5 rounded-full bg-border" />
                        <span className="h-2.5 w-2.5 rounded-full bg-border" />
                    </div>

                    <div className="rounded-full bg-secondary px-4 py-1.5 text-[10px] text-muted-foreground">
                        wedora.app
                    </div>

                    <div className="w-10" />
                </div>

                {/* Dashboard */}
                <div className="grid min-h-[460px] grid-cols-[72px_1fr] bg-[hsl(var(--cream))]">
                    {/* Sidebar */}
                    <div className="border-r border-border/50 bg-card px-3 py-5">
                        <div className="mb-7 flex justify-center">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-white">
                                <Heart className="h-4 w-4" fill="currentColor" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            {[Users, MapPin, Camera, Images].map((Icon, index) => (
                                <div
                                    key={index}
                                    className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl ${
                                        index === 1
                                            ? 'bg-[hsl(var(--accent))] text-[hsl(var(--primary))]'
                                            : 'text-muted-foreground'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="relative p-5 sm:p-7">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                    {t('preview.event')}
                                </p>

                                <h3 className="mt-1 font-serif text-2xl">
                                    Sofia & James
                                </h3>
                            </div>

                            <div className="hidden rounded-full border border-border bg-card px-3 py-1.5 text-[10px] text-muted-foreground sm:block">
                                21 September
                            </div>
                        </div>

                        <div className="mb-5 grid grid-cols-3 gap-3">
                            <DashboardMetric value="128" label={t('preview.guests')} />
                            <DashboardMetric value="14" label={t('preview.tables')} />
                            <DashboardMetric value="347" label={t('preview.photos')} />
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium">
                                        {t('preview.seatingTitle')}
                                    </p>

                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                        {t('preview.seatingDescription')}
                                    </p>
                                </div>

                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--accent))]">
                                    <LayoutGrid className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {['01', '02', '03', '04', '05', '06'].map((table, index) => (
                                    <div
                                        key={table}
                                        className={`relative flex aspect-[1.35] flex-col items-center justify-center rounded-xl border text-center ${
                                            index === 1
                                                ? 'border-[hsl(var(--primary))]/30 bg-[hsl(var(--accent))]'
                                                : 'border-border/60 bg-background'
                                        }`}
                                    >
                                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                                            Table
                                        </span>

                                        <span className="mt-0.5 font-serif text-lg">
                                            {table}
                                        </span>

                                        <div className="mt-2 flex -space-x-1">
                                            {[1, 2, 3].map((guest) => (
                                                <div
                                                    key={guest}
                                                    className="h-4 w-4 rounded-full border-2 border-card bg-secondary"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/*
                          Mobile guest card — this must always render as a dark,
                          near-black surface regardless of the site's light/dark
                          theme (it's meant to look like a phone screen inset into
                          the mockup). Uses --ink instead of --dark, since --dark
                          flips to a light value in .dark mode.
                        */}
                        <div className="absolute -bottom-7 -right-3 w-[185px] rounded-[1.7rem] border border-border/70 bg-card p-3 shadow-2xl sm:-right-7 sm:w-[205px]">
                            <div className="rounded-[1.25rem] bg-[hsl(var(--ink))] px-4 py-5 text-white">
                                <div className="mb-8 flex items-center justify-between">
                                    <Heart
                                        className="h-3.5 w-3.5 text-[hsl(var(--blush))]"
                                        fill="currentColor"
                                    />

                                    <span className="text-[8px] uppercase tracking-[0.18em] text-white/50">
                                        Wedora
                                    </span>
                                </div>

                                <p className="text-[9px] uppercase tracking-[0.15em] text-white/45">
                                    {t('preview.findSeat')}
                                </p>

                                <p className="mt-2 font-serif text-xl">
                                    Welcome, Emma
                                </p>

                                <div className="mt-5 rounded-xl bg-white/10 p-3">
                                    <p className="text-[8px] uppercase tracking-widest text-white/45">
                                        {t('preview.yourTable')}
                                    </p>

                                    <p className="mt-1 font-serif text-2xl">
                                        Table 02
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}