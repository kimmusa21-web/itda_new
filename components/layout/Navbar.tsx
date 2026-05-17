'use client'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/types'

interface NavItem { href: string; label: string; icon: React.ReactNode }

const adminNav: NavItem[] = [
  { href: '/admin', label: '대시보드', icon: <HomeIcon /> },
  { href: '/admin/requests', label: '기업신청', icon: <BuildingIcon /> },
  { href: '/admin/companies', label: '기업관리', icon: <OfficeBuildingIcon /> },
  { href: '/admin/employees', label: '직원관리', icon: <UsersIcon /> },
  { href: '/admin/payroll', label: '급여조회', icon: <DocumentIcon /> },
  { href: '/admin/payroll/upload', label: '급여업로드', icon: <UploadIcon /> },
  { href: '/admin/settings', label: '설정', icon: <SettingsIcon /> },
]

const managerNav: NavItem[] = [
  { href: '/manager', label: '대시보드', icon: <HomeIcon /> },
  { href: '/manager/employees', label: '직원관리', icon: <UsersIcon /> },
  { href: '/manager/payroll', label: '급여조회', icon: <DocumentIcon /> },
]

const employeeNav: NavItem[] = [
  { href: '/employee', label: '급여명세서', icon: <DocumentIcon /> },
  { href: '/employee/history', label: '지급이력', icon: <ClockIcon /> },
]

export default function Navbar({ role, name }: { role: Role; name: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const nav = role === 'admin' ? adminNav : role === 'manager' ? managerNav : employeeNav
  const roleLabel = role === 'admin' ? '어드민' : role === 'manager' ? '기업담당자' : '직원'
  const roleBg = role === 'admin' ? 'bg-purple-100 text-purple-700' : role === 'manager' ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-700'

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* 데스크탑 사이드바 */}
      <aside className="hidden md:flex flex-col w-56 min-h-dvh bg-white border-r border-gray-100 py-6 px-3 fixed left-0 top-0">
        <div className="px-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900">급여관리</span>
          </div>
        </div>

        <div className="px-3 mb-5">
          <span className={`badge text-xs ${roleBg}`}>{roleLabel}</span>
          <p className="text-sm font-medium text-gray-800 mt-1.5 truncate">{name}</p>
        </div>

        <nav className="flex-1 space-y-0.5">
          {nav.map(item => {
            const active = pathname === item.href
            return (
              <a key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors
                  ${active ? 'bg-brand-50 text-brand-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <span className="w-4 h-4">{item.icon}</span>
                {item.label}
              </a>
            )
          })}
        </nav>

        <button onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-500 hover:text-red-500 transition-colors mt-2">
          <LogoutIcon />
          로그아웃
        </button>
      </aside>

      {/* 모바일 상단 헤더 */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-50 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm font-bold">급여관리</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge text-xs ${roleBg}`}>{roleLabel}</span>
          <button onClick={logout} className="p-1.5 text-gray-400 hover:text-red-500">
            <LogoutIcon />
          </button>
        </div>
      </header>

      {/* 모바일 하단 탭 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-bottom">
        <div className="flex">
          {nav.map(item => {
            const active = pathname === item.href
            return (
              <a key={item.href} href={item.href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors
                  ${active ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}>
                <span className="w-5 h-5">{item.icon}</span>
                {item.label}
              </a>
            )
          })}
        </div>
      </nav>
    </>
  )
}

// ── 아이콘 ──────────────────────────────────────────────────────
function HomeIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
}
function DocumentIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
}
function UsersIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
}
function UploadIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
}
function BuildingIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
}
function OfficeBuildingIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
}
function ClockIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
}
function LogoutIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
}
function SettingsIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
}
