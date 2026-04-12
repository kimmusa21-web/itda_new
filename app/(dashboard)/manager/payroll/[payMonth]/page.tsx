import { redirect, notFound }    from 'next/navigation'
import Link                       from 'next/link'
import { ArrowLeft, CreditCard, Users } from 'lucide-react'
import { createClient }           from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import {
  getCompanyDetail,
  getMonthlyPayrollRows,
} from '@/lib/supabase/queries/company-payroll'
import { CompanyEmployeePayrollTable } from '@/components/company/company-employee-payroll-table'
import { formatKRW, formatAccrualMonth, formatDateDot } from '@/lib/payslip-utils'

export async function generateMetadata({ params }: Props) {
  return { title: `${params.payMonth} 급여대장 | itda` }
}

interface Props {
  params: { payMonth: string }
}

export default async function ManagerPayrollMonthPage({ params }: Props) {
  const payMonth = params.payMonth

  if (!/^\d{4}-\d{2}$/.test(payMonth)) notFound()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getEffectiveManagerContext()
  if (!ctx?.companyId) redirect('/manager')

  const companyId = ctx.companyId

  const [company, rows] = await Promise.all([
    getCompanyDetail(companyId),
    getMonthlyPayrollRows(companyId, payMonth),
  ])

  if (!company) notFound()

  const totalEarnings   = rows.reduce((s, r) => s + Math.round(Number(r.total_earnings   ?? 0)), 0)
  const totalDeductions = rows.reduce((s, r) => s + Math.abs(Math.round(Number(r.total_deductions ?? 0))), 0)
  const totalNetPay     = rows.reduce((s, r) => s + Math.round(Number(r.net_pay          ?? 0)), 0)
  const paymentDate     = rows.find(r => r.payment_date)?.payment_date ?? null

  const basePath = `/manager/payroll/${payMonth}`

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/manager/payroll"
          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0"
        >
          <ArrowLeft size={15} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {formatAccrualMonth(payMonth)} 급여대장
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            <Link href="/manager/payroll" className="hover:underline">급여조회</Link>
            {' '}&rsaquo; {formatAccrualMonth(payMonth)}
          </p>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">급여대장 요약</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-4 border-b border-slate-100 mb-4">
          <InfoItem label="회사명"    value={company.name} />
          <InfoItem label="귀속월"    value={formatAccrualMonth(payMonth)} emphasis />
          <InfoItem label="지급일"    value={paymentDate ? formatDateDot(paymentDate) : '—'} />
          <InfoItem label="인원"      value={`${rows.length}명`} />
          <InfoItem label="사업자번호" value={company.biz_number ?? '—'} />
          <InfoItem label="대표자"    value={company.representative ?? '—'} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card rounded-xl">
            <p className="stat-label">급여총액</p>
            <p className="text-base font-semibold text-slate-900 mt-1 tabular-nums">
              {formatKRW(totalEarnings)}
            </p>
          </div>
          <div className="stat-card rounded-xl">
            <p className="stat-label">공제총액</p>
            <p className="text-base font-semibold text-red-500 mt-1 tabular-nums">
              -{formatKRW(totalDeductions)}
            </p>
          </div>
          <div className="stat-card rounded-xl">
            <p className="stat-label">지급총액</p>
            <p className="text-base font-semibold text-emerald-600 mt-1 tabular-nums">
              {formatKRW(totalNetPay)}
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">직원별 급여내역</h2>
          <span className="text-xs text-slate-400">· 클릭하면 명세서 상세 보기</span>
        </div>
        <CompanyEmployeePayrollTable rows={rows} basePath={basePath} />
      </section>
    </div>
  )
}

function InfoItem({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${emphasis ? 'text-blue-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  )
}
