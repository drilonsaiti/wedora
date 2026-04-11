import { createServerClient } from '@supabase/ssr'
import { cookies, type UnsafeUnwrappedCookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
    const cookieStore = cookies() as unknown as UnsafeUnwrappedCookies

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(
                    cookiesToSet: Array<{
                        name: string
                        value: string
                        options: CookieOptions
                    }>
                ) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // safe to ignore in Server Components
                    }
                },
            },
        }
    )
}

export function createServiceClient() {
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            cookies: {
                getAll() {
                    return []
                },
                setAll(
                    _cookiesToSet: Array<{
                        name: string
                        value: string
                        options: CookieOptions
                    }>
                ) {},
            },
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
}