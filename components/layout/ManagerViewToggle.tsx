'use client'

import { useRouter } from 'next/navigation'
import { LayoutDashboard, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  currentMode: 'manager' | 'employee'
}

export function ManagerViewToggle({ currentMode }: Props) {
  const router = useRouter()

  return (
    <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
      <button
        onClick={() => router.push('/manager')}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all',
          currentMode === 'manager'
            ? 'bg-[#003366] text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700',
        )}
      >
        <LayoutDashboard size={14} />
        관리자 화면
      </button>
      <button
        onClick={() => router.push('/employee')}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all',
          currentMode === 'employee'
            ? 'bg-[#003366] text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700',
        )}
      >
        <User size={14} />
        직원 화면
      </button>
    </div>
  )
}
