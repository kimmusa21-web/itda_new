import { ChevronLeft } from 'lucide-react'
import { formatAccrualMonth, formatDateDot } from '@/lib/payslip-utils'
import type { PayslipDetail } from '@/lib/mock-payslip'

interface PayslipHeaderProps {
  payslip: PayslipDetail
  onBack?: () => void
}

export function PayslipHeader({ payslip, onBack }: PayslipHeaderProps) {
  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-10 print:static print:border-0">
      {/* Back navigation */}
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors -ml-1 print:hidden"
        >
          <ChevronLeft size={16} />
          {formatAccrualMonth(payslip.accrualMonth)} 지급 목록
        </button>
      </div>

      {/* Title block */}
      <div className="max-w-2xl mx-auto px-4 pb-5">
        <h1 className="text-xl font-bold text-slate-900 leading-snug">
          {payslip.employee.name}의 급여 명세서
        </h1>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-sm font-medium text-blue-600">
            {formatAccrualMonth(payslip.accrualMonth)} 지급
          </span>
          <span className="text-slate-300 text-sm">·</span>
          <span className="text-sm text-slate-500">
            지급일 {formatDateDot(payslip.paymentDate)}
          </span>
          <span className="text-slate-300 text-sm print:hidden">·</span>
          <span className="text-sm text-slate-500 print:hidden">{payslip.companyName}</span>
        </div>
      </div>
    </div>
  )
}
