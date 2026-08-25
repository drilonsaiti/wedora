import { Camera, Heart, Image as ImageIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { getGuests, getTables, getVenueElements } from "@/actions/seating";
import { getWeddingBySlug } from "@/actions/wedding";
import { BottomNav } from "@/components/bottom-nav";
import { HomeSearch } from "@/components/home-search";
import { Link } from "@/lib/navigation";

type Props = {
    params: Promise<{
        locale: string;
        slug: string;
    }>;
};

export default async function HomePage({ params }: Props) {
    const { locale, slug } = await params;

    const wedding = await getWeddingBySlug(slug);

    if (!wedding) {
        notFound();
    }

    const t = await getTranslations("wedding");

    const settings = wedding.wedding_settings;

    const weddingId = wedding.id;

    const [guests, tables, venueElements] = settings?.enable_find_seat
        ? await Promise.all([
            getGuests(weddingId),
            getTables(weddingId),
            getVenueElements(weddingId),
        ])
        : [[], [], []];

    return (
        <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))] opacity-20 blur-3xl" />

                <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-[hsl(var(--gold))] opacity-10 blur-3xl" />
            </div>

            <div className="mb-8 flex items-center gap-3">
                <div className="h-px w-16 bg-[hsl(var(--gold))] opacity-60" />

                <Heart className="h-3 w-3 fill-current text-[hsl(var(--primary))]" />

                <div className="h-px w-16 bg-[hsl(var(--gold))] opacity-60" />
            </div>

            <div className="relative z-10 mx-auto w-full max-w-sm text-center">
                <p className="mb-4 font-sans text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {t("welcome")}
                </p>

                <h1 className="mb-2 font-serif text-5xl font-light leading-tight text-foreground">
                    {wedding.bride_name}

                    <span className="my-1 block font-serif text-3xl italic text-[hsl(var(--primary))]">
            &amp;
          </span>

                    {wedding.groom_name}
                </h1>

                {wedding.wedding_date && (
                    <p className="mb-8 font-serif text-lg italic text-muted-foreground">
                        {new Intl.DateTimeFormat(locale, {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        }).format(new Date(wedding.wedding_date))}
                    </p>
                )}

                {settings?.enable_find_seat && (
                    <HomeSearch
                        guests={guests}
                        tables={tables}
                        venueElements={venueElements}
                    />
                )}

                <div className="mb-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {settings?.enable_photo_upload && (
                    <>
                        <p className="mb-10 font-sans text-sm leading-relaxed text-muted-foreground">
                            {t("photoDescription")}
                        </p>

                        <Link
                            href={`/${slug}/upload`}
                            className="btn-primary mb-4 w-full justify-center rounded-xl py-4 shadow-lg"
                        >
                            <Camera className="h-5 w-5" />

                            {t("sharePhoto")}
                        </Link>

                        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
                            {[
                                {
                                    icon: Camera,
                                    label: t("takePhoto"),
                                },
                                {
                                    icon: ImageIcon,
                                    label: t("uploadFromGallery"),
                                },
                                {
                                    icon: Heart,
                                    label: t("addMessage"),
                                },
                            ].map(({ icon: Icon, label }) => (
                                <div key={label} className="flex flex-col items-center gap-2">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] transition-transform hover:scale-105">
                                        <Icon className="h-5 w-5 text-[hsl(var(--primary))]" />
                                    </div>

                                    <p className="px-1 font-sans text-[10px] uppercase leading-tight tracking-wider text-muted-foreground">
                                        {label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="mt-12 flex items-center gap-3 pb-20">
                <div className="h-px w-16 bg-[hsl(var(--gold))] opacity-60" />

                <Heart className="h-3 w-3 fill-current text-[hsl(var(--primary))]" />

                <div className="h-px w-16 bg-[hsl(var(--gold))] opacity-60" />
            </div>

            <BottomNav
                slug={slug}
                enableFindSeat={settings?.enable_find_seat}
                enablePhotoUpload={settings?.enable_photo_upload}
            />
        </main>
    );
}
