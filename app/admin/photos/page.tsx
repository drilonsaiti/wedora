import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminPhotosPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/admin/login')

    const { data: admin } = await supabase
        .from('admins')
        .select('id')
        .eq('id', user.id)
        .single()

    if (!admin) redirect('/admin/login')

    // Redirect legacy route to the new paths
    const { data: weddings } = await supabase
        .from('weddings')
        .select('id')
        .eq('owner_user_id', user.id)

    if (weddings && weddings.length === 1) {
        redirect(`/admin/weddings/${weddings[0].id}/photos`)
    }

    redirect('/admin/weddings')
}