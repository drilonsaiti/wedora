import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET will attempt a streamed ZIP for small albums; for large ones it should queue a job.
// For now, we return 202 for large sets and 501 for unimplemented streaming to keep the route stable.
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ weddingId: string }> }
) {
  const { weddingId } = await params

  const supabaseClient = await createClient()
  const { data: { user } } = await supabaseClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: admin } = await supabaseClient
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .single()

  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Platform admins are allowed across tenants; just ensure the wedding exists
  const { data: wedding } = await supabaseClient
      .from('weddings')
      .select('id')
      .eq('id', weddingId)
      .maybeSingle()

  if (!wedding) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const supabase = createServiceClient()
  const { count, error } = await supabase
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('wedding_id', wedding.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Heuristic threshold: if > 120 photos, likely to exceed Hobby 10s — queue instead
  if ((count ?? 0) > 120) {
    return NextResponse.json({
      status: 'queued-required',
      message: 'Album too large for synchronous ZIP on Hobby plan. Please use queued export.',
    }, { status: 202 })
  }

  // Placeholder until streaming archiver is implemented
  return NextResponse.json({
    status: 'not-implemented',
    message: 'Streaming ZIP not implemented yet in this branch.',
  }, { status: 501 })
}