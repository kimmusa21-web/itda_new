import { CheckCircle2, XCircle, AlertTriangle, Minus } from 'lucide-react'
import type { ValidationResult } from '@/types/payroll-upload'
import { cn } from '@/lib/utils'

interface Props { result: ValidationResult }

export function ValidationSummaryCard({ result: r }: Props) {
  return (
    <div className={cn('card p-5 space-y-4 border-l-4',
      r.canUpload ? 'border-l-emerald-500' : 'border-l-red-500')}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          {r.canUpload
            ? <CheckCircle2 size={15} className="text-emerald-500" />
            : <XCircle size={15} className="text-red-500" />}
          검증 결과
        </h2>
        <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full',
          r.canUpload ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
          {r.canUpload ? '업로드 가능' : '업로드 불가'}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: '전체',  value: r.totalRows,   icon: Minus,         color: 'text-slate-600 bg-slate-100' },
          { label: '정상',  value: r.validRows,   icon: CheckCircle2,  color: 'text-emerald-700 bg-emerald-100' },
          { label: '무시',  value: r.ignoredRows, icon: AlertTriangle, color: 'text-amber-700 bg-amber-100' },
          { label: '오류',  value: r.errorRows,   icon: XCircle,       color: 'text-red-700 bg-red-100' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={cn('rounded-xl p-3 text-center', color.split(' ')[1])}>
            <Icon size={16} className={cn('mx-auto mb-1', color.split(' ')[0])} />
            <p className={cn('text-xl font-bold', color.split(' ')[0])}>{value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {!r.canUpload ? (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
          시스템에 없는 직원 이메일이 포함되어 있거나 필수 항목 오류가 있습니다.<br />
          직원 목록을 먼저 확인하고 재시도하세요.
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-700 font-medium">
          {r.validRows}명의 급여 데이터를 업로드할 수 있습니다
          {r.ignoredRows > 0 && ` (${r.ignoredRows}명은 다른 회사 직원으로 무시됩니다)`}
        </div>
      )}
    </div>
  )
}
