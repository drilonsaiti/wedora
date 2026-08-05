'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react'
import Link from 'next/link'
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/schemas'
import { createClient } from '@/lib/supabase/client'

export function CoupleForgotPasswordForm() {
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordValues>({
        resolver: zodResolver(forgotPasswordSchema),
    })

    const onSubmit = async (values: ForgotPasswordValues) => {
        setError(null)
        setLoading(true)

        try {
            const supabase = await createClient()
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(values.email, {
                redirectTo: `${window.location.origin}/api/auth/callback?next=/couple/reset-password`,
            })

            if (resetError) {
                setError(resetError.message)
                return
            }

            setSuccess(true)
        } catch {
            setError('Ndodhi një gabim i papritur')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="text-center space-y-4">
                <div className="flex justify-center">
                    <div className="rounded-full bg-green-100 p-3">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                </div>
                <h2 className="text-xl font-serif font-light text-[hsl(var(--dark))]">Kontrolloni email-in</h2>
                <p className="text-sm text-muted-foreground">
                    Ju kemi dërguar një lidhje për rivendosjen e fjalëkalimit në adresën tuaj email.
                </p>
                <Link href="/couple/login" className="btn-secondary w-full justify-center mt-4">
                    Kthehu te Hyrja
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-xl font-serif font-light text-[hsl(var(--dark))]">Harruat fjalëkalimin?</h2>
                <p className="text-sm text-muted-foreground">
                    Shkruani email-in tuaj dhe do t&apos;ju dërgojmë një lidhje për ta rivendosur.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                    <label className="label-wedding">
                        <Mail className="w-3 h-3 inline mr-1" />
                        Email
                    </label>
                    <input
                        {...register('email')}
                        type="email"
                        placeholder="you@example.com"
                        className="input-wedding"
                        autoComplete="email"
                        disabled={loading}
                    />
                    {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
                </div>

                {error && (
                    <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive font-sans">{error}</p>
                    </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Duke dërguar…
                        </>
                    ) : (
                        'Dërgo Lidhjen'
                    )}
                </button>

                <Link
                    href="/couple/login"
                    className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Kthehu te Hyrja
                </Link>
            </form>
        </div>
    )
}