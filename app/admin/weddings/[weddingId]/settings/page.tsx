import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {EditWeddingForm} from "@/components/admin/edit-wedding-form";

type Props = { params: Promise<{ weddingId: string }> }

export default async function WeddingSettingsPage({ params }: Props) {
    const { weddingId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/admin/login')

    const { data: wedding, error } = await supabase
        .from('weddings')
        .select('*, wedding_settings(*)')
        .eq('id', weddingId)
        .single()

    if (error || !wedding) redirect('/admin/weddings')

    return (
        <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6">
            <EditWeddingForm wedding={wedding} />
        </div>
    )
}