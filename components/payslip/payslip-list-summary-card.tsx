import Link from 'next/link'
import { ArrowRight, CalendarDays, TrendingUp } from 'lucide-react'
import { formatKRW, formatAccrualMonth, formatDateDot } from '@/lib/payslip-utils'

interface PayslipListItem {
  id: string
  accrualMonth: string
  paymentDate: string
  status: 'paid' | 'pending'
  netPay: number
  totalEarnings: number
  totalDeductions: number
}

interface Props {
  item: PayslipListItem
  href?: string
}

export function PayslipListSummaryCard({ item, href }: Props) {
  const dest = href ?? `/employee/payslips/${item.id}`
  const isPending = item.status === 'pending'

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Dark header */}
      <div className="bg-[#0f172a] px-5 pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-widest">
              {isPending ? '이번 달 급여 (지급예정)' : '이번 달 급여'}
            </p>
            <p className="text-[32px] font-bold text-white tracking-tight leading-none mt-2">
              {formatKRW(item.netPay)}
            </p>
          </div>
          <div className="flex-shrink-0 w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
            <TrendingUp size={18} className="text-blue-400" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-3">
          <CalendarDays size={12} className="text-slate-500" />
          <span className="text-xs text-slate-400">
            {formatAccrualMonth(item.accrualMonth)} ·{' '}
            {isPending ? `${formatDateDot(item.paymentDate)} 지급예정` : `${formatDateDot(item.paymentDate)} 지급`}
          </span>
        </div>
      </div>

      {/* Blue sub-bar: breakdown */}
      <div className="bg-blue-600 px-5 py-2.5 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-blue-200">지급합계</span>
          <span className="text-xs font-semibold text-white tabular-nums">
            {formatKRW(item.totalEarnings)}
          </span>
        </div>
        <span className="text-blue-400 text-xs">·</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-blue-200">공제합계</span>
          <span className="text-xs font-semibold text-blue-100 tabular-nums">
            -{formatKRW(item.totalDeductions)}
          </span>
        </div>
      </div>

      {/* White CTA */}
      <div className="bg-white px-5 py-3.5">
        <Link
          href={dest}
          className="group inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          명세서 상세 보기
          <ArrowRight
            size={15}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </Link>
      </div>
    </div>
  )
}
