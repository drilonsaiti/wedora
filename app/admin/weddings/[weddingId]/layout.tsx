import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Props = {
  children: ReactNode
  params: Promise<{ weddingId: string }>   // ← now a Promise
}

export default async function WeddingAdminLayout({ children, params }: Props) {
  const { weddingId } = await params        // ← unwrap it

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('no user')
    redirect('/admin/login')
  }

  const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .single()

  if (!admin) redirect('/')

  const { data: wedding, error } = await supabase
      .from('weddings')
      .select('id')
      .eq('id', weddingId)
      .single()

  if (error || !wedding) redirect('/admin/weddings')

  return (
      <>{children}</>
  )
}