/**
 * ModuHR — 서버 컴포넌트/액션용 프로필 조회 유틸
 *
 * 사용 위치: Server Component, Server Action, Route Handler
 * (클라이언트 컴포넌트에서는 hooks/use-auth.ts 사용)
 */

import { createClient } from '@/lib/supabase/server'
import type { Role }    from '@/types'

export interface ServerProfile {
  userId:      string
  email:       string
  name:        string | null
  role:        Role
  companyId:   number | null
  companyName: string | null
  avatarColor: string
}

/**
 * 현재 로그인 사용자의 프로필을 서버에서 조회합니다.
 *
 * @returns ServerProfile | null (미로그인 또는 프로필 없음)
 */
export async function getServerProfile(): Promise<ServerProfile | null> {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, role, company_id, avatar_color, companies(name)')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) return null

  const role = profile.role as Role
  if (!['admin', 'manager', 'employee'].includes(role)) return null

  return {
    userId:      user.id,
    email:       profile.email ?? user.email ?? '',
    name:        profile.name ?? null,
    role,
    companyId:   profile.company_id ?? null,
    companyName: (profile.companies as any)?.name ?? null,
    avatarColor: profile.avatar_color ?? '#1d4ed8',
  }
}
