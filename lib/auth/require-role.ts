/**
 * itda — 서버 컴포넌트용 역할(role) 가드
 *
 * middleware가 1차 방어선이고, 이 유틸은 페이지·액션 레벨의 2차 방어선입니다.
 * 미들웨어 통과 후에도 DB role이 불일치하면 적절히 redirect합니다.
 *
 * 사용 예:
 *   const profile = await requireRole('admin')
 *   const profile = await requireRole(['admin', 'manager'])
 */

import { redirect }          from 'next/navigation'
import { getServerProfile }  from './get-server-profile'
import type { Role }         from '@/types'
import type { ServerProfile } from './get-server-profile'

/**
 * 필요 역할을 체크하고 통과 시 ServerProfile을 반환합니다.
 *
 * - 미로그인         → /login
 * - 프로필 없음      → /no-access
 * - 역할 불일치      → /{실제역할} (본인 대시보드로)
 */
export async function requireRole(allowed: Role | Role[]): Promise<ServerProfile> {
  const profile = await getServerProfile()

  if (!profile) {
    redirect('/login')
  }

  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed]

  if (!allowedRoles.includes(profile.role)) {
    // 올바른 역할을 가진 사용자가 잘못된 경로에 접근한 경우
    // → 자신의 대시보드로 안전하게 이동
    redirect(`/${profile.role}`)
  }

  return profile
}

/**
 * 로그인 여부만 확인합니다 (역할 무관).
 * 미로그인 시 /login으로 redirect.
 */
export async function requireAuth(): Promise<ServerProfile> {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  return profile
}

/**
 * 프로필 없이 간단히 로그인 확인만 할 때 사용합니다.
 * Server Action 내부에서 AuthError 반환 패턴에 사용.
 */
export async function getAuthOrNull(): Promise<ServerProfile | null> {
  return getServerProfile()
}
