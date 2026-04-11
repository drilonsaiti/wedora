import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin — Wedding Photos',
  robots: 'noindex, nofollow',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
