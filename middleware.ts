import {createServerClient} from '@supabase/ssr'
import {type NextRequest, NextResponse} from 'next/server'
import type {Database} from '@/types/database'

type CookieToSet = {
    name: string
    value: string
    options?: Record<string, unknown>
}

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({request})

    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet: CookieToSet[]) {
                    cookiesToSet.forEach(({name, value}) =>
                        request.cookies.set(name, value)
                    )

                    supabaseResponse = NextResponse.next({request})

                    cookiesToSet.forEach(({name, value, options}) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: {user},
    } = await supabase.auth.getUser()

    const {pathname} = request.nextUrl

    // Allow auth-related routes
    if (
        pathname === '/admin/forgot-password' ||
        pathname === '/admin/reset-password' ||
        pathname.startsWith('/api/auth')
    ) {
        return supabaseResponse
    }

    if (pathname.startsWith('/admin/photos')) {
        if (!user) {
            const url = request.nextUrl.clone()
            url.pathname = '/admin/login'
            return NextResponse.redirect(url)
        }
    }

    if (pathname === '/admin/login' && user) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/photos'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: ['/admin/:path*'],
}