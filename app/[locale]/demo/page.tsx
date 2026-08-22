import {notFound} from 'next/navigation'
import {getTranslations} from 'next-intl/server'
import {Camera, Heart, Image as ImageIcon} from 'lucide-react'
import {BottomNav} from '@/components/bottom-nav'
import {getGuests, getTables, getVenueElements} from '@/actions/seating'
import {HomeSearch} from '@/components/home-search'
import {getWeddingBySlug} from '@/actions/wedding'
import {Link} from '@/lib/navigation'

const DEMO_WEDDING_SLUG = 'sara-drilon'
const DEMO_NAV_SLUG = 'demo'

export default async function DemoHomePage() {
    const t = await getTranslations('wedding')

    const wedding = await getWeddingBySlug(DEMO_WEDDING_SLUG)

    if (!wedding) notFound()

    const settings = wedding.wedding_settings
    const weddingId = wedding.id

    const [guests, tables, venueElements] = await Promise.all([
        getGuests(weddingId),
        getTables(weddingId),
        getVenueElements(weddingId)
    ])

    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[hsl(var(--blush))] opacity-20 blur-3xl"
                />
                <div
                    className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-[hsl(var(--gold))] opacity-10 blur-3xl"
                />
            </div>

            <div className="flex items-center gap-3 mb-8">
                <div className="h-px w-16 bg-[hsl(var(--gold))] opacity-60" />
                <Heart className="w-3 h-3 text-[hsl(var(--primary))] fill-current" />
                <div className="h-px w-16 bg-[hsl(var(--gold))] opacity-60" />
            </div>

            <div className="text-center max-w-sm mx-auto relative z-10 w-full">
                <p className="font-sans text-xs tracking-[0.3em] uppercase text-muted-foreground mb-4">
                    {t('home.invitation')}
                </p>

                <h1 className="font-serif text-5xl font-light text-foreground leading-tight mb-2">
                    {wedding.bride_name}

                    <span className="block font-serif italic text-[hsl(var(--primary))] text-3xl my-1">
                        &amp;
                    </span>

                    {wedding.groom_name}
                </h1>

                {wedding.wedding_date && (
                    <p className="font-serif italic text-lg text-muted-foreground mb-8">
                        {new Date(wedding.wedding_date).toLocaleDateString('sq-AL', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })}
                    </p>
                )}

                {settings?.enable_find_seat && (
                    <HomeSearch
                        guests={guests}
                        tables={tables}
                        venueElements={venueElements}
                    />
                )}

                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-10" />

                {settings?.enable_photo_upload && (
                    <>
                        <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-10">
                            {t('home.photoDescription')}
                        </p>

                        <Link
                            href={`/${DEMO_NAV_SLUG}/upload`}
                            className="btn-primary w-full justify-center mb-4 py-4 rounded-xl shadow-lg"
                        >
                            <Camera className="w-5 h-5" />
                            {t('home.sharePhoto')}
                        </Link>

                        <div className="grid grid-cols-3 gap-4 mt-12 text-center">
                            {[
                                {
                                    icon: Camera,
                                    label: t('home.features.takePhoto')
                                },
                                {
                                    icon: ImageIcon,
                                    label: t('home.features.gallery')
                                },
                                {
                                    icon: Heart,
                                    label: t('home.features.message')
                                },
                            ].map(({icon: Icon, label}) => (
                                <div
                                    key={label}
                                    className="flex flex-col items-center gap-2"
                                >
                                    <div
                                        className="w-12 h-12 rounded-2xl bg-[hsl(var(--accent))] flex items-center justify-center transition-transform hover:scale-105"
                                    >
                                        <Icon className="w-5 h-5 text-[hsl(var(--primary))]" />
                                    </div>

                                    <p className="font-sans text-[10px] uppercase tracking-wider text-muted-foreground leading-tight px-1">
                                        {label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="flex items-center gap-3 mt-12 pb-20">
                <div className="h-px w-16 bg-[hsl(var(--gold))] opacity-60" />
                <Heart className="w-3 h-3 text-[hsl(var(--primary))] fill-current" />
                <div className="h-px w-16 bg-[hsl(var(--gold))] opacity-60" />
            </div>

            <BottomNav
                slug={DEMO_NAV_SLUG}
                enableFindSeat={settings?.enable_find_seat ?? true}
                enablePhotoUpload={settings?.enable_photo_upload ?? true}
            />
        </main>
    )
}