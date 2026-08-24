import { EditWeddingForm } from '@/components/admin/edit-wedding-form'
import { redirect } from '@/lib/navigation'
import { createClient } from '@/lib/supabase/server'
import {notFound} from "next/navigation";

type Props = {
    params: Promise<{
        locale: string
        weddingId: string
    }>
}

export default async function WeddingSettingsPage({
                                                      params,
                                                  }: Props) {
    const {
        locale,
        weddingId,
    } = await params

    const supabase =
        await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect({
            href: '/admin/login',
            locale,
        })

        return null
    }

    const { data: admin } =
        await supabase
            .from('admins')
            .select('id')
            .eq('id', user.id)
            .single()

    if (!admin) {
        redirect({
            href: '/admin/unauthorized',
            locale,
        })
    }

    const {
        data: wedding,
        error,
    } =
        await supabase
            .from('weddings')
            .select(`
            id,
            groom_name,
            bride_name,
            groom_email,
            bride_email,
            wedding_date,
            slug,
            wedding_settings (
                *
            )
        `)
            .eq(
                'id',
                weddingId
            )
            .maybeSingle()

    if (
        error ||
        !wedding
    ) {
        notFound()
    }

    return (
        <main className="relative z-10 mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
            <EditWeddingForm
                wedding={wedding}
            />
        </main>
    )
}