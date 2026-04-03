import { formatKRW } from '@/lib/payslip-utils'

interface TotalSummarySectionProps {
  totalEarnings: number
  totalDeductions: number
  netPay: number
}

export function TotalSummarySection({
  totalEarnings,
  totalDeductions,
  netPay,
}: TotalSummarySectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 border-l-4 border-l-slate-300">
        <h2 className="text-sm font-bold text-slate-700 tracking-wide">지급 요약</h2>
      </div>
      <div className="divide-y divide-slate-100">
        <SummaryRow label="총 지급액" value={formatKRW(totalEarnings)} valueClass="text-slate-800" />
        <SummaryRow label="총 공제액" value={`-${formatKRW(totalDeductions)}`} valueClass="text-rose-500" />
        <div className="px-5 py-4 flex items-center justify-between bg-blue-50">
          <span className="text-sm font-bold text-slate-800">실수령액</span>
          <span className="text-xl font-bold text-blue-700">{formatKRW(netPay)}</span>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="px-5 py-3.5 flex justify-between items-center">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  )
}
