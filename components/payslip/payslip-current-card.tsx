import Link from 'next/link'
import { ArrowRight, CalendarDays, CheckCircle2, Clock } from 'lucide-react'
import { formatMonth, formatDateDot } from '@/lib/utils'

interface Props {
  id:           number
  accrualMonth: string
  paymentDate:  string | null
  status:       'paid' | 'pending'
}

export function PayslipCurrentCard({ id, accrualMonth, paymentDate, status }: Props) {
  const isPending = status === 'pending'
  const [year, month] = accrualMonth.split('-')

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      {/* 다크 영역 — 금액 없음 */}
      <div className="bg-[#0f172a] px-5 pt-5 pb-5">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">
              이번 달 급여
            </p>
            <p className="text-xl font-bold text-white">{year}년 {parseInt(month)}월</p>
          </div>
          {isPending ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/30 flex-shrink-0">
              <Clock size={10} />지급예정
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
              <CheckCircle2 size={10} />지급완료
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <CalendarDays size={12} className="text-slate-500" />
          <span className="text-xs text-slate-500">
            {isPending ? '예정 지급일 ' : '지급일 '}
            <span className="text-slate-400 font-medium">
              {paymentDate ? formatDateDot(paymentDate) : '—'}
            </span>
          </span>
        </div>
      </div>

      {/* CTA 버튼 */}
      <Link
        href={`/employee/payslips/${id}`}
        className="flex items-center justify-between bg-blue-600 px-5 py-4 hover:bg-blue-700 active:bg-blue-800 transition-colors group"
      >
        <div>
          <p className="text-sm font-bold text-white">명세서 상세 보기</p>
          <p className="text-[11px] text-blue-200 mt-0.5">지급·공제 항목 전체 확인</p>
        </div>
        <ArrowRight
          size={20}
          className="text-blue-300 group-hover:translate-x-0.5 transition-transform flex-shrink-0"
        />
      </Link>
    </div>
  )
}
