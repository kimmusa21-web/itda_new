import { redirect }              from 'next/navigation'
import { Wallet }                from 'lucide-react'
import { createClient }          from '@/lib/supabase/server'
import { getCurrentEmployee, getEmployeePayslips } from '@/lib/employee-payslips'
import { PayslipCurrentCard }    from '@/components/payslip/payslip-current-card'
import { PayslipListItem }       from '@/components/payslip/payslip-list-item'

export const metadata = { title: '내 급여 | itda' }

export default async function EmployeePayslipsPage() {
  /* ── 인증 + 역할 확인 ── */
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name, companies(name)')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'employee') redirect(`/${profile?.role ?? 'admin'}`)

  const employeeName = profile?.name ?? user.email ?? ''
  const companyName  = (profile?.companies as any)?.name ?? ''

  /* ── 직원 row 조회 ── */
  const employee = await getCurrentEmployee()

  /* ── 급여 목록 조회 (금액 없음) ── */
  const payslips       = employee ? await getEmployeePayslips(employee.id) : []
  const currentPayslip = payslips[0] ?? null
  const history        = payslips.slice(1)

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-6">

        {/* 헤더 */}
        <div>
          {companyName && (
            <p className="text-xs font-semibold text-slate-400 mb-0.5">{companyName}</p>
          )}
          <h1 className="text-2xl font-bold text-slate-900">내 급여</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            명세서를 클릭하면 지급·공제 상세 내역을 확인할 수 있습니다
          </p>
        </div>

        {/* 계정 미연결 */}
        {!employee && (
          <div className="card p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Wallet size={28} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">직원 계정이 연결되지 않았습니다</p>
            <p className="text-xs text-slate-400">어드민이 초대 이메일을 발송했는지 확인하거나 관리자에게 문의하세요</p>
          </div>
        )}

        {/* 급여 없음 */}
        {employee && payslips.length === 0 && (
          <div className="card p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Wallet size={28} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">등록된 급여명세서가 없습니다</p>
            <p className="text-xs text-slate-400">급여가 등록되면 이곳에서 확인할 수 있어요</p>
          </div>
        )}

        {/* 이번 달 카드 */}
        {currentPayslip && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              최근 급여
            </h2>
            <PayslipCurrentCard
              id={currentPayslip.id}
              accrualMonth={currentPayslip.accrualMonth}
              paymentDate={currentPayslip.paymentDate}
              status={currentPayslip.status}
            />
          </section>
        )}

        {/* 과거 이력 */}
        {history.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                급여 이력
              </h2>
              <span className="text-xs text-slate-400">{history.length}개월</span>
            </div>
            <div className="space-y-2.5">
              {history.map(p => (
                <PayslipListItem
                  key={p.id}
                  id={p.id}
                  accrualMonth={p.accrualMonth}
                  paymentDate={p.paymentDate}
                  status={p.status}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
