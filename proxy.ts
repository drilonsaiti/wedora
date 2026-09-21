import {createServerClient} from '@supabase/ssr'
import {type NextRequest, NextResponse} from 'next/server'
import type {Database} from '@/types/database'
import createI18nMiddleware from 'next-intl/middleware';
import {locales, defaultLocale} from './lib/i18n';

const i18nMiddleware = createI18nMiddleware({
    locales,
    defaultLocale,
    localePrefix: 'always'
});

type CookieToSet = {
    name: string
    value: string
    options?: Record<string, unknown>
}

export async function proxy(request: NextRequest) {
    const {pathname} = request.nextUrl

    // 1. Handle i18n first
    const response = i18nMiddleware(request);

    // 2. Handle Supabase auth
    let supabaseResponse = response

    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet: CookieToSet[]) {
                    cookiesToSet.forEach(({name, value, options}) => {
                        request.cookies.set(name, value)
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const {
        data: {user},
    } = await supabase.auth.getUser()

    // Strip locale from pathname for easier matching
    const pathnameWithoutLocale = pathname.replace(new RegExp(`^/(${locales.join('|')})`), '') || '/'

    // Allow auth-related routes
    if (
        pathnameWithoutLocale === '/admin/forgot-password' ||
        pathnameWithoutLocale === '/admin/reset-password' ||
        pathnameWithoutLocale === '/couple/forgot-password' ||
        pathnameWithoutLocale === '/couple/reset-password' ||
        pathnameWithoutLocale.startsWith('/api/auth')
    ) {
        return supabaseResponse
    }


    if (pathnameWithoutLocale.startsWith('/admin/weddings')) {
        if (!user) {
            const url = request.nextUrl.clone()
            const locale = pathname.split('/')[1]
            url.pathname = `/${locale}/admin/login`
            return NextResponse.redirect(url)
        }
    }

    if (pathnameWithoutLocale.startsWith('/couple/weddings')) {
        if (!user) {
            const url = request.nextUrl.clone()
            const locale = pathname.split('/')[1]
            url.pathname = `/${locale}/couple/login`
            return NextResponse.redirect(url)
        }

        const appMetadata = user.app_metadata as { role?: string; wedding_id?: string }
        if (appMetadata.role !== 'couple') {
            const url = request.nextUrl.clone()
            const locale = pathname.split('/')[1]
            url.pathname = `/${locale}/couple/login`
            return NextResponse.redirect(url)
        }
    }

    if (pathnameWithoutLocale === '/couple/login' && user) {
        const appMetadata = user.app_metadata as { role?: string; wedding_id?: string }
        if (appMetadata.role === 'couple' && appMetadata.wedding_id) {
            const url = request.nextUrl.clone()
            const locale = pathname.split('/')[1]
            url.pathname = `/${locale}/couple/weddings/${appMetadata.wedding_id}`
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/',
        '/((?!api|_next|.*\\..*).*)',
    ],
}