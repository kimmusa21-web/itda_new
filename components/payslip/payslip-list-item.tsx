import Link from 'next/link'
import { ChevronRight, CalendarDays } from 'lucide-react'
import { formatDateDot, cn } from '@/lib/utils'

interface Props {
  id:           number
  accrualMonth: string
  paymentDate:  string | null
  status:       'paid' | 'pending'
}

export function PayslipListItem({ id, accrualMonth, paymentDate }: Props) {
  const [year, month] = accrualMonth.split('-')

  return (
    <Link
      href={`/employee/payslips/${id}`}
      className={cn(
        'flex items-center gap-3 px-4 py-4 rounded-2xl border bg-white',
        'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70',
        'active:scale-[0.99] transition-all duration-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
      )}
    >
      {/* 월 뱃지 */}
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex flex-col items-center justify-center">
        <span className="text-[9px] font-semibold text-slate-400 leading-none">{year.slice(2)}년</span>
        <span className="text-xl font-extrabold text-slate-800 leading-tight tabular-nums">{parseInt(month)}</span>
        <span className="text-[9px] font-semibold text-slate-400 leading-none">월</span>
      </div>

      {/* 정보 — 금액 없음 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-slate-900">
            {year}년 {parseInt(month)}월
          </span>
        </div>
        <div className="flex items-center gap-1">
          <CalendarDays size={10} className="text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-400">
            지급일{' '}
            <span className="font-medium">{paymentDate ? formatDateDot(paymentDate) : '—'}</span>
          </span>
        </div>
      </div>

      <ChevronRight size={18} className="text-slate-300 flex-shrink-0" />
    </Link>
  )
}
