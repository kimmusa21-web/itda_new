import { ChevronRight, Clock, CheckCircle2, XCircle, Building2, CalendarDays } from 'lucide-react'
import type { EmployeeRequest } from '@/lib/mock-employee-requests'
import { formatDateDot, cn } from '@/lib/utils'

interface Props {
  request: EmployeeRequest
  isSelected: boolean
  onClick: () => void
}

const STATUS_CONFIG = {
  pending: {
    label: '대기',
    icon: Clock,
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    dot:   'bg-amber-500',
    card:  'bg-amber-50/60 border-amber-300 hover:border-amber-400',
    avatar:'bg-amber-100 text-amber-800',
  },
  approved: {
    label: '승인완료',
    icon: CheckCircle2,
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot:   'bg-emerald-500',
    card:  'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70',
    avatar:'bg-emerald-100 text-emerald-700',
  },
  rejected: {
    label: '거절',
    icon: XCircle,
    badge: 'bg-red-100 text-red-700 border-red-200',
    dot:   'bg-red-500',
    card:  'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70',
    avatar:'bg-slate-100 text-slate-500',
  },
}

export function RequestListItem({ request: r, isSelected, onClick }: Props) {
  const cfg     = STATUS_CONFIG[r.status]
  const Icon    = cfg.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-2xl border p-4 transition-all duration-100 active:scale-[0.99]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        isSelected
          ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
          : cfg.card,
      )}
    >
      {/* Row 1: 아바타 + 이름 + 상태 */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
          cfg.avatar,
        )}>
          {r.name.slice(0, 1)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900">{r.name}</span>
            <span className={cn(
              'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
              cfg.badge,
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{r.email}</p>
        </div>

        <ChevronRight size={15} className="text-slate-300 flex-shrink-0 mt-0.5" />
      </div>

      {/* Row 2: 메타 정보 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 pl-[52px]">
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Building2 size={11} />
          {r.companyName}
        </span>
        <span className="text-xs text-slate-300">·</span>
        <span className="text-xs text-slate-500">
          {r.department} / {r.position}
        </span>
        <span className="text-xs text-slate-300">·</span>
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <CalendarDays size={11} />
          신청 {formatDateDot(r.createdAt.slice(0, 10))}
        </span>
      </div>
    </button>
  )
}
