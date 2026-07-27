'use server'

import {createClient} from '@/lib/supabase/server'
import {getGuests, getTables, getVenueElements} from '@/actions/seating'
import {SeatingManagement} from '@/components/admin/seating-management'
import {redirect} from 'next/navigation'

export default async function SeatingPage() {
    const supabase = await createClient()
    const {data: {user}} = await supabase.auth.getUser()

    if (!user) {
        redirect('/admin/login')
    }

    // Check if admin
    const {data: admin} = await supabase
        .from('admins')
        .select('id')
        .eq('id', user.id)
        .single()

    if (!admin) {
        redirect('/')
    }

    const [guests, tables, venueElements] = await Promise.all([
        getGuests(),
        getTables(),
        getVenueElements()
    ])



    return (
        <SeatingManagement
            initialGuests={guests || []}
            initialTables={tables || []}
            initialVenueElements={venueElements || []}
            adminEmail={user.email || ''}
        />
    )
}
