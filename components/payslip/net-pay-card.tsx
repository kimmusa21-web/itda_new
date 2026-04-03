import { formatKRW, formatAccrualMonth } from '@/lib/payslip-utils'

interface NetPayCardProps {
  netPay: number
  accrualMonth: string
  paymentDate: string
}

export function NetPayCard({ netPay, accrualMonth, paymentDate }: NetPayCardProps) {
  return (
    <div className="bg-[#0f172a] rounded-2xl overflow-hidden">
      {/* Top band */}
      <div className="px-5 pt-5 pb-4">
        <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">
          실수령액
        </p>
        <p className="text-4xl font-bold text-white tracking-tight leading-none">
          {formatKRW(netPay)}
        </p>
        <p className="text-sm text-slate-400 mt-2">
          {formatAccrualMonth(accrualMonth)} 급여 ·{' '}
          <span className="text-slate-300">{paymentDate.replace(/-/g, '.')} 지급</span>
        </p>
      </div>
    </div>
  )
}
