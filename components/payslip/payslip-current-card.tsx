import Link from 'next/link'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { formatMonth, formatDateDot } from '@/lib/utils'

interface Props {
  id:           number
  accrualMonth: string
  paymentDate:  string | null
  status:       'paid' | 'pending'
}

export function PayslipCurrentCard({ id, accrualMonth, paymentDate }: Props) {
  const [year, month] = accrualMonth.split('-')

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      {/* 다크 영역 — 금액 없음 */}
      <div className="bg-[#0f172a] px-5 pt-5 pb-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1.5">
              이번 달 급여
            </p>
            <p className="text-xl font-bold text-white">
              {year}년 {parseInt(month)}월
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarDays size={12} className="text-slate-500" />
          <span className="text-xs text-slate-500">
            지급일{' '}
            <span className="text-slate-400 font-medium">
              {paymentDate ? formatDateDot(paymentDate) : '—'}
            </span>
          </span>
        </div>
      </div>

      {/* CTA — 상세에서만 금액 확인 가능 */}
      <Link
        href={`/employee/payslips/${id}`}
        className="flex items-center justify-between bg-blue-600 px-5 py-4 hover:bg-blue-700 active:bg-blue-800 transition-colors group"
      >
        <div>
          <p className="text-sm font-bold text-white">명세서 상세 보기</p>
          <p className="text-[11px] text-blue-200 mt-0.5">지급·공제 항목 전체 확인</p>
        </div>
        <ArrowRight size={20} className="text-blue-300 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
      </Link>
    </div>
  )
}
