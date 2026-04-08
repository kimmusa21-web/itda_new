import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  title?:     string
  message?:   string
  onRetry?:   () => void
  className?: string
}

/**
 * 통일된 오류 상태 컴포넌트
 * 사용: <ErrorState message="데이터를 불러오지 못했습니다." onRetry={reload} />
 */
export default function ErrorState({
  title   = '오류가 발생했습니다',
  message = '잠시 후 다시 시도해 주세요.',
  onRetry,
  className,
}: Props) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <AlertTriangle size={24} className="text-red-400" />
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <RefreshCw size={14} />
          다시 시도
        </button>
      )}
    </div>
  )
}
