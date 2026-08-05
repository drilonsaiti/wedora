import {NextResponse} from 'next/server'
import {createClient, createServiceClient} from '@/lib/supabase/server'

export async function GET(
    _req: Request,
    {params}: { params: Promise<{ weddingId: string }> }
) {
    const {weddingId} = await params

    const supabaseClient = await createClient()
    const {data: {user}} = await supabaseClient.auth.getUser()
    if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

    const {data: admin} = await supabaseClient
        .from('admins')
        .select('id')
        .eq('id', user.id)
        .single()

    if (!admin) return NextResponse.json({error: 'Forbidden'}, {status: 403})

    const {data: wedding} = await supabaseClient
        .from('weddings')
        .select('id')
        .eq('id', weddingId)                                     // ← use unwrapped value
        .maybeSingle()

    if (!wedding) return NextResponse.json({error: 'Not found'}, {status: 404})

    const supabase = createServiceClient()
    const {count, error} = await supabase
        .from('photos')
        .select('id', {count: 'exact', head: true})
        .eq('wedding_id', wedding.id)

    if (error) return NextResponse.json({error: error.message}, {status: 500})

    if ((count ?? 0) > 120) {
        return NextResponse.json({
            status: 'queued-required',
            message: 'Album too large for synchronous ZIP on Hobby plan. Please use queued export.',
        }, {status: 202})
    }

    return NextResponse.json({
        status: 'not-implemented',
        message: 'Streaming ZIP not implemented yet in this branch.',
    }, {status: 501})
}