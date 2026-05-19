'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Eye, ArrowLeft } from 'lucide-react'
import { roleNavMap, type Role } from '@/lib/navigation'
import { createClient } from '@/lib/supabase/client'
import { stopImpersonation } from '@/lib/impersonation/actions'
import { cn } from '@/lib/utils'
import type { ImpersonationContext } from '@/lib/impersonation/types'
import type { CompanyFeatures } from '@/lib/features'

interface Props {
  role:          Role
  name:          string
  email?:        string
  avatarColor?:  string
  impersonation?: ImpersonationContext | null
  companyName?:  string | null
  features?:     CompanyFeatures | null
}

export default function Sidebar({
  role,
  name,
  email       = '',
  avatarColor = '#1d4ed8',
  impersonation = null,
  companyName   = null,
  features      = null,
}: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  // manager가 /employee/* 경로에 있으면 직원 모드
  const isEmployeeMode = role === 'manager' && pathname.startsWith('/employee')
  const effectiveNavRole: Role = isEmployeeMode ? 'employee' : role
  const navItems = roleNavMap[effectiveNavRole].filter(item => {
    if (!item.featureKeys?.length) return true
    if (!features) return true
    return item.featureKeys.some(key => features[key])
  })

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

  const impersonationLabel = impersonation
    ? impersonation.type === 'company_manager'
      ? impersonation.companyName
      : `${impersonation.employeeName ?? '직원'} · ${impersonation.companyName}`
    : null

  const homeUrl: Record<Role, string> = { admin: '/admin', manager: '/manager', employee: '/employee' }

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-60 bg-[#0f172a] z-40 border-r border-[#1e293b]">

      {/* 로고 */}
      <div className="px-5 pt-6 pb-5 border-b border-[#1e293b]">
        <Link href={homeUrl[role]} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="3"  width="14" height="2" rx="1" fill="white"/>
              <rect x="1" y="7"  width="10" height="2" rx="1" fill="white" opacity=".7"/>
              <rect x="1" y="11" width="12" height="2" rx="1" fill="white" opacity=".5"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-white tracking-tight leading-tight">ModuHR</p>
            {companyName && !impersonation && (
              <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">{companyName}</p>
            )}
          </div>
        </Link>

        {/* 역할 뱃지 */}
        {impersonation ? (
          <div className="mt-3 space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300">
              <Eye size={11} />
              점검 모드
            </span>
            <p className="text-[11px] text-amber-400/80 px-1 truncate">{impersonationLabel}</p>
          </div>
        ) : (
          <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-3', roleBg[role])}>
            {roleLabel[role]}
          </span>
        )}
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

      {/* 관리자 / 직원으로서 탭 전환 (manager 전용) */}
      {role === 'manager' && !impersonation && (
        <div className="px-3 py-3 border-b border-[#1e293b]">
          <div className="flex rounded-lg bg-[#1e293b] p-0.5">
            <button
              onClick={() => router.push('/manager')}
              className={cn(
                'flex-1 py-1.5 rounded-md text-xs font-medium transition-all',
                !isEmployeeMode
                  ? 'bg-[#0f172a] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200',
              )}
            >
              관리자
            </button>
            <button
              onClick={() => router.push('/employee')}
              className={cn(
                'flex-1 py-1.5 rounded-md text-xs font-medium transition-all',
                isEmployeeMode
                  ? 'bg-[#0f172a] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200',
              )}
            >
              직원으로서
            </button>
          </div>
        </div>
      )}

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.href
            || (
              item.href !== `/${effectiveNavRole}` &&
              pathname.startsWith(item.href + '/') &&
              !navItems.some(
                other =>
                  other.href !== item.href &&
                  pathname.startsWith(other.href) &&
                  other.href.length > item.href.length,
              )
            )
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

      {/* 하단 버튼 영역 */}
      <div className="px-3 py-4 border-t border-[#1e293b] space-y-1">
        {impersonation && (
          <form action={stopImpersonation}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-amber-400 hover:bg-amber-500/10 transition-all font-medium"
            >
              <ArrowLeft size={17} />
              관리자 모드로 복귀
            </button>
          </form>
        )}

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
