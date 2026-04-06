import Link from 'next/link'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { formatKRW, formatMonth, formatDateShort } from '@/lib/utils'

interface Payslip {
  month: string
  netPay: number
  paymentDate: string
  totalPay: number
  totalDeduction: number
}

interface PayslipSummaryCardProps {
  payslip: Payslip
  isLatest?: boolean
  onClick?: () => void
}

export default function PayslipSummaryCard({ payslip, isLatest = false, onClick }: PayslipSummaryCardProps) {
  if (isLatest) {
    return (
      <div className="rounded-2xl overflow-hidden border border-slate-200">
        <div className="bg-[#0f172a] px-5 py-5">
          <p className="text-blue-300 text-xs mb-1">{formatMonth(payslip.month)} 급여명세서</p>
          <p className="text-white text-3xl font-semibold tracking-tight">
            {formatKRW(payslip.netPay)}
          </p>
          <p className="text-slate-400 text-xs mt-2">
            지급일 {formatDateShort(payslip.paymentDate)}
          </p>
        </div>
        <div className="bg-blue-600 px-5 py-3 flex items-center justify-between">
          <div>
            <span className="text-blue-200 text-xs">지급합계 </span>
            <span className="text-white text-sm font-medium">{formatKRW(payslip.totalPay)}</span>
            <span className="text-blue-300 text-xs ml-3">공제 </span>
            <span className="text-blue-100 text-sm">-{formatKRW(payslip.totalDeduction)}</span>
          </div>
        </div>
        <div className="bg-white px-5 py-3">
          <button
            onClick={onClick}
            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            명세서 상세 보기
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.99]"
    >
      <div>
        <p className="text-sm font-medium text-slate-900">{formatMonth(payslip.month)}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <CalendarDays size={11} className="text-slate-400" />
          <span className="text-xs text-slate-400">지급일 {formatDateShort(payslip.paymentDate)}</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-base font-semibold text-slate-900">{formatKRW(payslip.netPay)}</p>
        <p className="text-xs text-slate-400 mt-0.5">실수령액</p>
      </div>
    </button>
  )
}
