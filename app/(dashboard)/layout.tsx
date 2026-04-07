import { redirect }           from 'next/navigation'
import { createClient }       from '@/lib/supabase/server'
import AppShell               from '@/components/layout/app-shell'
import type { Role }          from '@/types'

const VALID_ROLES: Role[] = ['admin', 'manager', 'employee']

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  /* ── 인증 확인 ── */
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  /* ── 프로필 + 회사 조회 ── */
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, role, company_id, avatar_color')
    .eq('id', user.id)
    .maybeSingle()

  /* ── 프로필 없거나 role 이상 → no-access ── */
  if (!profile || !VALID_ROLES.includes(profile.role as Role)) {
    redirect('/no-access')
  }

  const role        = profile.role as Role
  const name        = profile.name  ?? profile.email ?? '사용자'
  const email       = profile.email ?? user.email   ?? ''
  const avatarColor = profile.avatar_color ?? '#1d4ed8'

  return (
    <AppShell
      name={name}
      role={role}
      email={email}
      avatarColor={avatarColor}
    >
      {children}
    </AppShell>
  )
}
