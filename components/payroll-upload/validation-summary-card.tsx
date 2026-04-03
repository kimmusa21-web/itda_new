import { CheckCircle2, XCircle, AlertTriangle, Minus } from 'lucide-react'
import type { ValidationResult } from '@/types/payroll-upload'
import { cn } from '@/lib/utils'

interface Props { result: ValidationResult }

export function ValidationSummaryCard({ result }: Props) {
  const { totalRows, validRows, ignoredRows, errorRows, canUpload } = result

  const stats = [
    { label: '전체',  value: totalRows,   icon: Minus,         color: 'text-slate-600', bg: 'bg-slate-100'   },
    { label: '정상',  value: validRows,   icon: CheckCircle2,  color: 'text-emerald-600',bg:'bg-emerald-100' },
    { label: '무시',  value: ignoredRows, icon: AlertTriangle, color: 'text-amber-600',  bg:'bg-amber-100'   },
    { label: '오류',  value: errorRows,   icon: XCircle,       color: 'text-red-600',    bg:'bg-red-100'     },
  ]

  return (
    <div className={cn('card p-5 space-y-4 border-l-4',
      canUpload ? 'border-l-emerald-500' : 'border-l-red-500')}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          {canUpload
            ? <CheckCircle2 size={15} className="text-emerald-500" />
            : <XCircle size={15} className="text-red-500" />}
          검증 결과
        </h2>
        <span className={cn('badge', canUpload ? 'badge-green' : 'badge-red')}>
          {canUpload ? '업로드 가능' : '업로드 불가'}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className={cn('rounded-xl p-3 text-center', s.bg)}>
              <Icon size={16} className={cn('mx-auto mb-1', s.color)} />
              <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
            </div>
          )
        })}
      </div>
      {!canUpload && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
          <p className="font-semibold mb-1">업로드를 진행할 수 없습니다</p>
          <p>시스템에 없는 직원 이메일이 포함되어 있거나 필수 항목 오류가 있습니다.</p>
        </div>
      )}
      {canUpload && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-700 font-medium">
          {validRows}명의 급여 데이터를 업로드할 수 있습니다
          {ignoredRows > 0 && ` (${ignoredRows}명 무시)`}
        </div>
      )}
    </div>
  )
}
