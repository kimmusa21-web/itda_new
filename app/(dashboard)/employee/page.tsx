import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, CalendarDays, Briefcase, UserCircle2, ArrowRight, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveEmployeeContext } from '@/lib/impersonation/get-effective-context'
import { getEmployeePayslips } from '@/lib/employee-payslips'
import { formatAccrualMonth, formatDateDot } from '@/lib/payslip-utils'
import { formatDateShort } from '@/lib/utils'
import NoticeCard from '@/components/common/notice-card'
import { notices as mockNotices } from '@/lib/mock-data'

export default async function EmployeeDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, companies(name)').eq('id', user.id).single()

  // admin + impersonation은 허용, 그 외 employee만
  const role = profile?.role
  if (role !== 'employee' && role !== 'admin') redirect(`/${role ?? 'login'}`)

  const empCtx = await getEffectiveEmployeeContext()

  let companyName = (profile?.companies as any)?.name ?? ''
  if (empCtx?.companyId) {
    const { data: co } = await supabase
      .from('companies').select('name').eq('id', empCtx.companyId).single()
    if (co?.name) companyName = co.name
  }

  /* ── 급여 목록 ── */
  const payslips = empCtx ? await getEmployeePayslips(empCtx.employeeId) : []
  const current  = payslips[0] ?? null
  const history  = payslips.slice(1)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-slate-500">{companyName}</p>
        <h1 className="text-xl font-semibold text-slate-900 mt-0.5">내 급여</h1>
      </div>

      {/* 최신 급여 카드 */}
      {current ? (
        <div className="rounded-2xl overflow-hidden border border-slate-200">
          <div className="bg-[#0f172a] px-5 py-5">
            <p className="text-blue-300 text-xs mb-1">{formatAccrualMonth(current.accrualMonth)} 급여명세서</p>
            <p className="text-white text-3xl font-semibold tracking-tight">—</p>
            <p className="text-slate-400 text-xs mt-2">
              지급일 {current.paymentDate ? formatDateDot(current.paymentDate) : '-'}
            </p>
          </div>
          <div className="bg-white px-5 py-3">
            <Link
              href={`/employee/payslips/${current.id}`}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              명세서 상세 보기
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="card p-10 text-center text-slate-400">
          <Wallet size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-600 mb-1">아직 급여 데이터가 없습니다</p>
          <p className="text-xs text-slate-400">어드민이 급여를 업로드하면 이곳에서 확인할 수 있습니다</p>
        </div>
      )}

      {/* 지급 이력 */}
      {history.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">지급 이력</h2>
            <Link href="/employee/payslips" className="text-xs text-blue-600 hover:underline">전체 보기</Link>
          </div>
          <div className="space-y-2.5">
            {history.slice(0, 3).map(p => (
              <Link key={p.id} href={`/employee/payslips/${p.id}`}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all">
                <div>
                  <p className="text-sm font-medium text-slate-900">{formatAccrualMonth(p.accrualMonth)}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <CalendarDays size={11} className="text-slate-400" />
                    <span className="text-xs text-slate-400">
                      지급일 {p.paymentDate ? formatDateDot(p.paymentDate) : '-'}
                    </span>
                  </div>
                </div>
                <ChevronRight />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 내 정보 */}
      {empCtx && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">내 정보</h2>
            <Link href="/employee/profile" className="text-xs text-blue-600 hover:underline">상세 보기</Link>
          </div>
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold text-white bg-blue-600 flex-shrink-0">
                {empCtx.employeeName.slice(0, 2)}
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">{empCtx.employeeName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{empCtx.employeeEmail}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <InfoRow icon={Building2}    label="소속"   value={companyName} />
              <InfoRow icon={Briefcase}    label="부서"   value={empCtx.department ?? '-'} />
              <InfoRow icon={UserCircle2}  label="직위"   value={empCtx.position ?? '-'} />
              <InfoRow icon={CalendarDays} label="입사일" value={formatDateShort(empCtx.dateOfJoining)} />
            </div>
          </div>
        </section>
      )}

      {/* 공지사항 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">공지사항</h2>
        </div>
        <div className="space-y-2.5">
          {mockNotices.slice(0, 2).map(n => (
            <NoticeCard key={n.id} notice={n} />
          ))}
        </div>
      </section>
    </div>
  )
}

function ChevronRight() {
  return <ArrowRight size={15} className="text-slate-400" />
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[10px] text-slate-400 font-medium">{label}</p>
        <p className="text-sm text-slate-800 mt-0.5 font-medium">{value || '-'}</p>
      </div>
    </div>
  )
}
