import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getMyPayslips, mapRowToPayslip } from '@/lib/supabase/queries/payslip'
import { formatKRW, formatAccrualMonth, formatDateDot } from '@/lib/payslip-utils'

export default async function EmployeeHistoryPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rows = await getMyPayslips()
  const payslips = rows.map(mapRowToPayslip)
  const total = payslips.reduce((s, p) => s + p.netPay, 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">지급 이력</h1>
        <p className="text-sm text-slate-500 mt-0.5">월별 급여 내역을 확인하세요</p>
      </div>

      {payslips.length > 0 && (
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">총 수령액 ({payslips.length}개월)</p>
          <p className="text-2xl font-semibold text-slate-900">{formatKRW(total)}</p>
        </div>
      )}

      {payslips.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          <Wallet size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm">지급 이력이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row, i) => {
            const ps = payslips[i]
            return (
              <Link
                key={row.id}
                href={`/employee/payslips/${row.id}`}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.99]"
              >
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
      )}
    </div>
  )
}
