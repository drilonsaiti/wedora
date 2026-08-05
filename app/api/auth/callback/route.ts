import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'

export async function GET(request: Request) {
    const {searchParams, origin} = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/admin/dashboard'

    if (code) {
        const supabase = await createClient()
        const {error} = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    const loginPath = next.startsWith('/couple') ? '/couple/login' : '/admin/login'
    return NextResponse.redirect(`${origin}${loginPath}?error=auth_callback_failed`)
}