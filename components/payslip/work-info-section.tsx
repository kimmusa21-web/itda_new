import { formatPeriod } from '@/lib/payslip-utils'
import { SectionCard } from './info-grid-section'
import type { PayslipDetail } from '@/lib/mock-payslip'

interface WorkInfoSectionProps {
  workInfo: PayslipDetail['workInfo']
}

export function WorkInfoSection({ workInfo }: WorkInfoSectionProps) {
  const summaryItems = [
    { label: '근무일수',     value: `${workInfo.workDays}일`, sub: `(당월 ${workInfo.totalDays}일)` },
    { label: '유급휴가',     value: workInfo.paidLeaveDays != null ? `${workInfo.paidLeaveDays}일` : '-' },
    { label: '연장근로',     value: workInfo.overtimeHours != null ? `${workInfo.overtimeHours}h` : '-' },
    { label: '야간근로',     value: workInfo.nightHours != null ? `${workInfo.nightHours}h` : '-' },
    { label: '휴일근로',     value: workInfo.holidayHours != null ? `${workInfo.holidayHours}h` : '-' },
    { label: '잔여연차',     value: workInfo.remainingLeaveHours != null ? `${workInfo.remainingLeaveHours}h` : '-' },
  ]

  return (
    <SectionCard title="근무 정보">
      {/* Period row */}
      <div className="flex items-center gap-2 mb-4 py-2.5 px-3 bg-slate-50 rounded-xl">
        <span className="text-xs font-semibold text-slate-400 shrink-0">정산기간</span>
        <span className="text-sm font-semibold text-slate-800">
          {formatPeriod(workInfo.periodStart, workInfo.periodEnd)}
        </span>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {summaryItems.map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center justify-center bg-slate-50 rounded-xl py-3 px-2 text-center"
          >
            <span className="text-lg font-bold text-slate-900 leading-none">{item.value}</span>
            {item.sub && (
              <span className="text-[9px] text-slate-400 mt-0.5">{item.sub}</span>
            )}
            <span className="text-[10px] font-medium text-slate-500 mt-1">{item.label}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
