'use client'
import Sidebar      from './sidebar'
import BottomTabBar from './bottom-tab-bar'
import AppHeader    from './app-header'
import type { Role } from '@/types'

interface Props {
  children:     React.ReactNode
  name?:        string
  role:         Role         // DB에서 확인된 실제 역할
  email?:       string
  avatarColor?: string
}

export default function AppShell({
  children,
  name        = '사용자',
  role,
  email       = '',
  avatarColor = '#1d4ed8',
}: Props) {
  return (
    <div className="flex min-h-dvh bg-slate-50">
      <Sidebar
        role={role}
        name={name}
        email={email}
        avatarColor={avatarColor}
      />
      <div className="flex-1 flex flex-col min-h-dvh lg:ml-60">
        <AppHeader role={role} name={name} />
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
