'use client'

import {useState} from 'react'

import {AlertCircle, ArrowLeft, Check, Loader2, Mail,} from 'lucide-react'
import {useTranslations} from 'next-intl'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'

import {Link} from '@/lib/navigation'
import {createClient} from '@/lib/supabase/client'
import {forgotPasswordSchema, type ForgotPasswordValues,} from '@/schemas'

export function ForgotPasswordForm() {
    const t = useTranslations(
        'auth.forgotPassword'
    )

    const [error, setError] =
        useState<string | null>(null)

    const [success, setSuccess] =
        useState(false)

    const [loading, setLoading] =
        useState(false)

    const {
        register,
        handleSubmit,
        formState: {errors},
    } = useForm<ForgotPasswordValues>({
        resolver: zodResolver(
            forgotPasswordSchema
        ),
    })

    const onSubmit = async (
        values: ForgotPasswordValues
    ) => {
        setError(null)
        setLoading(true)

        try {
            const supabase =
                await createClient()

            const {
                error: resetError,
            } =
                await supabase.auth.resetPasswordForEmail(
                    values.email,
                    {
                        redirectTo: `${window.location.origin}/api/auth/callback?next=/admin/reset-password`,
                    }
                )

            if (resetError) {
                setError(
                    resetError.message
                )
                return
            }

            setSuccess(true)
        } catch {
            setError(
                t(
                    'unexpectedError'
                )
            )
        } finally {
            setLoading(false)
        }
    }

    /*
     * SUCCESS
     */
    if (success) {
        return (
            <div className="py-3 text-center">
                <div
                    className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-[hsl(var(--primary))]/15 bg-[hsl(var(--accent))]">
                    <Check
                        className="h-6 w-6 text-[hsl(var(--primary))]"
                        strokeWidth={1.7}
                    />
                </div>

                <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                    {t(
                        'emailSent'
                    )}
                </p>

                <h2 className="font-serif text-3xl font-light tracking-[-0.02em] text-foreground">
                    {t(
                        'checkYourEmail'
                    )}
                </h2>

                <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
                    {t(
                        'resetLinkSent'
                    )}
                </p>

                <Link
                    href="/admin/login"
                    className="btn-secondary mt-7 w-full justify-center"
                >
                    <ArrowLeft className="h-4 w-4"/>

                    {t(
                        'backToLogin'
                    )}
                </Link>
            </div>
        )
    }

    return (
        <form
            onSubmit={handleSubmit(
                onSubmit
            )}
            className="space-y-6"
        >
            {/* Email */}
            <div>
                <label
                    htmlFor="email"
                    className="label-wedding"
                >
                    {t('email')}
                </label>

                <div className="relative">
                    <Mail
                        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        strokeWidth={1.6}
                    />

                    <input
                        {...register(
                            'email'
                        )}
                        id="email"
                        type="email"
                        placeholder={t(
                            'emailPlaceholder'
                        )}
                        autoComplete="email"
                        disabled={loading}
                        className="input-wedding h-12 pl-11"
                    />
                </div>

                {errors.email && (
                    <p className="mt-1.5 text-xs leading-5 text-destructive">
                        {
                            errors.email
                                .message
                        }
                    </p>
                )}
            </div>

            {/* Error */}
            {error && (
                <div
                    role="alert"
                    className="flex items-start gap-3 rounded-2xl border border-destructive/15 bg-destructive/[0.06] px-4 py-3.5"
                >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive"/>

                    <p className="text-xs leading-5 text-destructive">
                        {error}
                    </p>
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3.5"
            >
                {loading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin"/>

                        {t(
                            'sendingLink'
                        )}
                    </>
                ) : (
                    <>
                        <Mail className="h-4 w-4"/>

                        {t(
                            'sendResetLink'
                        )}
                    </>
                )}
            </button>

            {/* Back */}
            <Link
                href="/admin/login"
                className="group flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"/>

                {t(
                    'backToLogin'
                )}
            </Link>
        </form>
    )
}