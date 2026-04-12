/* ================================================================
   itda — impersonation 서버 전용 유틸
   next/headers를 사용하므로 Server Component / Server Action 전용.
   미들웨어에서는 절대 import 금지 (Edge Runtime 에러 발생).
================================================================ */

import { cookies } from 'next/headers'
import { IMPERSONATION_COOKIE } from './cookie'
import type { ImpersonationContext } from './types'

/**
 * Server Component / Server Action에서 impersonation 컨텍스트를 읽는다.
 * 파싱 실패 또는 필수 필드 누락 시 null 반환.
 */
export function getImpersonationContext(): ImpersonationContext | null {
  try {
    const raw = cookies().get(IMPERSONATION_COOKIE)?.value
    if (!raw) return null
    const ctx = JSON.parse(raw) as ImpersonationContext
    if (!ctx.type || !ctx.companyId || !ctx.adminUserId) return null
    return ctx
  } catch {
    return null
  }
}
