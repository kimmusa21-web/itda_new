import { formatDateDot } from '@/lib/payslip-utils'
import type { PayslipDetail } from '@/lib/mock-payslip'

interface InfoGridSectionProps {
  employee: PayslipDetail['employee']
  companyName: string
}

type InfoItem = { label: string; value: string; span?: boolean }

export function InfoGridSection({ employee, companyName }: InfoGridSectionProps) {
  const items: InfoItem[] = [
    { label: '성명',     value: employee.name },
    { label: '생년월일', value: employee.birthDateMasked },
    { label: '사원번호', value: employee.employeeNo },
    { label: '고용형태', value: employee.employmentType ?? '-' },
    { label: '부서',     value: employee.department ?? '-' },
    { label: '직위',     value: employee.position ?? '-' },
    { label: '입사일',   value: employee.joinDate ? formatDateDot(employee.joinDate) : '-' },
    { label: '퇴사일',   value: employee.quitDate ? formatDateDot(employee.quitDate) : '없음' },
    { label: '소속',     value: companyName, span: true },
  ]

  return (
    <SectionCard title="인적 사항">
      <div className="grid grid-cols-2 gap-x-4 gap-y-0 divide-y divide-slate-100">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex flex-col py-2.5 ${item.span ? 'col-span-2' : ''}`}
          >
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
              {item.label}
            </span>
            <span className="text-sm font-medium text-slate-800">{item.value}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

/* ─────────── shared SectionCard ─────────── */
export function SectionCard({
  title,
  titleRight,
  children,
  accent,
}: {
  title: string
  titleRight?: React.ReactNode
  children: React.ReactNode
  accent?: 'blue' | 'red' | 'green' | 'none'
}) {
  const borderColor =
    accent === 'blue'  ? 'border-l-blue-500' :
    accent === 'red'   ? 'border-l-red-400' :
    accent === 'green' ? 'border-l-emerald-500' :
    'border-l-slate-300'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Section title bar */}
      <div className={`flex items-center justify-between px-5 py-3.5 border-b border-slate-100 border-l-4 ${borderColor}`}>
        <h2 className="text-sm font-bold text-slate-700 tracking-wide">{title}</h2>
        {titleRight && <div>{titleRight}</div>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}
