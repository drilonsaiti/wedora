import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {getPhotosAction} from '@/actions/admin'
import {AdminDashboard} from '@/components/admin/dashboard'

export const dynamic = 'force-dynamic'

type Props = {
    searchParams: Promise<{
        filter?: string
    }>
}

export default async function AdminPhotosPage({searchParams}: Props) {
    const supabase = await createClient()

    const {
        data: {user},
    } = await supabase.auth.getUser()

    if (!user) redirect('/admin/login')

    const result = await supabase
        .from('admins')
        .select('id, email')
        .eq('id', user.id)
        .single()

    const admin = result.data as { id: string; email: string } | null

    if (!admin) redirect('/admin/login')

    const {filter} = await searchParams

    const filters =
        filter === 'favourites'
            ? {favourite: true}
            : filter === 'hidden'
                ? {hidden: true}
                : filter === 'unapproved'
                    ? {approved: false}
                    : undefined

    const {photos, error, total} = await getPhotosAction(filters, 50, 0)

    return (
        <AdminDashboard
            initialPhotos={photos}
            initialTotal={total || 0}
            adminEmail={admin.email}
            error={error}
            activeFilter={filter}
        />
    )
}