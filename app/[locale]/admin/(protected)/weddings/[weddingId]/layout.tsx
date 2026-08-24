import {ReactNode} from 'react'
import {notFound, redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

type Props = {
    children: ReactNode
    params: Promise<{ weddingId: string }>
}

export default async function WeddingAdminLayout({children, params}: Props) {
    const {weddingId} = await params

    const supabase = await createClient()

    const {data: {user}} = await supabase.auth.getUser()
    if (!user) {
        console.log('no user')
        redirect('/admin/login')
    }

    const {data: admin} = await supabase
        .from('admins')
        .select('id')
        .eq('id', user.id)
        .single()

    if (!admin) redirect('/')

    const {data: wedding, error} = await supabase
        .from('weddings')
        .select('id')
        .eq('id', weddingId)
        .single()

    if (error) {
        console.error('WEDDING FETCH ERROR:', error.message, error.code, error.details)
    }
    if (error || !wedding) notFound()

    return (
        <>{children}</>
    )
}