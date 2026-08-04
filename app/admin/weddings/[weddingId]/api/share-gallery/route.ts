import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ weddingId: string }> }
) {
  const { weddingId } = await params
  try {
    const supabaseClient = await createClient()
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin and ownership
    const { data: admin } = await supabaseClient
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If the caller is a platform admin, they can operate on any wedding.
    // We've already verified the user is in admins, so just ensure the wedding exists.
    const { data: wedding } = await supabaseClient
      .from('weddings')
      .select('id')
      .eq('id', weddingId)
      .maybeSingle()

    if (!wedding) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const supabase = createServiceClient()

    const insert = await supabase
      .from('gallery_tokens')
        // @ts-ignore
      .insert({
        wedding_id: wedding.id,
        show_messages: true,
        photo_filter: 'all',
      })
      .select('token')
      .single()

    if (insert.error || !insert.data) {
      return NextResponse.json({ error: insert.error?.message ?? 'Failed to create link' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const url = `${appUrl}/g/${insert.data.token}`

    return NextResponse.json({ token: insert.data.token, url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
