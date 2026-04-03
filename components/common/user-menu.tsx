'use client'

import { useRouter } from 'next/navigation'
import { LogOut, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { mockUsers } from '@/lib/mock-data'
import type { Role } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface UserMenuProps {
  role: Role
  compact?: boolean
}

export default function UserMenu({ role, compact = false }: UserMenuProps) {
  const router = useRouter()
  const supabase = createClient()
  const user = mockUsers[role]
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (compact) {
    return (
      <button
        onClick={handleLogout}
        className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 transition-colors"
        title="로그아웃"
      >
        <LogOut size={18} className="text-slate-500" />
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
          style={{ backgroundColor: user.avatarBg }}
        >
          {user.avatarInitials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-slate-800 leading-none">{user.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
        </div>
        <ChevronDown size={14} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-20 py-1 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={15} />
              로그아웃
            </button>
          </div>
        </>
      )}
    </div>
  )
}
