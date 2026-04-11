import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPhotosAction } from '@/actions/admin'
import { AdminDashboard } from '@/components/admin/dashboard'

export const dynamic = 'force-dynamic'

export default async function AdminPhotosPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const { data: admin } = await supabase
    .from('admins')
    .select('id, email')
    .eq('id', user.id)
    .single()

  if (!admin) redirect('/admin/login')

  const filter = searchParams.filter

  const filters =
    filter === 'favourites'
      ? { favourite: true }
      : filter === 'hidden'
        ? { hidden: true }
        : filter === 'unapproved'
          ? { approved: false }
          : undefined

  const { photos, error } = await getPhotosAction(filters)

  return (
    <AdminDashboard
      photos={photos}
      adminEmail={admin.email}
      error={error}
      activeFilter={filter}
    />
  )
}
