import {createClient} from '@/lib/supabase/server'
import {redirect} from 'next/navigation'

export default async function SeatingPage() {
    const supabase = await createClient()

    const {
        data: {user},
    } = await supabase.auth.getUser()


    if (!user) {
        console.log('no user no no no')
        redirect('/admin/login')
    }

    const {data: admin} = await supabase
        .from('admins')
        .select('id')
        .eq('id', user.id)
        .single()

    if (!admin) {
        redirect('/')
    }

    const {data: weddings, error: weddingError} = await supabase
        .from('weddings')
        .select('id')
        .eq('owner_user_id', user.id)

    if (weddingError) {
        throw new Error(weddingError.message)
    }

    if (weddings && weddings.length === 1) {
        redirect(`/admin/weddings/${weddings[0].id}`)
    }

    redirect('/admin/weddings')
}