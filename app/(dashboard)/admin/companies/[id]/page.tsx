import { redirect, notFound }     from 'next/navigation'
import Link                        from 'next/link'
import { Building2, Users, Edit2, ArrowLeft, CreditCard, FileText } from 'lucide-react'
import { createClient }            from '@/lib/supabase/server'
import { StartCompanyImpersonationButton } from '@/components/impersonation/start-impersonation-button'
import {
  getCompanyDetail,
  getCompanyPayrollLedgerSummaries,
  getCompanyEmployees,
} from '@/lib/supabase/queries/company-payroll'
import { CompanyPayrollLedgerTable } from '@/components/company/company-payroll-ledger-table'
import { CompanyEmployeeList }       from '@/components/company/company-employee-list'
import { PayslipNoteEditor }         from '@/components/company/payslip-note-editor'
import { cn }                        from '@/lib/utils'

export async function generateMetadata({ params }: Props) {
  return { title: '기업 상세 | itda' }
}

interface Props {
  params: { id: string }
}

export default async function AdminCompanyDetailPage({ params }: Props) {
  const id = Number(params.id)
  if (isNaN(id)) notFound()

  /* ── 인증 + 역할 ── */
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  /* ── 데이터 병렬 조회 ── */
  const [company, payrollSummaries, employees] = await Promise.all([
    getCompanyDetail(id),
    getCompanyPayrollLedgerSummaries(id),
    getCompanyEmployees(id),
  ])

  if (!company) notFound()

  const activeCount = employees.filter(e => e.is_active).length
  const totalCount  = employees.length

  return (
    <div className="space-y-6">

      {/* ── 상단 헤더 ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/companies"
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0"
            title="기업관리 목록으로"
          >
            <ArrowLeft size={15} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{company.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              기업관리 &rsaquo; 상세
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StartCompanyImpersonationButton
            companyId={id}
            companyName={company.name}
          />
          <Link
            href={`/admin/companies/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <Edit2 size={13} />
            정보 수정
          </Link>
        </div>
      </div>

      {/* ── 회사 요약 카드 ── */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Building2 size={22} className="text-slate-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">{company.name}</h2>
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5',
              company.status === 'active'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-500',
            )}>
              {company.status === 'active' ? '운영중' : '비활성'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <SummaryField label="사업자번호" value={company.biz_number ?? '—'} />
          <SummaryField label="대표자"     value={company.representative ?? '—'} />
          <SummaryField
            label="재직 직원"
            value={`${activeCount}명`}
            sub={totalCount !== activeCount ? `(전체 ${totalCount}명)` : undefined}
          />
          <SummaryField
            label="매월 급여일"
            value={company.payroll_day ? `매월 ${company.payroll_day}일` : '—'}
          />
        </div>
      </div>

      {/* ── 월별 급여대장 ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">월별 급여대장</h2>
          <span className="text-xs text-slate-400">· 최근순 · 클릭하면 상세 조회</span>
        </div>
        <CompanyPayrollLedgerTable
          summaries={payrollSummaries}
          basePath={`/admin/companies/${id}/payroll`}
        />
      </section>

      {/* ── 직원 목록 ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">직원 목록</h2>
          <span className="text-xs text-slate-400">· {totalCount}명</span>
        </div>
        <CompanyEmployeeList
          initialEmployees={employees}
          companyId={id}
          companyName={company.name}
        />
      </section>

      {/* ── 급여명세서 산출 근거 ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">급여명세서 산출 근거</h2>
        </div>
        <div className="card p-5">
          <PayslipNoteEditor
            initialNote={company.payslip_note}
            companyId={id}
          />
        </div>
      </section>

    </div>
  )
}

/* ── 서브 컴포넌트 ── */
function SummaryField({
  label, value, sub,
}: {
  label: string; value: string; sub?: string
}) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-800">
        {value}
        {sub && <span className="text-xs text-slate-400 font-normal ml-1">{sub}</span>}
      </p>
    </div>
  )
}
