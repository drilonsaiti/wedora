import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPhotosAction } from '@/actions/admin'
import { AdminDashboard } from '@/components/admin/dashboard'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ weddingId: string }>
  searchParams: Promise<{ filter?: string }>
}

export default async function CoupleWeddingPhotosPage({ params, searchParams }: Props) {
  const supabase = await createClient()
  const { weddingId } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('LOOP DEBUG: no user, redirecting to /couple/login')
    redirect('/couple/login')
  }

  const appMetadata = user.app_metadata as { role?: string; wedding_id?: string }
  if (appMetadata.role !== 'couple' || appMetadata.wedding_id !== weddingId) {
    console.log('LOOP DEBUG: role/wedding_id mismatch', appMetadata, weddingId)
    redirect('/couple/login')
  }

  const { data: settings } = await supabase
      .from('wedding_settings')
      .select('enable_couple_login')
      .eq('wedding_id', weddingId)
      .single()

  if (!settings?.enable_couple_login) {
    console.log('LOOP DEBUG: enable_couple_login false or settings missing', settings)
    redirect('/couple/login')
  }



  const { filter } = await searchParams
  const filters =
      filter === 'favourites' ? { favourite: true }
          : filter === 'hidden' ? { hidden: true }
              : filter === 'unapproved' ? { approved: false }
                  : undefined

  const photoResult = await getPhotosAction(weddingId, filters, 50, 0)

  return (
      <AdminDashboard
          initialPhotos={photoResult.photos}
          initialTotal={photoResult.total ?? 0}
          adminEmail={user.email ?? ''}
          weddingId={weddingId}
          error={photoResult.error}
          activeFilter={filter}
          role="couple"
      />
  )
}