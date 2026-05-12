'use client'
import Sidebar                from './sidebar'
import BottomTabBar           from './bottom-tab-bar'
import AppHeader              from './app-header'
import { ImpersonationBanner } from '@/components/impersonation/impersonation-banner'
import type { Role }          from '@/types'
import type { ImpersonationContext } from '@/lib/impersonation/types'

interface Props {
  children:        React.ReactNode
  name?:           string
  role:            Role
  email?:          string
  avatarColor?:    string
  impersonation?:  ImpersonationContext | null
  companyName?:    string | null
}

export default function AppShell({
  children,
  name        = '사용자',
  role,
  email       = '',
  avatarColor = '#1d4ed8',
  impersonation = null,
  companyName   = null,
}: Props) {
  return (
    <div className="flex min-h-dvh bg-slate-50">
      <Sidebar
        role={role}
        name={name}
        email={email}
        avatarColor={avatarColor}
        impersonation={impersonation}
        companyName={companyName}
      />
      <div className="flex-1 flex flex-col min-h-dvh lg:ml-60">
        <AppHeader role={role} name={name} companyName={companyName} />
        {/* 빙의 배너 — 점검 모드일 때만 표시 */}
        {impersonation && <ImpersonationBanner ctx={impersonation} />}
        <main className="flex-1 overflow-y-auto">
          <div
            className="max-w-5xl mx-auto px-4 py-6"
            style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom,0px))' }}
          >
            {children}
          </div>
        </main>
        <BottomTabBar role={role} />
      </div>
    </div>
  )
}
