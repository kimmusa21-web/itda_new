import { ChevronRight, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
interface PendingTask {
  urgency: 'high' | 'medium' | 'low'
  type: string
  count: number
  description: string
}

interface TaskCardProps {
  task: PendingTask
  onClick?: () => void
}

const urgencyConfig = {
  high:   { bg: 'bg-red-50',    border: 'border-red-200',    dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700',    icon: AlertCircle },
  medium: { bg: 'bg-amber-50',  border: 'border-amber-200',  dot: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700', icon: Clock },
  low:    { bg: 'bg-slate-50',  border: 'border-slate-200',  dot: 'bg-slate-400',  badge: 'bg-slate-100 text-slate-600', icon: Clock },
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const cfg = urgencyConfig[task.urgency]
  const Icon = cfg.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-all hover:shadow-sm active:scale-[0.99]',
        cfg.bg, cfg.border,
      )}
    >
      <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', cfg.dot)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-slate-900">{task.type}</span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.badge)}>
            {task.count}건
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{task.description}</p>
      </div>
      <ChevronRight size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
    </button>
  )
}
