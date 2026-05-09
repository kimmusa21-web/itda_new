import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmployeeLeaveClient } from './client'

export const metadata = { title: '연차관리 | itda' }

export default async function EmployeeLeavePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: emp } = await supabase
    .from('employees')
    .select('id, company_id, name, weekly_work_hours, Date_of_joining')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!emp) return (
    <div className="card p-10 text-center text-slate-400 text-sm">직원 정보를 찾을 수 없습니다.</div>
  )

  const [
    { data: policy },
    { data: balances },
    { data: requests },
    { data: adjustments },
  ] = await Promise.all([
    supabase.from('leave_policies').select('*').eq('company_id', emp.company_id).maybeSingle(),
    supabase.from('leave_balances').select('*').eq('employee_id', emp.id).order('period'),
    supabase.from('leave_requests').select('*').eq('employee_id', emp.id).order('start_date', { ascending: false }),
    supabase.from('leave_adjustments').select('*').eq('employee_id', emp.id).order('created_at', { ascending: false }),
  ])

  return (
    <EmployeeLeaveClient
      employee={emp}
      policy={policy ?? null}
      balances={balances ?? []}
      requests={requests ?? []}
      adjustments={adjustments ?? []}
    />
  )
}
