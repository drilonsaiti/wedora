'use client'

import {useState} from 'react'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {useRouter} from 'next/navigation'
import {AlertCircle, CheckCircle2, Loader2, Lock} from 'lucide-react'
import {resetPasswordSchema, type ResetPasswordValues} from '@/schemas'
import {createClient} from '@/lib/supabase/client'

export function ResetPasswordForm() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: {errors},
    } = useForm<ResetPasswordValues>({
        resolver: zodResolver(resetPasswordSchema),
    })

    const onSubmit = async (values: ResetPasswordValues) => {
        setError(null)
        setLoading(true)

        try {
            const supabase = await createClient()
            const {error: resetError} = await supabase.auth.updateUser({
                password: values.password,
            })

            if (resetError) {
                setError(resetError.message)
                return
            }

            setSuccess(true)
            setTimeout(() => {
                router.push('/admin/login')
            }, 3000)
        } catch {
            setError('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="text-center space-y-4">
                <div className="flex justify-center">
                    <div className="rounded-full bg-green-100 p-3">
                        <CheckCircle2 className="w-8 h-8 text-green-600"/>
                    </div>
                </div>
                <h2 className="text-xl font-semibold text-wedding-900">Password reset successful</h2>
                <p className="text-wedding-600">
                    Your password has been successfully reset. Redirecting you to the login page...
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-xl font-semibold text-wedding-900">Set new password</h2>
                <p className="text-sm text-wedding-600">
                    Please enter your new password below.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                    <label className="label-wedding">
                        <Lock className="w-3 h-3 inline mr-1"/>
                        New Password
                    </label>
                    <input
                        {...register('password')}
                        type="password"
                        placeholder="••••••••"
                        className="input-wedding"
                        autoComplete="new-password"
                        disabled={loading}
                    />
                    {errors.password && (
                        <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
                    )}
                </div>

                <div>
                    <label className="label-wedding">
                        <Lock className="w-3 h-3 inline mr-1"/>
                        Confirm New Password
                    </label>
                    <input
                        {...register('confirmPassword')}
                        type="password"
                        placeholder="••••••••"
                        className="input-wedding"
                        autoComplete="new-password"
                        disabled={loading}
                    />
                    {errors.confirmPassword && (
                        <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>
                    )}
                </div>

                {error && (
                    <div
                        className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5"/>
                        <p className="text-sm text-destructive font-sans">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full justify-center"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin"/>
                            Resetting password…
                        </>
                    ) : (
                        'Reset Password'
                    )}
                </button>
            </form>
        </div>
    )
}
