import { Camera, Heart } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { UploadFormDemo } from '@/components/demo/upload-form-demo'
import { BottomNav } from '@/components/bottom-nav'

export default async function DemoUploadPage() {
    const t = await getTranslations('wedding.upload')

    return (
        <main className="relative min-h-screen overflow-hidden bg-background px-6 pb-32 pt-10">
            {/* Ambient background */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
            >
                <div className="absolute left-1/2 top-[-220px] h-[560px] w-[720px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/30 blur-[140px]" />

                <div className="absolute bottom-[-220px] right-[-180px] h-[420px] w-[420px] rounded-full bg-[hsl(var(--gold))]/8 blur-[130px]" />
            </div>

            <div className="relative z-10 mx-auto w-full max-w-xl">
                {/* Brand */}
                <div className="mb-12 flex justify-center">
                    <div className="inline-flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white shadow-sm">
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

                {/* Header */}
                <header className="mb-9 text-center">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3.5 py-2 shadow-sm backdrop-blur">
                        <Camera
                            className="h-3.5 w-3.5 text-[hsl(var(--primary))]"
                            strokeWidth={1.6}
                        />

                        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                            {t('eyebrow')}
                        </span>
                    </div>

                    <h1 className="font-serif text-4xl font-light tracking-[-0.025em] text-foreground sm:text-5xl">
                        {t('title')}
                    </h1>

                    <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                        {t('description')}
                    </p>
                </header>

                {/* Upload experience */}
                <section className="rounded-[2rem] border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur sm:p-7">
                    <UploadFormDemo />
                </section>

                {/* Footer */}
                <p className="mt-10 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                    Made with Wedora
                </p>
            </div>

            <BottomNav
                slug="demo"
                enableFindSeat
                enablePhotoUpload
            />
        </main>
    )
}