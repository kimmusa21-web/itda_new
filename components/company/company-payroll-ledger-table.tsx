'use client'
/**
 * 월별 급여대장 리스트 테이블 (클릭 → 해당 월 상세 이동)
 * admin: basePath = /admin/companies/[id]/payroll
 * manager: basePath = /manager/payroll
 */
import { useRouter } from 'next/navigation'
import { ChevronRight, CreditCard } from 'lucide-react'
import type { PayrollLedgerSummary } from '@/lib/supabase/queries/company-payroll'
import { formatKRW, formatAccrualMonth, formatDateDot } from '@/lib/payslip-utils'

interface Props {
  summaries: PayrollLedgerSummary[]
  basePath: string   // e.g. "/admin/companies/3/payroll" or "/manager/payroll"
}

export function CompanyPayrollLedgerTable({ summaries, basePath }: Props) {
  const router = useRouter()

  if (summaries.length === 0) {
    return (
      <div className="card p-10 text-center">
        <CreditCard size={28} className="mx-auto mb-3 text-slate-300" />
        <p className="text-sm text-slate-400">급여 데이터가 없습니다</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      {/* ── 데스크톱 테이블 ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
              <th className="text-left px-5 py-3 font-semibold">귀속월</th>
              <th className="text-left px-5 py-3 font-semibold">지급일</th>
              <th className="text-right px-5 py-3 font-semibold">인원</th>
              <th className="text-right px-5 py-3 font-semibold">급여총액</th>
              <th className="text-right px-5 py-3 font-semibold">공제총액</th>
              <th className="text-right px-5 py-3 font-semibold">지급총액</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {summaries.map(s => (
              <tr
                key={s.accrual_month}
                className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                onClick={() => router.push(`${basePath}/${s.accrual_month}`)}
              >
                <td className="px-5 py-3.5 text-sm font-semibold text-slate-900">
                  {formatAccrualMonth(s.accrual_month)}
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-600">
                  {s.payment_date ? formatDateDot(s.payment_date) : '—'}
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-600 text-right tabular-nums">
                  {s.employee_count}명
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-700 text-right tabular-nums">
                  {formatKRW(s.total_earnings)}
                </td>
                <td className="px-5 py-3.5 text-sm text-red-500 text-right tabular-nums">
                  -{formatKRW(s.total_deductions)}
                </td>
                <td className="px-5 py-3.5 text-sm font-semibold text-emerald-600 text-right tabular-nums">
                  {formatKRW(s.net_pay)}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <ChevronRight
                    size={14}
                    className="text-slate-300 group-hover:text-blue-400 transition-colors ml-auto"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 모바일 카드 ── */}
      <div className="sm:hidden divide-y divide-slate-100">
        {summaries.map(s => (
          <button
            key={s.accrual_month}
            type="button"
            className="w-full text-left p-4 hover:bg-blue-50/50 active:bg-blue-100/50 transition-colors"
            onClick={() => router.push(`${basePath}/${s.accrual_month}`)}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-semibold text-slate-900">
                {formatAccrualMonth(s.accrual_month)}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{s.employee_count}명</span>
                {s.payment_date && (
                  <span className="text-xs text-slate-400">{formatDateDot(s.payment_date)}</span>
                )}
                <ChevronRight size={14} className="text-slate-300" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 text-center">
              <div>
                <p className="text-[10px] text-slate-400">급여총액</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5 tabular-nums">
                  {formatKRW(s.total_earnings)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">공제총액</p>
                <p className="text-xs font-medium text-red-500 mt-0.5 tabular-nums">
                  -{formatKRW(s.total_deductions)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">지급총액</p>
                <p className="text-xs font-semibold text-emerald-600 mt-0.5 tabular-nums">
                  {formatKRW(s.net_pay)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
