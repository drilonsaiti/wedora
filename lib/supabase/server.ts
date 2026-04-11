import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'
import type { Database } from '@/types/database'

type CookieToSet = {
    name: string
    value: string
    options: CookieOptions
}

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                async getAll() {
                    return cookieStore.getAll()
                },
                async setAll(cookiesToSet: CookieToSet[]) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Safe in Server Components when setting is not allowed
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
                async getAll() {
                    return []
                },
                async setAll(_cookiesToSet: CookieToSet[]) {},
            },
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
}