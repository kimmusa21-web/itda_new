import { redirect, notFound }    from 'next/navigation'
import Link                       from 'next/link'
import { ArrowLeft, Users, CreditCard } from 'lucide-react'
import { createClient }           from '@/lib/supabase/server'
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
  params: { id: string; payMonth: string }
}

function parseAmt(val: string | null | undefined): number {
  if (!val) return 0
  const n = parseInt(String(val).replace(/[,\s]/g, ''), 10)
  return isNaN(n) ? 0 : Math.abs(n)
}

export default async function AdminPayrollMonthPage({ params }: Props) {
  const companyId = Number(params.id)
  const payMonth  = params.payMonth   // 'YYYY-MM'

  if (isNaN(companyId) || !/^\d{4}-\d{2}$/.test(payMonth)) notFound()

  /* ── 인증 + 역할 ── */
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  /* ── 데이터 병렬 조회 ── */
  const [company, rows] = await Promise.all([
    getCompanyDetail(companyId),
    getMonthlyPayrollRows(companyId, payMonth),
  ])

  if (!company) notFound()

  /* ── 집계 ── */
  const totalEarnings   = rows.reduce((s, r) => s + parseAmt(r.Total_payment),   0)
  const totalDeductions = rows.reduce((s, r) => s + parseAmt(r.Total_deductible), 0)
  const totalNetPay     = rows.reduce((s, r) => s + parseAmt(r.net_pay),          0)
  const employeeCount   = rows.length

  // 대표 지급일 (rows 중 첫 번째)
  const paymentDate = rows.find(r => r.payment_date)?.payment_date ?? null

  const basePath = `/admin/companies/${companyId}/payroll/${payMonth}`

  return (
    <div className="space-y-6">

      {/* ── 상단 헤더 (breadcrumb) ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/companies/${companyId}`}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0"
            title="회사 상세로"
          >
            <ArrowLeft size={15} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {formatAccrualMonth(payMonth)} 급여대장
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              <Link href="/admin/companies" className="hover:underline">기업관리</Link>
              {' '}&rsaquo;{' '}
              <Link href={`/admin/companies/${companyId}`} className="hover:underline">{company.name}</Link>
              {' '}&rsaquo; {formatAccrualMonth(payMonth)}
            </p>
          </div>
        </div>
      </div>

      {/* ── 상단 요약 카드 ── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">급여대장 요약</h2>
        </div>

        {/* 회사 기본 정보 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-4 border-b border-slate-100 mb-4">
          <InfoItem label="회사명"    value={company.name} />
          <InfoItem label="사업자번호" value={company.biz_number ?? '—'} />
          <InfoItem label="대표자"    value={company.representative ?? '—'} />
          <InfoItem label="귀속월"    value={formatAccrualMonth(payMonth)} emphasis />
          <InfoItem label="지급일"    value={paymentDate ? formatDateDot(paymentDate) : '—'} />
          <InfoItem label="인원"      value={`${employeeCount}명`} />
        </div>

        {/* 금액 요약 */}
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

      {/* ── 직원별 급여내역 ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">직원별 급여내역</h2>
          <span className="text-xs text-slate-400">· 클릭하면 명세서 상세 보기</span>
        </div>
        <CompanyEmployeePayrollTable
          rows={rows}
          basePath={basePath}
        />
      </section>

    </div>
  )
}

/* ── 서브 컴포넌트 ── */
function InfoItem({
  label, value, emphasis,
}: {
  label: string; value: string; emphasis?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${emphasis ? 'text-blue-700' : 'text-slate-800'}`}>
        {value}
      </p>
    </div>
  )
}
