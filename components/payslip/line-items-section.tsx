import { formatKRW } from '@/lib/payslip-utils'
import { SectionCard } from './info-grid-section'
import { cn } from '@/lib/utils'
import type { EarningItem, DeductionItem } from '@/lib/mock-payslip'

/* ─── Earnings ─────────────────────────────────────── */
interface EarningsSectionProps {
  items: EarningItem[]
  total: number
  showZero?: boolean
}

export function EarningsSection({ items, total, showZero = true }: EarningsSectionProps) {
  const visible = showZero ? items : items.filter((i) => i.amount !== 0)

  return (
    <SectionCard
      title="지급 내역"
      accent="blue"
      titleRight={
        <span className="text-xs text-slate-400">
          {visible.length}/{items.length}개 항목
        </span>
      }
    >
      <div className="space-y-0 divide-y divide-slate-50">
        {visible.map((item) => (
          <LineRow
            key={item.key}
            label={item.label}
            amount={item.amount}
            dimZero={item.amount === 0}
          />
        ))}
      </div>

      {/* Total */}
      <div className="mt-3 pt-3 border-t-2 border-slate-200 flex justify-between items-center">
        <span className="text-sm font-bold text-slate-700">지급 합계</span>
        <span className="text-base font-bold text-blue-600">{formatKRW(total)}</span>
      </div>
    </SectionCard>
  )
}

/* ─── Deductions ────────────────────────────────────── */
interface DeductionsSectionProps {
  items: DeductionItem[]
  total: number
  showZero?: boolean
}

export function DeductionsSection({ items, total, showZero = true }: DeductionsSectionProps) {
  const visible = showZero ? items : items.filter((i) => i.amount !== 0)

  return (
    <SectionCard
      title="공제 내역"
      accent="red"
      titleRight={
        <span className="text-xs text-slate-400">
          {visible.length}/{items.length}개 항목
        </span>
      }
    >
      <div className="space-y-0 divide-y divide-slate-50">
        {visible.map((item) => (
          <LineRow
            key={item.key}
            label={item.label}
            amount={item.amount}
            deduction
            dimZero={item.amount === 0}
          />
        ))}
      </div>

      {/* Total */}
      <div className="mt-3 pt-3 border-t-2 border-slate-200 flex justify-between items-center">
        <span className="text-sm font-bold text-slate-700">공제 합계</span>
        <span className="text-base font-bold text-red-500">-{formatKRW(total)}</span>
      </div>
    </SectionCard>
  )
}

/* ─── Shared row component ──────────────────────────── */
function LineRow({
  label,
  amount,
  deduction = false,
  dimZero = false,
}: {
  label: string
  amount: number
  deduction?: boolean
  dimZero?: boolean
}) {
  const isZero    = amount === 0
  const isRefund  = amount < 0   // 환급은 네거티브

  const amountText = isRefund
    ? formatKRW(amount)           // "-51,635원" 이미 포함
    : deduction && !isZero
    ? `-${formatKRW(amount)}`
    : formatKRW(amount)

  return (
    <div className={cn('flex justify-between items-center py-2.5', dimZero && 'opacity-40')}>
      <span className="text-sm text-slate-600">{label}</span>
      <span
        className={cn(
          'text-sm font-medium tabular-nums',
          isZero
            ? 'text-slate-400'
            : deduction || isRefund
            ? 'text-rose-600'
            : 'text-slate-900',
        )}
      >
        {amountText}
      </span>
    </div>
  )
}
