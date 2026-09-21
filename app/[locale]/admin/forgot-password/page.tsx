import {Heart, KeyRound} from 'lucide-react'
import {getTranslations} from 'next-intl/server'

import {ForgotPasswordForm} from '@/components/admin/forgot-password-form'

export default async function ForgotPasswordPage() {
    const t = await getTranslations('auth')

    return (
        <main
            className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
            {/* Ambient background */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
            >
                <div
                    className="absolute left-1/2 top-[-260px] h-[620px] w-[800px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/20 blur-[150px]"/>

                <div
                    className="absolute bottom-[-220px] right-[-180px] h-[420px] w-[420px] rounded-full bg-[hsl(var(--gold))]/6 blur-[130px]"/>
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Brand */}
                <div className="mb-12 flex justify-center">
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

                {/* Header */}
                <header className="mb-8 text-center">
                    <div
                        className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3.5 py-2 shadow-sm backdrop-blur">
                        <KeyRound
                            className="h-3.5 w-3.5 text-[hsl(var(--primary))]"
                            strokeWidth={1.6}
                        />

                        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                            {t('authentication')}
                        </span>
                    </div>

                    <h1 className="font-serif text-4xl font-light tracking-[-0.025em] text-foreground sm:text-5xl">
                        {t('adminPortal')}
                    </h1>

                    <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
                        {t('forgotPassword.description')}
                    </p>
                </header>

                {/* Card */}
                <section
                    className="rounded-[2rem] border border-border/70 bg-card/85 p-6 shadow-sm backdrop-blur sm:p-8">
                    <ForgotPasswordForm/>
                </section>

                <p className="mt-10 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
                    Wedora Admin
                </p>
            </div>
        </main>
    )
}