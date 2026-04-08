import { cn } from '@/lib/utils'

interface Props {
  text?:      string
  className?: string
  size?:      'sm' | 'md' | 'lg'
}

/**
 * 통일된 로딩 상태 컴포넌트
 * 사용: <LoadingState /> 또는 <LoadingState text="데이터를 불러오는 중..." />
 */
export default function LoadingState({ text = '불러오는 중...', className, size = 'md' }: Props) {
  const spinnerSize = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-7 h-7'
  const textSize    = size === 'sm' ? 'text-xs'  : size === 'lg' ? 'text-base' : 'text-sm'
  const py          = size === 'sm' ? 'py-6'     : size === 'lg' ? 'py-16'     : 'py-12'

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', py, className)}>
      <div className={cn(spinnerSize, 'border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin')} />
      <p className={cn(textSize, 'text-slate-400')}>{text}</p>
    </div>
  )
}

/** 테이블 행 내부에서 사용하는 로딩 (colspan 버전) */
export function TableLoadingRow({ cols = 6, text = '불러오는 중...' }: { cols?: number; text?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center">
        <LoadingState text={text} />
      </td>
    </tr>
  )
}
