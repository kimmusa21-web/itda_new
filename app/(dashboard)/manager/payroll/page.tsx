import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyPayroll, getAvailableMonths } from '@/lib/supabase/queries/payslip'
import { mapRowToPayslip } from '@/lib/supabase/queries/payslip-shared'
import ManagerPayrollClient from './client'

export default async function ManagerPayrollPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role,company_id,companies(name)').eq('id', user.id).single()
  if (!['admin','manager'].includes(profile?.role ?? '')) redirect('/employee')

  const companyId = profile?.company_id
  if (!companyId) return (
    <div className="card p-10 text-center text-slate-400 text-sm">회사 정보가 없습니다</div>
  )

  const months = await getAvailableMonths(companyId)
  const latestMonth = months[0] ?? ''
  const rows = latestMonth ? await getCompanyPayroll(companyId, latestMonth) : []

  return (
    <ManagerPayrollClient
      companyId={companyId}
      companyName={(profile?.companies as any)?.name ?? ''}
      initialMonths={months}
      initialMonth={latestMonth}
      initialRows={rows}
    />
  )
}
