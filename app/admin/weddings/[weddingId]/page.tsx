import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getGuests, getTables, getVenueElements } from '@/actions/seating'
import { SeatingManagement } from '@/components/admin/seating-management'

type Props = { params: { weddingId: string } }

export default async function WeddingDashboardPage({ params }: Props) {
  const supabase = await createClient()
  const { weddingId } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('no user nah nah')
    redirect('/admin/login')
  }

  // Verify admin status for safety (layout also guards); then load wedding by id
  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!admin) redirect('/admin/login')

  const { data: wedding } = await supabase
    .from('weddings')
    .select('id')
    .eq('id', weddingId)
    .single()

  if (!wedding) redirect('/admin/weddings')

  const [guests, tables, venueElements] = await Promise.all([
    getGuests(wedding.id),
    getTables(wedding.id),
    getVenueElements(wedding.id),
  ])

  return (
    <SeatingManagement
      initialGuests={guests ?? []}
      initialTables={tables ?? []}
      initialVenueElements={venueElements ?? []}
      adminEmail={user.email ?? ''}
    />
  )
}
