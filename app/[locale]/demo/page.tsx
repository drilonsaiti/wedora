import {notFound} from 'next/navigation'
import {Camera, Heart, Image as ImageIcon, MapPin, Sparkles,} from 'lucide-react'
import {getLocale, getTranslations,} from 'next-intl/server'

import {BottomNav} from '@/components/bottom-nav'
import {HomeSearch} from '@/components/home-search'
import {getGuests, getTables, getVenueElements,} from '@/actions/seating'
import {getWeddingBySlug} from '@/actions/wedding'
import {Link} from '@/lib/navigation'

const DEMO_WEDDING_SLUG = 'sara-drilon'
const DEMO_NAV_SLUG = 'demo'

export default async function DemoHomePage() {
    const t = await getTranslations('wedding')
    const locale = await getLocale()

    const wedding =
        await getWeddingBySlug(DEMO_WEDDING_SLUG)

    if (!wedding) {
        notFound()
    }

    const settings =
        wedding.wedding_settings

    const weddingId =
        wedding.id

    const [
        guests,
        tables,
        venueElements,
    ] = await Promise.all([
        getGuests(weddingId),
        getTables(weddingId),
        getVenueElements(weddingId),
    ])

    const formattedDate =
        wedding.wedding_date
            ? new Intl.DateTimeFormat(locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }).format(
                new Date(
                    wedding.wedding_date
                )
            )
            : null

    return (
        <main className="relative min-h-screen overflow-hidden bg-background px-6 pb-32 pt-10">
            {/* Ambient background */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
            >
                <div
                    className="absolute left-1/2 top-[-220px] h-[600px] w-[760px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/30 blur-[140px]"/>

                <div
                    className="absolute bottom-[-220px] right-[-180px] h-[440px] w-[440px] rounded-full bg-[hsl(var(--gold))]/8 blur-[130px]"/>
            </div>

            <div className="relative z-10 mx-auto w-full max-w-xl">
                {/* Wedora brand */}
                <div className="mb-14 flex justify-center">
                    <div className="inline-flex items-center gap-2.5">
                        <div
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white shadow-sm">
                            <Heart
                                className="h-3.5 w-3.5"
                                fill="currentColor"
                            />
                        </div>

                        <span className="font-serif text-xl tracking-tight text-foreground">
                            Wedora
                        </span>
                    </div>
                </div>

                {/* Wedding introduction */}
                <section className="text-center">
                    <div
                        className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3.5 py-2 shadow-sm backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--gold))]"/>

                        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                            {t(
                                'home.invitation'
                            )}
                        </span>
                    </div>

                    <h1 className="font-serif text-[3.25rem] font-light leading-[0.98] tracking-[-0.035em] text-foreground sm:text-6xl">
                        {wedding.bride_name}

                        <span className="my-2 block text-2xl font-light text-[hsl(var(--primary))] sm:text-3xl">
                            &amp;
                        </span>

                        {wedding.groom_name}
                    </h1>

                    {formattedDate && (
                        <p className="mt-6 text-sm font-medium tracking-[0.05em] text-muted-foreground">
                            {formattedDate}
                        </p>
                    )}
                </section>

                {/* Main experience */}
                <div className="mt-12 space-y-6">
                    {settings?.enable_find_seat && (
                        <section
                            className="rounded-[2rem] border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur sm:p-7">
                            <div className="mb-5 flex items-center gap-3">
                                <div
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                                    <MapPin
                                        className="h-4 w-4 text-[hsl(var(--primary))]"
                                        strokeWidth={
                                            1.6
                                        }
                                    />
                                </div>

                                <div>
                                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                        {t(
                                            'home.findSeatEyebrow'
                                        )}
                                    </p>

                                    <h2 className="mt-0.5 font-serif text-xl font-light text-foreground">
                                        {t(
                                            'home.findSeatTitle'
                                        )}
                                    </h2>
                                </div>
                            </div>

                            <HomeSearch
                                guests={
                                    guests
                                }
                                tables={
                                    tables
                                }
                                venueElements={
                                    venueElements
                                }
                            />
                        </section>
                    )}

                    {settings?.enable_photo_upload && (
                        <section
                            className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/85 shadow-sm backdrop-blur">
                            <div className="p-6 sm:p-7">
                                <div
                                    className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                                    <Camera
                                        className="h-5 w-5 text-[hsl(var(--primary))]"
                                        strokeWidth={
                                            1.6
                                        }
                                    />
                                </div>

                                <h2 className="font-serif text-2xl font-light tracking-tight text-foreground">
                                    {t(
                                        'home.photoTitle'
                                    )}
                                </h2>

                                <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                                    {t(
                                        'home.photoDescription'
                                    )}
                                </p>

                                <Link
                                    href={`/${DEMO_NAV_SLUG}/upload`}
                                    className="btn-primary mt-6 w-full justify-center"
                                >
                                    <Camera className="h-4 w-4"/>

                                    {t(
                                        'home.sharePhoto'
                                    )}
                                </Link>
                            </div>

                            {/* Feature summary */}
                            <div className="grid grid-cols-3 border-t border-border/60 bg-secondary/30">
                                <ExperienceFeature
                                    icon={
                                        Camera
                                    }
                                    label={t(
                                        'home.features.takePhoto'
                                    )}
                                />

                                <ExperienceFeature
                                    icon={
                                        ImageIcon
                                    }
                                    label={t(
                                        'home.features.gallery'
                                    )}
                                />

                                <ExperienceFeature
                                    icon={
                                        Heart
                                    }
                                    label={t(
                                        'home.features.message'
                                    )}
                                />
                            </div>
                        </section>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-12 text-center">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                        Made with Wedora
                    </p>
                </div>
            </div>

            <BottomNav
                slug={DEMO_NAV_SLUG}
                enableFindSeat={
                    settings?.enable_find_seat ??
                    true
                }
                enablePhotoUpload={
                    settings?.enable_photo_upload ??
                    true
                }
            />
        </main>
    )
}

function ExperienceFeature({
                               icon: Icon,
                               label,
                           }: {
    icon: typeof Camera
    label: string
}) {
    return (
        <div
            className="flex min-h-[92px] flex-col items-center justify-center gap-2 border-r border-border/50 px-2 text-center last:border-r-0">
            <Icon
                className="h-4 w-4 text-[hsl(var(--primary))]"
                strokeWidth={1.5}
            />

            <p className="max-w-[90px] text-[9px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground">
                {label}
            </p>
        </div>
    )
}