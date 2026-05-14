'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

export function LeaveTabs({ activeTab }: { activeTab: 'leave' | 'docs' }) {
  return (
    <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
      <Link
        href="/employee/leave"
        className={cn(
          'flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors',
          activeTab === 'leave'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700',
        )}
      >
        연차
      </Link>
      <Link
        href="/employee/leave?tab=docs"
        className={cn(
          'flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors',
          activeTab === 'docs'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700',
        )}
      >
        서류신청
      </Link>
    </div>
  )
}
