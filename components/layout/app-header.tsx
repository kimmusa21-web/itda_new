'use client'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/lib/navigation'
import { cn } from '@/lib/utils'

export default function AppHeader({ role, name }: { role: Role; name: string }) {
  const router = useRouter()
  const supabase = createClient()
  const roleBg: Record<Role, string> = {
    admin: 'bg-indigo-100 text-indigo-700',
    manager: 'bg-emerald-100 text-emerald-700',
    employee: 'bg-blue-100 text-blue-700',
  }
  const roleLabel: Record<Role, string> = { admin: '어드민', manager: '담당자', employee: '직원' }
  async function logout() { await supabase.auth.signOut(); router.push('/login') }
  return (
    <header className="lg:hidden sticky top-0 z-30 flex items-center h-14 px-4 bg-white border-b border-slate-200">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="2" rx="1" fill="white"/><rect x="1" y="7" width="10" height="2" rx="1" fill="white" opacity=".7"/><rect x="1" y="11" width="12" height="2" rx="1" fill="white" opacity=".5"/></svg>
        </div>
        <span className="text-base font-bold text-slate-900">itda</span>
      </div>
      <span className={cn('ml-2 text-xs font-medium px-2 py-0.5 rounded-full', roleBg[role])}>
        {roleLabel[role]}
      </span>
      <div className="flex-1" />
      <button onClick={logout} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
        <LogOut size={18} />
      </button>
    </header>
  )
}
