import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { ManagerLeaveClient }     from './client'
import { ManagerDocumentsClient } from '../documents/client'
import { ManagerLeaveTabs }       from './tabs'

export const metadata = { title: '연차/서류 | itda' }

export default async function ManagerLeavePage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getEffectiveManagerContext()
  if (!ctx?.companyId) return (
    <div className="card p-10 text-center text-slate-400 text-sm">회사 정보가 없습니다.</div>
  )

  const tab = searchParams.tab === 'docs' ? 'docs' : 'leave'

  /* ── 서류관리 탭 ─────────────────────────────────────────── */
  if (tab === 'docs') {
    const [{ data: requests }, { data: company }] = await Promise.all([
      supabase
        .from('document_requests')
        .select(`
          id, document_type, purpose, address, note, status,
          rejection_reason, requested_at, approved_at, rejected_at,
          employees(id, name, email, department, position)
        `)
        .eq('company_id', ctx.companyId)
        .order('requested_at', { ascending: false }),
      supabase
        .from('companies')
        .select('tax_accountant_company, tax_accountant_name, tax_accountant_email')
        .eq('id', ctx.companyId)
        .single(),
    ])

    return (
      <div className="space-y-4">
        <ManagerLeaveTabs activeTab="docs" />
        <ManagerDocumentsClient
          requests={requests ?? []}
          hasTaxAccountant={!!company?.tax_accountant_email}
        />
      </div>
    )
  }

  /* ── 연차관리 탭 (기본) ──────────────────────────────────── */
  const { data: policy } = await supabase
    .from('leave_policies')
    .select('*')
    .eq('company_id', ctx.companyId)
    .single()

  if (!policy) redirect('/manager/leave/settings')

  const year  = new Date().getFullYear()
  const today = new Date().toISOString().slice(0, 10)

  const [
    { data: employees },
    { data: balances },
    { data: pendingRequests },
    { data: allRequests },
    { data: adjustments },
  ] = await Promise.all([
    supabase
      .from('employees')
      .select('id, name, department, position, Date_of_joining, weekly_work_hours')
      .eq('company_id', ctx.companyId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('leave_balances')
      .select('*')
      .eq('company_id', ctx.companyId)
      .eq('basis', policy.basis)
      .order('period'),
    supabase
      .from('leave_requests')
      .select('*, employees(id, name, department, position)')
      .eq('company_id', ctx.companyId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false }),
    supabase
      .from('leave_requests')
      .select('id, employee_id, leave_type, start_date, end_date, hours_requested, reason, status')
      .eq('company_id', ctx.companyId)
      .in('status', ['approved', 'cancelled'])
      .order('start_date', { ascending: false }),
    supabase
      .from('leave_adjustments')
      .select('*')
      .eq('company_id', ctx.companyId)
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  return (
    <div className="space-y-4">
      <ManagerLeaveTabs activeTab="leave" />
      <ManagerLeaveClient
        policy={policy}
        employees={employees ?? []}
        balances={balances ?? []}
        pendingRequests={pendingRequests ?? []}
        allRequests={allRequests ?? []}
        adjustments={adjustments ?? []}
        currentYear={year}
      />
    </div>
  )
}
