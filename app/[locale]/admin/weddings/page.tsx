import {redirect} from '@/lib/navigation'
import {createClient} from '@/lib/supabase/server'
import {WeddingsPageClient} from '@/components/admin/weddings-page-client'

export const dynamic = 'force-dynamic'

export default async function AdminWeddingsListPage({
                                                        params,
                                                    }: {
    params: Promise<{ locale: string }>
}) {
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
        .select('id, email')
        .eq('id', user.id)
        .single()

    if (!admin) {
        redirect({
            href: '/admin/login',
            locale,
        })

        return null
    }

    const {data: weddings, error} = await supabase
        .from('weddings')
        .select(
            'id, groom_name, bride_name, slug, wedding_date, created_at'
        )
        .order('created_at', {ascending: false})

    if (error) {
        throw new Error(error.message)
    }

    return (
        <WeddingsPageClient
            weddings={weddings ?? []}
            adminEmail={admin.email}
        />
    )
}