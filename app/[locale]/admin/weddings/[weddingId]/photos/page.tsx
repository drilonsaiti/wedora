import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {getPhotosAction} from '@/actions/admin'
import {AdminDashboard} from '@/components/admin/dashboard'

export const dynamic = 'force-dynamic'

type Props = {
    params: { weddingId: string }
    searchParams: Promise<{
        filter?: string
    }>
}

export default async function AdminWeddingPhotosPage({params, searchParams}: Props) {
    const supabase = await createClient()
    const {weddingId} = await params

    const {data: {user}} = await supabase.auth.getUser()
    if (!user) redirect('/admin/login')

    const {data: admin} = await supabase
        .from('admins')
        .select('id, email')
        .eq('id', user.id)
        .single()

    if (!admin) redirect('/admin/login')

    // Platform admins can access any wedding; ensure the wedding exists
    const {data: wedding} = await supabase
        .from('weddings')
        .select('id')
        .eq('id', weddingId)
        .single()

    if (!wedding) redirect('/admin/weddings')

    const {filter} = await searchParams

    const filters =
        filter === 'favourites'
            ? {favourite: true}
            : filter === 'hidden'
                ? {hidden: true}
                : filter === 'unapproved'
                    ? {approved: false}
                    : undefined

    const photoResult = await getPhotosAction(wedding.id, filters, 50, 0)

    return (
        <AdminDashboard
            initialPhotos={photoResult.photos}
            initialTotal={photoResult.total ?? 0}
            adminEmail={admin.email}
            weddingId={wedding.id}
            error={photoResult.error}
            activeFilter={filter}
            role="admin"
        />
    )
}
