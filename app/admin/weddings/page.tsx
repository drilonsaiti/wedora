import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CreateWeddingForm } from '@/components/admin/create-wedding-form'
import { WeddingRowActions } from '@/components/admin/wedding-row-actions'

type WeddingRow = {
  id: string
  groom_name: string | null
  bride_name: string | null
  slug: string | null
  created_at: string | null
}

export const dynamic = 'force-dynamic'

export default async function AdminWeddingsListPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: admin } = await supabase
    .from('admins')
    .select('id, email')
    .eq('id', user.id)
    .single()

  if (!admin) redirect('/admin/login')

  // Platform admins see all weddings; since reaching this page requires an admin,
  // list all weddings without owner filter.
  const { data: weddings, error } = await supabase
    .from('weddings')
    .select('id, groom_name, bride_name, slug, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  if (!weddings || weddings.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <h1 className="text-2xl font-semibold mb-6">Dasmat</h1>
        <div className="rounded-lg border bg-card">
          <div className="p-6">
            <p className="text-muted-foreground mb-4">Ju nuk keni ende një dasmë.</p>
            <CreateWeddingForm adminEmail={admin.email} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-6">Dasmat</h1>
      <ul className="space-y-3">
        {weddings.map((w: WeddingRow) => (
          <li key={w.id} className="rounded-lg border bg-card">
            <div className="p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">
                  {(w.groom_name ?? 'Dhëndër') + ' & ' + (w.bride_name ?? 'Nusë')}
                </div>
                <div className="text-sm text-muted-foreground">
                  slug: {w.slug ?? '—'} · krijuar më: {w.created_at ? new Date(w.created_at).toLocaleDateString() : '—'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/weddings/${w.id}`} className="btn btn-primary px-3 py-2 rounded-md border">
                  Sistemimi
                </Link>
                <Link href={`/admin/weddings/${w.id}/photos`} className="btn px-3 py-2 rounded-md border">
                  Fotot e Dasmës
                </Link>
                <WeddingRowActions weddingId={w.id} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
