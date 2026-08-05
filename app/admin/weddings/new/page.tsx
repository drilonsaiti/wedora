import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {CreateWeddingForm} from '@/components/admin/create-wedding-form'

export default async function NewWeddingPage() {
    const supabase = await createClient()
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) redirect('/admin/login')

    const {data: admin} = await supabase.from('admins').select('id, email').eq('id', user.id).single()
    if (!admin) redirect('/admin/login')

    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            <CreateWeddingForm adminEmail={admin.email}/>
        </div>
    )
}