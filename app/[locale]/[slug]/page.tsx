import {Link} from '@/lib/navigation'
import {notFound} from 'next/navigation'
import {Camera, Heart, Image as ImageIcon} from 'lucide-react'
import {BottomNav} from "@/components/bottom-nav";
import {getGuests, getTables, getVenueElements} from '@/actions/seating';
import {HomeSearch} from '@/components/home-search';
import {getWeddingBySlug} from '@/actions/wedding';
import {getTranslations} from 'next-intl/server';

type Props = { params: Promise<{ locale: string; slug: string }> }

export default async function HomePage({params}: Props) {
    const {locale, slug} = await params
    const wedding = await getWeddingBySlug(slug);

    if (!wedding) notFound()

    const t = await getTranslations('wedding');

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
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[hsl(var(--blush))] opacity-20 blur-3xl"/>
                <div
                    className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-[hsl(var(--gold))] opacity-10 blur-3xl"/>
            </div>

            <div className="flex items-center gap-3 mb-8">
                <div className="h-px w-16 bg-[hsl(var(--gold))] opacity-60"/>
                <Heart className="w-3 h-3 text-[hsl(var(--primary))] fill-current"/>
                <div className="h-px w-16 bg-[hsl(var(--gold))] opacity-60"/>
            </div>

            <div className="text-center max-w-sm mx-auto relative z-10 w-full">
                <p className="font-sans text-xs tracking-[0.3em] uppercase text-muted-foreground mb-4">
                    {t('welcome')}
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
                        {new Intl.DateTimeFormat(locale, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        }).format(new Date(wedding.wedding_date))}
                    </p>
                )}

                {settings?.enable_find_seat && (
                    <HomeSearch guests={guests} tables={tables} venueElements={venueElements}/>
                )}

                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-10"/>

                {settings?.enable_photo_upload && (
                    <>
                        <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-10">
                            {t('photoDescription')}
                        </p>

                        <Link href={`/${slug}/upload`}
                              className="btn-primary w-full justify-center mb-4 py-4 rounded-xl shadow-lg">
                            <Camera className="w-5 h-5"/>
                            {t('sharePhoto')}
                        </Link>

                        <div className="grid grid-cols-3 gap-4 mt-12 text-center">
                            {[
                                {icon: Camera, label: t('takePhoto')},
                                {icon: ImageIcon, label: t('uploadFromGallery')},
                                {icon: Heart, label: t('addMessage')},
                            ].map(({icon: Icon, label}) => (
                                <div key={label} className="flex flex-col items-center gap-2">
                                    <div
                                        className="w-12 h-12 rounded-2xl bg-[hsl(var(--accent))] flex items-center justify-center transition-transform hover:scale-105">
                                        <Icon className="w-5 h-5 text-[hsl(var(--primary))]"/>
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
                <div className="h-px w-16 bg-[hsl(var(--gold))] opacity-60"/>
                <Heart className="w-3 h-3 text-[hsl(var(--primary))] fill-current"/>
                <div className="h-px w-16 bg-[hsl(var(--gold))] opacity-60"/>
            </div>

            <BottomNav
                slug={slug}
                enableFindSeat={settings?.enable_find_seat}
                enablePhotoUpload={settings?.enable_photo_upload}
            />
        </main>
    )
}