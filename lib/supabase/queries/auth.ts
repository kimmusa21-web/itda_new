/**
 * itda — Auth 관련 공용 쿼리
 *
 * - getCurrentUser(): 클라이언트 컴포넌트 / Hook에서 사용
 * - signOut():       클라이언트 컴포넌트에서 로그아웃
 * - getServerUser(): 서버 컴포넌트 / 서버 액션에서 사용
 *
 * 서버 컴포넌트에서는 lib/auth/get-server-profile.ts 의
 * getServerProfile() 을 우선 사용하세요 (더 풍부한 데이터 반환).
 */

import { createClient } from '@/lib/supabase/client'
import type { Role }    from '@/lib/navigation'

/* ── CurrentUser 타입 (클라이언트용) ─────────────────────────── */
export interface CurrentUser {
  id:             string
  email:          string
  name:           string | null
  role:           Role
  companyId:      number | null
  companyName:    string | null
  avatarBg:       string
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

/* ── 클라이언트용: getCurrentUser ──────────────────────────────
   브라우저 환경에서만 사용하세요.
   (use-auth.ts 훅 또는 클라이언트 컴포넌트 내부)
──────────────────────────────────────────────────────────────── */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, companies(name)')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) return null

  const role = (profile.role ?? 'employee') as Role
  return {
    id:             user.id,
    email:          profile.email ?? user.email ?? '',
    name:           profile.name,
    role,
    companyId:      profile.company_id,
    companyName:    (profile.companies as any)?.name ?? null,
    avatarBg:       profile.avatar_color ?? ROLE_BG[role],
    avatarInitials: buildInitials(profile.name, profile.email ?? user.email ?? ''),
  }
}

/* ── 로그아웃 ──────────────────────────────────────────────────
   클라이언트 컴포넌트에서 signOut() 호출 후 router.push('/login')
──────────────────────────────────────────────────────────────── */
export async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
}

/* ── 서버용: getServerUser ─────────────────────────────────────
   Server Component / Server Action에서 사용.
   단순 user+profile 반환. 더 풍부한 데이터는 getServerProfile() 사용.
──────────────────────────────────────────────────────────────── */
export async function getServerUser() {
  const { createClient: createServerClient } = await import('@/lib/supabase/server')
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { user: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, companies(name)')
    .eq('id', user.id)
    .maybeSingle()

  return { user, profile }
}
