import { redirect, notFound }    from 'next/navigation'
import Link                       from 'next/link'
import { ArrowLeft }              from 'lucide-react'
import { createClient }           from '@/lib/supabase/server'
import {
  getCompanyDetail,
  getEmployeePayslipForAdmin,
} from '@/lib/supabase/queries/company-payroll'
import { mapRowToPayslip }        from '@/lib/supabase/queries/payslip-shared'
import { PayslipInlineDetail }    from '@/components/payslip/payslip-inline-detail'
import { formatAccrualMonth }     from '@/lib/payslip-utils'

export async function generateMetadata() {
  return { title: '급여명세서 | itda' }
}

interface Props {
  params: { payMonth: string; employeeId: string }
}

export default async function ManagerEmployeePayslipPage({ params }: Props) {
  const payMonth   = params.payMonth
  const employeeId = Number(params.employeeId)

  if (isNaN(employeeId) || !/^\d{4}-\d{2}$/.test(payMonth)) notFound()

  /* ── 인증 + 역할 ── */
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, company_id').eq('id', user.id).single()

  if (profile?.role !== 'manager') redirect(`/${profile?.role ?? 'employee'}`)

  const companyId = profile?.company_id as number | null
  if (!companyId) redirect('/manager')

  /* ── 데이터 조회 ── */
  const [company, payInfoRow] = await Promise.all([
    getCompanyDetail(companyId),
    getEmployeePayslipForAdmin(companyId, payMonth, employeeId),
  ])

  if (!company || !payInfoRow) notFound()

  const payslip = mapRowToPayslip(payInfoRow)
  const empName = (payInfoRow.employees as { name?: string } | null)?.name ?? ''

  return (
    <div className="space-y-5 max-w-lg mx-auto">

      {/* ── breadcrumb 헤더 ── */}
      <div className="flex items-center gap-3">
        <Link
          href={`/manager/payroll/${payMonth}`}
          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0"
        >
          <ArrowLeft size={15} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            {empName} · 급여명세서
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            <Link href="/manager/payroll" className="hover:underline">급여조회</Link>
            {' '}&rsaquo;{' '}
            <Link href={`/manager/payroll/${payMonth}`} className="hover:underline">
              {formatAccrualMonth(payMonth)}
            </Link>
            {' '}&rsaquo; {empName}
          </p>
        </div>
      </div>

      {/* ── 기존 급여명세서 UI 재사용 ── */}
      <PayslipInlineDetail payslip={payslip} />

      <Link
        href={`/manager/payroll/${payMonth}`}
        className="btn-secondary w-full block text-center"
      >
        ← 급여대장 목록으로
      </Link>

    </div>
  )
}
