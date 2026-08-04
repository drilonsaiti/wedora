import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Heart, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
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

  const { data: admin } = await supabase.from('admins').select('id, email').eq('id', user.id).single()
  if (!admin) redirect('/admin/login')

  const { data: weddings, error } = await supabase
      .from('weddings')
      .select('id, groom_name, bride_name, slug, created_at')
      .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (
      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-2xl font-light text-[hsl(var(--dark))]">Dasmat</h1>
          <Link href="/admin/weddings/new" className="btn-primary text-sm py-2.5 px-5">
            <Plus className="w-4 h-4" />
            Dasmë e Re
          </Link>
        </div>

        {(!weddings || weddings.length === 0) ? (
            <div className="card-wedding p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-[hsl(var(--primary))]" strokeWidth={1.5} />
              </div>
              <h2 className="font-serif text-xl font-light mb-2">Ende nuk keni dasma</h2>
              <p className="text-sm text-muted-foreground mb-6">Krijoni dasmën tuaj të parë për të filluar</p>
              <Link href="/admin/weddings/new" className="btn-primary inline-flex">
                <Plus className="w-4 h-4" />
                Krijo Dasmën e Parë
              </Link>
            </div>
        ) : (
            <div className="space-y-3">
              {weddings.map((w: WeddingRow) => (
                  <div
                      key={w.id}
                      className="card-wedding p-5 flex items-center justify-between gap-4 hover:shadow-md transition-shadow"
                  >
                    <Link href={`/admin/weddings/${w.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center shrink-0">
                        <Heart className="w-5 h-5 text-[hsl(var(--primary))]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-serif text-lg text-[hsl(var(--dark))] truncate">
                          {(w.groom_name ?? 'Dhëndër')} & {(w.bride_name ?? 'Nusë')}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          /{w.slug ?? '—'}
                          <ExternalLink className="w-3 h-3" />
                          <span className="mx-1">·</span>
                          {w.created_at ? new Date(w.created_at).toLocaleDateString('sq-AL') : '—'}
                        </p>
                      </div>
                    </Link>
                    <WeddingRowActions weddingId={w.id} />
                  </div>
              ))}
            </div>
        )}
      </div>
  )
}