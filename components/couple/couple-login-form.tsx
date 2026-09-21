'use client'

import {useState} from 'react'

import {AlertCircle, Eye, EyeOff, Loader2, Lock, LogIn, Mail,} from 'lucide-react'
import {useRouter} from 'next/navigation'
import {useTranslations} from 'next-intl'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'

import {createClient} from '@/lib/supabase/client'
import {Link} from '@/lib/navigation'
import {coupleLoginSchema, type CoupleLoginValues,} from '@/schemas'

export function CoupleLoginForm() {
    const router = useRouter()

    const t = useTranslations('auth')
    const tv = useTranslations('validation')
    const tc = useTranslations('common')

    const [error, setError] =
        useState<string | null>(null)

    const [loading, setLoading] =
        useState(false)

    const [showPassword, setShowPassword] =
        useState(false)

    const {
        register,
        handleSubmit,
        formState: {errors},
    } = useForm<CoupleLoginValues>({
        resolver: zodResolver(
            coupleLoginSchema
        ),
    })

    const onSubmit = async (
        values: CoupleLoginValues
    ) => {
        setError(null)
        setLoading(true)

        try {
            const supabase =
                await createClient()

            const {
                data,
                error: authError,
            } =
                await supabase.auth.signInWithPassword(
                    {
                        email:
                        values.email,
                        password:
                        values.password,
                    }
                )

            if (authError) {
                setError(
                    t(
                        'invalidCredentials'
                    )
                )
                return
            }

            const appMetadata =
                data.user
                    .app_metadata as {
                    role?: string
                    wedding_id?: string
                }

            if (
                appMetadata.role !==
                'couple' ||
                !appMetadata.wedding_id
            ) {
                await supabase.auth.signOut()

                setError(
                    t('accessDenied')
                )
                return
            }

            router.push(
                `/couple/weddings/${appMetadata.wedding_id}`
            )

            router.refresh()
        } catch {
            setError(tc('error'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <form
            onSubmit={handleSubmit(
                onSubmit
            )}
            className="space-y-5"
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

                {errors.email?.message && (
                    <p className="mt-1.5 text-xs leading-5 text-destructive">
                        {tv(
                            errors.email.message.replace(
                                'validation.',
                                ''
                            )
                        )}
                    </p>
                )}
            </div>

            {/* Password */}
            <div>
                <div className="mb-1.5 flex items-center justify-between">
                    <label
                        htmlFor="password"
                        className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                        {t('password')}
                    </label>

                    <Link
                        href="/couple/forgot-password"
                        className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-[hsl(var(--primary))]"
                    >
                        {t(
                            'forgotPassword.title'
                        )}
                    </Link>
                </div>

                <div className="relative">
                    <Lock
                        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        strokeWidth={1.6}
                    />

                    <input
                        {...register(
                            'password'
                        )}
                        id="password"
                        type={
                            showPassword
                                ? 'text'
                                : 'password'
                        }
                        placeholder={t(
                            'passwordPlaceholder'
                        )}
                        autoComplete="current-password"
                        disabled={loading}
                        className="input-wedding h-12 pl-11 pr-11"
                    />

                    <button
                        type="button"
                        onClick={() =>
                            setShowPassword(
                                (current) =>
                                    !current
                            )
                        }
                        disabled={loading}
                        aria-label={
                            showPassword
                                ? t(
                                    'hidePassword'
                                )
                                : t(
                                    'showPassword'
                                )
                        }
                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    >
                        {showPassword ? (
                            <EyeOff
                                className="h-4 w-4"
                                strokeWidth={
                                    1.6
                                }
                            />
                        ) : (
                            <Eye
                                className="h-4 w-4"
                                strokeWidth={
                                    1.6
                                }
                            />
                        )}
                    </button>
                </div>

                {errors.password
                    ?.message && (
                    <p className="mt-1.5 text-xs leading-5 text-destructive">
                        {t(
                            errors.password.message.replace(
                                'auth.',
                                ''
                            )
                        )}
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

                        {tc('loading')}
                    </>
                ) : (
                    <>
                        <LogIn className="h-4 w-4"/>

                        {t('signIn')}
                    </>
                )}
            </button>
        </form>
    )
}