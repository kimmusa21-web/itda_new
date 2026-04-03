import { CheckCircle2, X } from 'lucide-react'

interface Props {
  count: number
  month: string
  onClose: () => void
}

export function UploadSuccessBanner({ count, month, onClose }: Props) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="flex items-start gap-3 bg-emerald-600 text-white rounded-2xl px-5 py-4 shadow-lg">
        <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-bold">업로드 완료!</p>
          <p className="text-xs text-emerald-200 mt-0.5">
            {month} 귀속 급여 <span className="font-bold text-white">{count}건</span>이 성공적으로 저장되었습니다.
          </p>
        </div>
        <button onClick={onClose} className="text-emerald-200 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
