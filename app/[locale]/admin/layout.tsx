import {redirect} from '@/lib/navigation'
import {createClient} from '@/lib/supabase/server'
import {AdminNavBar} from "@/components/admin/admin-nav-bar";

export default async function AdminLayout({children, params}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
    const {locale} = await params
    const supabase = await createClient()
    const {data: {user}} = await supabase.auth.getUser()

    if (!user) redirect('/admin/login')

    const {data: admin} = await supabase.from('admins').select('id').eq('id', user.id).single()
    if (!admin) redirect('/admin/login')

    return (
        <div className="min-h-screen bg-background">
            <AdminNavBar adminEmail={user.email ?? ''}/>
            {children}
        </div>
    )
}