import { CalendarDays, ChevronRight } from 'lucide-react'
import type { MockEmployee } from '@/lib/mock-data'
import { formatDateShort, cn } from '@/lib/utils'

interface EmployeeCardProps {
  employee: MockEmployee
  onClick?: () => void
  showCompany?: boolean
}

export default function EmployeeCard({ employee, onClick, showCompany = false }: EmployeeCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.99]"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
        style={{ backgroundColor: employee.avatarBg }}
      >
        {employee.avatarInitials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900">{employee.name}</span>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              employee.status === 'active'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-500',
            )}
          >
            {employee.status === 'active' ? '재직' : '퇴사'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {showCompany && (
            <>
              <span className="text-xs text-slate-500">{employee.company}</span>
              <span className="text-slate-300 text-xs">·</span>
            </>
          )}
          <span className="text-xs text-slate-500">{employee.department}</span>
          <span className="text-slate-300 text-xs">·</span>
          <span className="text-xs text-slate-500">{employee.position}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <CalendarDays size={11} className="text-slate-400" />
          <span className="text-xs text-slate-400">{formatDateShort(employee.joinDate)} 입사</span>
        </div>
      </div>
      <ChevronRight size={15} className="text-slate-400 flex-shrink-0" />
    </button>
  )
}
