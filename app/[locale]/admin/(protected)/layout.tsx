import type {ReactNode} from 'react'

import {redirect} from '@/lib/navigation'
import {createClient} from '@/lib/supabase/server'
import {AdminNavBar} from '@/components/admin/admin-nav-bar'

interface AdminLayoutProps {
    children: ReactNode
    params: Promise<{
        locale: string
    }>
}

export default async function AdminLayout({
                                              children,
                                              params,
                                          }: AdminLayoutProps) {
    const {locale} = await params

    const supabase = await createClient()

    const {
        data: {user},
    } = await supabase.auth.getUser()

    if (!user) {
        redirect({
            href: '/admin/login',
            locale,
        })

        return null
    }

    const {data: admin} = await supabase
        .from('admins')
        .select('id')
        .eq('id', user.id)
        .single()

    if (!admin) {
        redirect({
            href: '/admin/unauthorized',
            locale,
        })

        return null
    }

    return (
        <div className="relative min-h-screen bg-background">
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0"
            >
                <div
                    className="absolute left-1/2 top-[-320px] h-[680px] w-[920px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/15 blur-[150px]"
                />
            </div>

            <AdminNavBar
                adminEmail={user.email ?? ''}
            />

            <div className="relative z-10">
                {children}
            </div>
        </div>
    )
}