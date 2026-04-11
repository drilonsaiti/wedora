'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react'
import { adminLoginSchema, type AdminLoginValues } from '@/schemas'
import { createClient } from '@/lib/supabase/client'

export function AdminLoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
  })

  const onSubmit = async (values: AdminLoginValues) => {
    setError(null)
    setLoading(true)

    try {
      const supabase = await createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (authError) {
        setError('Invalid email or password')
        return
      }

      // Verify admin status
      const { data: admin } = await supabase
        .from('admins')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!admin) {
        await supabase.auth.signOut()
        setError('Access denied. This account is not an admin.')
        return
      }

      router.push('/admin/photos')
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
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
        {errors.email && (
          <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="label-wedding">
          <Lock className="w-3 h-3 inline mr-1" />
          Password
        </label>
        <input
          {...register('password')}
          type="password"
          placeholder="••••••••"
          className="input-wedding"
          autoComplete="current-password"
          disabled={loading}
        />
        {errors.password && (
          <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive font-sans">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full justify-center mt-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing in…
          </>
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  )
}
