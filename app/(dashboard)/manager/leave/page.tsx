import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { ManagerLeaveClient } from './client'

export const metadata = { title: '연차관리 | itda' }

export default async function ManagerLeavePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getEffectiveManagerContext()
  if (!ctx?.companyId) return (
    <div className="card p-10 text-center text-slate-400 text-sm">회사 정보가 없습니다.</div>
  )

  const { data: policy } = await supabase
    .from('leave_policies')
    .select('*')
    .eq('company_id', ctx.companyId)
    .single()

  if (!policy) redirect('/manager/leave/settings')

  const year = String(new Date().getFullYear())

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, department, position, Date_of_joining, weekly_work_hours')
    .eq('company_id', ctx.companyId)
    .eq('is_active', true)
    .order('name')

  const { data: balances } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('company_id', ctx.companyId)
    .eq('basis', policy.basis)
    .or(`period.eq.${year},period.like.${year}-%`)

  const { data: pendingRequests } = await supabase
    .from('leave_requests')
    .select('*, employees(id, name, department, position)')
    .eq('company_id', ctx.companyId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })

  const { data: adjustments } = await supabase
    .from('leave_adjustments')
    .select('*')
    .eq('company_id', ctx.companyId)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <ManagerLeaveClient
      policy={policy}
      employees={employees ?? []}
      balances={balances ?? []}
      pendingRequests={pendingRequests ?? []}
      adjustments={adjustments ?? []}
      currentYear={parseInt(year)}
    />
  )
}
