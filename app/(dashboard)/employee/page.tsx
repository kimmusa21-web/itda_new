import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, CalendarDays, Briefcase, UserCircle2, ChevronRight, ArrowRight, Wallet } from 'lucide-react'
import { getServerUser } from '@/lib/supabase/queries/auth'
import { getMyPayslips } from '@/lib/supabase/queries/payslip'
import { mapRowToPayslip } from '@/lib/supabase/queries/payslip-shared'
import { getMyEmployee } from '@/lib/supabase/queries/employee'
import { formatKRW, formatAccrualMonth, formatDateDot } from '@/lib/payslip-utils'
import { formatDateShort } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import NoticeCard from '@/components/common/notice-card'
import { notices as mockNotices } from '@/lib/mock-data'

export default async function EmployeeDashboard() {
  const { user } = await getServerUser()
  if (!user) redirect('/login')

  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles').select('*, companies(name)').eq('id', user.id).single()
  if (profile?.role !== 'employee') redirect(`/${profile?.role ?? 'employee'}`)

  const [payRows, employee] = await Promise.all([
    getMyPayslips(),
    getMyEmployee(),
  ])

  const latest = payRows[0] ? mapRowToPayslip(payRows[0]) : null
  const history = payRows.slice(1).map(mapRowToPayslip)
  const companyName = (profile?.companies as any)?.name ?? ''

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-slate-500">{companyName}</p>
        <h1 className="text-xl font-semibold text-slate-900 mt-0.5">내 급여</h1>
      </div>

      {/* Latest payslip hero */}
      {latest ? (
        <div className="rounded-2xl overflow-hidden border border-slate-200">
          <div className="bg-[#0f172a] px-5 py-5">
            <p className="text-blue-300 text-xs mb-1">{formatAccrualMonth(latest.accrualMonth)} 급여명세서</p>
            <p className="text-white text-3xl font-semibold tracking-tight">
              {formatKRW(latest.netPay)}
            </p>
            <p className="text-slate-400 text-xs mt-2">
              지급일 {latest.paymentDate ? formatDateDot(latest.paymentDate) : '-'}
            </p>
          </div>
          <div className="bg-blue-600 px-5 py-3 flex items-center justify-between">
            <div>
              <span className="text-blue-200 text-xs">지급합계 </span>
              <span className="text-white text-sm font-medium">{formatKRW(latest.totalEarnings)}</span>
              <span className="text-blue-300 text-xs ml-3">공제 </span>
              <span className="text-blue-100 text-sm">-{formatKRW(latest.totalDeductions)}</span>
            </div>
          </div>
          <div className="bg-white px-5 py-3">
            <Link
              href={`/employee/payslips/${payRows[0].id}`}
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

      {/* History */}
      {history.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">지급 이력</h2>
            <Link href="/employee/history" className="text-xs text-blue-600 hover:underline">전체 보기</Link>
          </div>
          <div className="space-y-2.5">
            {payRows.slice(1, 4).map((row, i) => {
              const ps = history[i]
              return (
                <Link key={row.id} href={`/employee/payslips/${row.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{formatAccrualMonth(ps.accrualMonth)}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <CalendarDays size={11} className="text-slate-400" />
                      <span className="text-xs text-slate-400">
                        지급일 {ps.paymentDate ? formatDateDot(ps.paymentDate) : '-'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-slate-900">{formatKRW(ps.netPay)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">실수령액</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* My info */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">내 정보</h2>
          <Link href="/employee/profile" className="text-xs text-blue-600 hover:underline">상세 보기</Link>
        </div>
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold text-white bg-blue-600 flex-shrink-0">
              {(profile?.name ?? '?').slice(0, 2)}
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">{profile?.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <InfoRow icon={Building2}    label="소속"   value={companyName} />
            <InfoRow icon={Briefcase}    label="부서"   value={employee?.department ?? '-'} />
            <InfoRow icon={UserCircle2}  label="직위"   value={employee?.position ?? '-'} />
            <InfoRow icon={CalendarDays} label="입사일" value={formatDateShort(employee?.Date_of_joining)} />
          </div>
        </div>
      </section>

      {/* Notices (mock — 추후 DB 연동) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">공지사항</h2>
        </div>
        <div className="space-y-2.5">
          {mockNotices.slice(0, 2).map(n => (
            <NoticeCard key={n.id} notice={n} onClick={() => {}} />
          ))}
        </div>
      </section>
    </div>
  )
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
