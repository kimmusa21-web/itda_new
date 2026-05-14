'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

export function ManagerLeaveTabs({ activeTab }: { activeTab: 'leave' | 'docs' }) {
  return (
    <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
      <Link
        href="/manager/leave"
        className={cn(
          'flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors',
          activeTab === 'leave'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700',
        )}
      >
        연차관리
      </Link>
      <Link
        href="/manager/leave?tab=docs"
        className={cn(
          'flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors',
          activeTab === 'docs'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700',
        )}
      >
        서류관리
      </Link>
    </div>
  )
}
