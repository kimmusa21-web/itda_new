import { CalendarDays, ChevronRight } from 'lucide-react'
import type { Notice } from '@/lib/mock-data'
import { formatDateShort } from '@/lib/utils'

interface NoticeCardProps {
  notice: Notice
  onClick?: () => void
}

export default function NoticeCard({ notice, onClick }: NoticeCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.99]"
    >
      <div className="w-1 h-full min-h-[2.5rem] rounded-full bg-blue-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 leading-snug line-clamp-1">{notice.title}</p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{notice.preview}</p>
        <div className="flex items-center gap-1.5 mt-2">
          <CalendarDays size={11} className="text-slate-400" />
          <span className="text-xs text-slate-400">{formatDateShort(notice.createdAt)}</span>
          <span className="text-slate-300 text-xs">·</span>
          <span className="text-xs text-slate-400">{notice.author}</span>
        </div>
      </div>
      <ChevronRight size={15} className="text-slate-400 flex-shrink-0 mt-0.5" />
    </button>
  )
}
