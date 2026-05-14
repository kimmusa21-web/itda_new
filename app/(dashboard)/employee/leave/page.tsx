import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveEmployeeContext } from '@/lib/impersonation/get-effective-context'
import { EmployeeLeaveClient } from './client'
import { DocumentsClient }    from '../documents/client'
import { LeaveTabs }          from './tabs'

export const metadata = { title: '연차/서류 | itda' }

export default async function EmployeeLeavePage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const empCtx = await getEffectiveEmployeeContext()
  if (!empCtx) return (
    <div className="card p-10 text-center text-slate-400 text-sm">직원 정보를 찾을 수 없습니다.</div>
  )

  const tab = searchParams.tab === 'docs' ? 'docs' : 'leave'

  /* ── 서류신청 탭 ─────────────────────────────────────────── */
  if (tab === 'docs') {
    const { data: requests } = await supabase
      .from('document_requests')
      .select('id, document_type, purpose, address, note, status, rejection_reason, requested_at, approved_at, rejected_at')
      .eq('employee_id', empCtx.employeeId)
      .order('requested_at', { ascending: false })

    return (
      <div className="space-y-4">
        <LeaveTabs activeTab="docs" />
        <DocumentsClient
          requests={requests ?? []}
          employeeName={empCtx.employeeName}
          hidePageTitle
        />
      </div>
    )
  }

  /* ── 연차 탭 (기본) ──────────────────────────────────────── */
  const { data: empDetail } = await supabase
    .from('employees')
    .select('weekly_work_hours')
    .eq('id', empCtx.employeeId)
    .single()

  const emp = {
    id:                empCtx.employeeId,
    company_id:        empCtx.companyId,
    name:              empCtx.employeeName,
    weekly_work_hours: empDetail?.weekly_work_hours ?? null,
    Date_of_joining:   empCtx.dateOfJoining,
  }

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
    <div className="space-y-4">
      <LeaveTabs activeTab="leave" />
      <EmployeeLeaveClient
        employee={emp}
        policy={policy ?? null}
        balances={balances ?? []}
        requests={requests ?? []}
        adjustments={adjustments ?? []}
      />
    </div>
  )
}
