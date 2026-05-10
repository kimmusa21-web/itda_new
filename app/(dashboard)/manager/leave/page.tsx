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

  const year  = new Date().getFullYear()
  const today = new Date().toISOString().slice(0, 10)

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, department, position, Date_of_joining, weekly_work_hours')
    .eq('company_id', ctx.companyId)
    .eq('is_active', true)
    .order('name')

  // 잔액 전체 조회 (이력 포함 — 만료 필터 없음)
  const { data: balances } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('company_id', ctx.companyId)
    .eq('basis', policy.basis)
    .order('period')

  const { data: pendingRequests } = await supabase
    .from('leave_requests')
    .select('*, employees(id, name, department, position)')
    .eq('company_id', ctx.companyId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })

  // 승인·취소 신청 전체 (직원별 현황 + Excel용)
  const { data: allRequests } = await supabase
    .from('leave_requests')
    .select('id, employee_id, leave_type, start_date, end_date, hours_requested, reason, status')
    .eq('company_id', ctx.companyId)
    .in('status', ['approved', 'cancelled'])
    .order('start_date', { ascending: false })

  const { data: adjustments } = await supabase
    .from('leave_adjustments')
    .select('*')
    .eq('company_id', ctx.companyId)
    .order('created_at', { ascending: false })
    .limit(500)

  return (
    <ManagerLeaveClient
      policy={policy}
      employees={employees ?? []}
      balances={balances ?? []}
      pendingRequests={pendingRequests ?? []}
      allRequests={allRequests ?? []}
      adjustments={adjustments ?? []}
      currentYear={year}
    />
  )
}
