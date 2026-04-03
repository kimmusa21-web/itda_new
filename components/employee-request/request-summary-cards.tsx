import { Clock, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmployeeRequest, EmployeeRequestStatus } from '@/lib/mock-employee-requests'

interface Props {
  requests: EmployeeRequest[]
  activeStatus: string
  onStatusChange: (status: string) => void
}

const CARDS = [
  {
    key: 'pending'  as EmployeeRequestStatus,
    label: '승인 대기',
    icon: Clock,
    activeClass:   'bg-amber-600 text-white border-amber-600',
    inactiveClass: 'bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50/40',
    iconActive:   'text-white',
    iconInactive: 'text-amber-500',
    countActive:  'text-white',
    countInactive:'text-amber-600',
    pulse: true,
  },
  {
    key: 'approved' as EmployeeRequestStatus,
    label: '승인 완료',
    icon: CheckCircle2,
    activeClass:   'bg-emerald-600 text-white border-emerald-600',
    inactiveClass: 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40',
    iconActive:   'text-white',
    iconInactive: 'text-emerald-500',
    countActive:  'text-white',
    countInactive:'text-emerald-600',
    pulse: false,
  },
  {
    key: 'rejected' as EmployeeRequestStatus,
    label: '거절',
    icon: XCircle,
    activeClass:   'bg-red-600 text-white border-red-600',
    inactiveClass: 'bg-white border-slate-200 hover:border-red-300 hover:bg-red-50/40',
    iconActive:   'text-white',
    iconInactive: 'text-red-400',
    countActive:  'text-white',
    countInactive:'text-red-500',
    pulse: false,
  },
]

export function RequestSummaryCards({ requests, activeStatus, onStatusChange }: Props) {
  const counts = {
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {CARDS.map(card => {
        const Icon    = card.icon
        const isActive = activeStatus === card.key
        const count   = counts[card.key]
        const hasBadge = card.pulse && count > 0 && !isActive

        return (
          <button
            key={card.key}
            onClick={() => onStatusChange(card.key)}
            className={cn(
              'relative flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border transition-all text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              isActive ? card.activeClass : card.inactiveClass,
            )}
          >
            {/* 대기 건 알림 점 */}
            {hasBadge && (
              <span className="absolute top-3 right-3 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
            )}

            <Icon
              size={22}
              className={isActive ? card.iconActive : card.iconInactive}
            />

            <div>
              <p className={cn('text-2xl font-bold leading-none tabular-nums',
                isActive ? card.countActive : card.countInactive)}>
                {count}
              </p>
              <p className={cn('text-xs font-medium mt-1',
                isActive ? 'text-white/80' : 'text-slate-500')}>
                {card.label}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
