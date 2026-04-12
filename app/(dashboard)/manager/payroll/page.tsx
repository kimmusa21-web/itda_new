import { getEffectiveManagerContext }         from '@/lib/impersonation/get-effective-context'
import { getCompanyPayrollV2, getAvailableMonthsV2 } from '@/lib/supabase/queries/payslip-v2'
import ManagerPayrollClient                  from './client'

export default async function ManagerPayrollPage() {
  const ctx = await getEffectiveManagerContext()

  if (!ctx?.companyId) return (
    <div className="card p-10 text-center text-slate-400 text-sm">회사 정보가 없습니다</div>
  )

  const { companyId, companyName } = ctx

  const months      = await getAvailableMonthsV2(companyId)
  const latestMonth = months[0] ?? ''
  const rows        = latestMonth ? await getCompanyPayrollV2(companyId, latestMonth) : []

  return (
    <ManagerPayrollClient
      companyId={companyId}
      companyName={companyName}
      initialMonths={months}
      initialMonth={latestMonth}
      initialRows={rows}
    />
  )
}
