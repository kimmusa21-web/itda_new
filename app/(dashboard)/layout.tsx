import { redirect }                  from 'next/navigation'
import { createClient }              from '@/lib/supabase/server'
import AppShell                      from '@/components/layout/app-shell'
import { getImpersonationContext }   from '@/lib/impersonation/server'
import type { Role }                 from '@/types'

const VALID_ROLES: Role[] = ['admin', 'manager', 'employee']

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  /* ── 인증 확인 ── */
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  /* ── 프로필 조회 ── */
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

  /* ── 회사명 조회 (manager/employee) ── */
  let companyName: string | null = null
  if (profile.company_id) {
    const { data: co } = await supabase
      .from('companies').select('name').eq('id', profile.company_id).single()
    companyName = co?.name ?? null
  } else if (role === 'employee') {
    const { data: emp } = await supabase
      .from('employees').select('company_id').eq('user_id', user.id).eq('is_active', true).maybeSingle()
    if (emp?.company_id) {
      const { data: co } = await supabase
        .from('companies').select('name').eq('id', emp.company_id).single()
      companyName = co?.name ?? null
    }
  }

  /* ── 빙의 컨텍스트 확인 (admin 전용) ── */
  const impersonation = role === 'admin' ? getImpersonationContext() : null
  // 쿠키의 adminUserId가 현재 세션과 일치해야 유효
  const validImpersonation =
    impersonation?.adminUserId === user.id ? impersonation : null

  // 화면에 적용할 실제 역할: 빙의 중이면 대상 역할, 아니면 본인 역할
  const effectiveRole: Role = validImpersonation
    ? (validImpersonation.type === 'company_manager' ? 'manager' : 'employee')
    : role

  return (
    <AppShell
      name={name}
      role={effectiveRole}
      email={email}
      avatarColor={avatarColor}
      impersonation={validImpersonation}
      companyName={companyName}
    >
      {children}
    </AppShell>
  )
}
