'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { roleNavMap, type Role } from '@/lib/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Props {
  role:        Role
  name:        string
  email?:      string
  avatarColor?: string
}

export default function Sidebar({ role, name, email = '', avatarColor = '#1d4ed8' }: Props) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const navItems  = roleNavMap[role]

  const roleBg: Record<Role, string> = {
    admin:    'bg-indigo-900 text-indigo-200',
    manager:  'bg-emerald-900 text-emerald-200',
    employee: 'bg-blue-900 text-blue-200',
  }
  const roleLabel: Record<Role, string> = {
    admin: '시스템 관리자', manager: '기업담당자', employee: '직원',
  }

  const initials = name.length >= 2 ? name.slice(0, 2) : (email.slice(0, 2).toUpperCase() || '?')

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-60 bg-[#0f172a] z-40 border-r border-[#1e293b]">

      {/* 로고 */}
      <div className="px-5 pt-6 pb-5 border-b border-[#1e293b]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="3"  width="14" height="2" rx="1" fill="white"/>
              <rect x="1" y="7"  width="10" height="2" rx="1" fill="white" opacity=".7"/>
              <rect x="1" y="11" width="12" height="2" rx="1" fill="white" opacity=".5"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-white tracking-tight">itda</span>
        </div>
        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-3', roleBg[role])}>
          {roleLabel[role]}
        </span>
      </div>

      {/* 사용자 정보 */}
      <div className="px-4 py-4 border-b border-[#1e293b]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-[#1e293b]/50">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-100 truncate">{name}</p>
            {email && (
              <p className="text-xs text-slate-500 truncate mt-0.5">{email}</p>
            )}
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.href
            || (item.href !== `/${role}` && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                active
                  ? 'bg-[#1e293b] text-white font-medium'
                  : 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200',
              )}
            >
              <Icon size={18} className={active ? 'text-blue-400' : 'text-slate-500'} />
              {item.label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </Link>
          )
        })}
      </nav>

      {/* 로그아웃 */}
      <div className="px-3 py-4 border-t border-[#1e293b]">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-[#1e293b] hover:text-red-400 transition-all"
        >
          <LogOut size={17} />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
