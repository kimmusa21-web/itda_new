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

  const { data: policy } = await supabase
    .from('leave_policies')
    .select('*')
    .eq('company_id', emp.company_id)
    .single()

  if (!policy) return (
    <div className="card p-10 text-center text-slate-400 text-sm">
      연차 정책이 설정되지 않았습니다. 담당 매니저에게 문의해주세요.
    </div>
  )

  const year = String(new Date().getFullYear())

  // 주 기준 잔액
  const { data: primaryBalances } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('employee_id', emp.id)
    .eq('basis', policy.basis)
    .or(`period.eq.${year},period.like.${year}-%`)
    .order('period')

  // 반대 기준 (참고용)
  const altBasis = policy.basis === 'hire_date' ? 'fiscal_year' : 'hire_date'
  const { data: altBalances } = await supabase
    .from('leave_balances')
    .select('total_hours, adj_hours, used_hours')
    .eq('employee_id', emp.id)
    .eq('basis', altBasis)
    .or(`period.eq.${year},period.like.${year}-%`)

  // 신청 이력
  const { data: requests } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('employee_id', emp.id)
    .order('requested_at', { ascending: false })
    .limit(30)

  // 조정 이력
  const { data: adjustments } = await supabase
    .from('leave_adjustments')
    .select('*')
    .eq('employee_id', emp.id)
    .order('created_at', { ascending: false })

  const altTotalHours = (altBalances ?? []).reduce((s, b) => s + b.total_hours + b.adj_hours - b.used_hours, 0)

  return (
    <EmployeeLeaveClient
      employee={emp}
      policy={policy}
      balances={primaryBalances ?? []}
      altRemainingHours={altTotalHours}
      altBasis={altBasis}
      requests={requests ?? []}
      adjustments={adjustments ?? []}
    />
  )
}
