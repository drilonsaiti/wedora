'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Guest, Table } from '@/types/seating'
import { guestSchema, tableSchema } from '@/schemas'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!admin) redirect('/admin/login')

  return { user, supabase: createServiceClient() }
}

// --- Guests ---

export async function getGuests() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('guests')
    .select('*, tables(*)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function addGuest(formData: { first_name: string; last_name: string; table_id?: string | null }) {
  const { supabase } = await requireAdmin()
  
  const parsed = guestSchema.safeParse(formData)
  if (!parsed.success) {
    throw new Error('Invalid input: ' + parsed.error.errors[0].message)
  }

  // Initials are handled by DB trigger
  const { error } = await supabase
    .from('guests')
      // @ts-ignore
    .insert([{
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      table_id: parsed.data.table_id || null,
    }])

  if (error) throw new Error(error.message)
  revalidatePath('/admin/seating')
}

export async function updateGuest(id: string, formData: { first_name: string; last_name: string; table_id?: string | null }) {
  const { supabase } = await requireAdmin()
  
  const parsed = guestSchema.safeParse(formData)
  if (!parsed.success) {
    throw new Error('Invalid input: ' + parsed.error.errors[0].message)
  }

  const { error } = await supabase
    .from('guests')
      // @ts-ignore
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      table_id: parsed.data.table_id || null
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/seating')
}

export async function deleteGuest(id: string) {
  const { supabase } = await requireAdmin()
  
  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/seating')
}

export async function assignGuestToTable(guestId: string, tableId: string | null) {
  const { supabase } = await requireAdmin()
  
  const { error } = await supabase
    .from('guests')
      // @ts-ignore
    .update({ table_id: tableId })
    .eq('id', guestId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/seating')
}

// --- Tables ---

export async function getTables() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .order('number', { ascending: true })

  if (error) throw new Error(error.message)
  return data as Table[]
}

export async function addTable(formData: { number: number; seats: number; label?: string | null }) {
  const { supabase } = await requireAdmin()
  
  const parsed = tableSchema.safeParse(formData)
  if (!parsed.success) {
    throw new Error('Invalid input: ' + parsed.error.errors[0].message)
  }

  const { error } = await supabase
    .from('tables')
      // @ts-ignore
    .insert([parsed.data])

  if (error) throw new Error(error.message)
  revalidatePath('/admin/seating')
}

export async function updateTable(id: string, formData: { number: number; seats: number; label?: string | null }) {
  const { supabase } = await requireAdmin()
  
  const parsed = tableSchema.safeParse(formData)
  if (!parsed.success) {
    throw new Error('Invalid input: ' + parsed.error.errors[0].message)
  }

  const { error } = await supabase
    .from('tables')
      // @ts-ignore
    .update(parsed.data)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/seating')
}

export async function deleteTable(id: string) {
  const { supabase } = await requireAdmin()
  
  const { error } = await supabase
    .from('tables')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/seating')
}

export async function updateTablePosition(id: string, pos_x: number, pos_y: number) {
  const { supabase } = await requireAdmin()
  
  const { error } = await supabase
    .from('tables')
      // @ts-ignore
    .update({ pos_x, pos_y })
    .eq('id', id)

  if (error) throw new Error(error.message)
  // No revalidatePath here to avoid flicker during drag
}
