import { AlertTriangle, XCircle } from 'lucide-react'
import type { ValidationError } from '@/types/payroll-upload'
import { cn } from '@/lib/utils'

interface Props { errors: ValidationError[] }

export function ValidationErrorList({ errors }: Props) {
  if (!errors.length) return null
  const errs  = errors.filter(e => e.severity === 'error')
  const warns = errors.filter(e => e.severity === 'warning')

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-700">오류 상세</h2>
        <div className="flex gap-2">
          {errs.length  > 0 && <span className="badge badge-red">{errs.length}건 오류</span>}
          {warns.length > 0 && <span className="badge badge-yellow">{warns.length}건 경고</span>}
        </div>
      </div>
      <div className="divide-y divide-slate-50 max-h-52 overflow-y-auto">
        {errors.map((err, i) => (
          <div key={i} className={cn('flex items-start gap-3 px-5 py-3',
            err.severity === 'error' ? 'bg-red-50/40' : 'bg-amber-50/30')}>
            {err.severity === 'error'
              ? <XCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
              : <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">{err.rowIndex}행</span>
                {err.email && <span className="text-xs font-mono text-slate-500 truncate">{err.email}</span>}
              </div>
              <p className={cn('text-xs mt-0.5', err.severity === 'error' ? 'text-red-600' : 'text-amber-700')}>{err.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
