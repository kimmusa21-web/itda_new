import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/lib/navigation'

export interface CurrentUser {
  id: string
  email: string
  name: string | null
  role: Role
  companyId: number | null
  companyName?: string | null
  avatarBg: string
  avatarInitials: string
}

const ROLE_BG: Record<Role, string> = {
  admin:    '#4f46e5',
  manager:  '#0e7490',
  employee: '#1d4ed8',
}

function buildInitials(name: string | null, email: string): string {
  if (name && name.length >= 2) return name.slice(0, 2)
  return email.slice(0, 2).toUpperCase()
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, companies(name)')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const role = (profile.role ?? 'employee') as Role
  return {
    id: user.id,
    email: user.email ?? '',
    name: profile.name,
    role,
    companyId: profile.company_id,
    companyName: (profile.companies as any)?.name ?? null,
    avatarBg: ROLE_BG[role],
    avatarInitials: buildInitials(profile.name, user.email ?? ''),
  }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}

/** 서버 컴포넌트용 */
export async function getServerUser() {
  const { createClient: createServerClient } = await import('@/lib/supabase/server')
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, companies(name)')
    .eq('id', user.id)
    .single()

  return { user, profile }
}
