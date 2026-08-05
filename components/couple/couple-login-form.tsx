'use client'

import {useState} from 'react'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {useRouter} from 'next/navigation'
import {AlertCircle, Loader2, Lock, Mail} from 'lucide-react'
import {coupleLoginSchema, type CoupleLoginValues} from '@/schemas'
import {createClient} from '@/lib/supabase/client'
import Link from "next/link";

export function CoupleLoginForm() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: {errors},
    } = useForm<CoupleLoginValues>({
        resolver: zodResolver(coupleLoginSchema),
    })

    const onSubmit = async (values: CoupleLoginValues) => {
        setError(null)
        setLoading(true)

        try {
            const supabase = await createClient()
            const {data, error: authError} = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            })

            if (authError) {
                setError('Email ose fjalëkalim i pasaktë')
                return
            }

            const appMetadata = data.user.app_metadata as { role?: string; wedding_id?: string }

            if (appMetadata.role !== 'couple' || !appMetadata.wedding_id) {
                await supabase.auth.signOut()
                setError('Kjo llogari s\'ka akses si çift dasme')
                return
            }

            router.push(`/couple/weddings/${appMetadata.wedding_id}`)
            router.refresh()
        } catch {
            setError('Ndodhi një gabim i papritur')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
                <label className="label-wedding">
                    <Mail className="w-3 h-3 inline mr-1"/>
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

            <div>
                <label className="label-wedding">
                    <Lock className="w-3 h-3 inline mr-1"/>
                    Fjalëkalimi
                </label>
                <input
                    {...register('password')}
                    type="password"
                    placeholder="••••••••"
                    className="input-wedding"
                    autoComplete="current-password"
                    disabled={loading}
                />
                {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
                <div className="flex justify-end mt-1">
                    <Link
                        href="/couple/forgot-password"
                        className="text-xs text-muted-foreground hover:text-[hsl(var(--primary))] transition-colors"
                    >
                        Harruat fjalëkalimin?
                    </Link>
                </div>
            </div>

            {error && (
                <div
                    className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5"/>
                    <p className="text-sm text-destructive font-sans">{error}</p>
                </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin"/>
                        Duke u kyçur…
                    </>
                ) : (
                    'Hyr'
                )}
            </button>
        </form>
    )
}