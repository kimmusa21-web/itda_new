import { redirect, notFound } from 'next/navigation'
import { createClient }       from '@/lib/supabase/server'
import SeparationClient       from './client'

export const metadata = { title: '이직확인서' }

export default async function SeparationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  const empId = Number(params.id)
  if (isNaN(empId)) notFound()

  const { data: emp } = await supabase
    .from('employees')
    .select(`
      id, name, email, Tel, Sex, birthdate,
      department, position, Grade, job,
      Date_of_joining, quit_date, quit_reason,
      unemployment_claim, unemployment_code,
      registration_number,
      salary_type, salary_amount,
      is_contract, weekly_work_hours,
      is_active,
      companies (
        id, name, biz_number, address, telephone
      )
    `)
    .eq('id', empId)
    .maybeSingle()

  if (!emp || emp.is_active) notFound()

  return <SeparationClient employee={emp as any} />
}
