import { PayslipListItem } from './payslip-list-item'

interface HistoryItem {
  id: number
  accrualMonth: string
  paymentDate: string | null
  status: 'paid' | 'pending'
}

interface PayslipHistorySectionProps {
  items: HistoryItem[]
}

export function PayslipHistorySection({ items }: PayslipHistorySectionProps) {
  if (items.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-700">급여 이력</h2>
        <span className="text-xs text-slate-400">{items.length}개월</span>
      </div>
      <div className="space-y-2.5">
        {items.map(item => (
          <PayslipListItem key={item.id} {...item} />
        ))}
      </div>
    </section>
  )
}
