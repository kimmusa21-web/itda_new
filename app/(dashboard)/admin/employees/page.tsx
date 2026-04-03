import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAllEmployees } from '@/lib/supabase/queries/employee'
import AdminEmployeesClient from './client'

export default async function AdminEmployeesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  const { data: companies } = await supabase.from('companies').select('id,name').order('name')
  const employees = await getAllEmployees()

  return <AdminEmployeesClient initialEmployees={employees} companies={companies ?? []} />
}
