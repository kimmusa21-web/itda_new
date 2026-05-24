/* ================================================================
   ModuHR — impersonation 쿠키 유틸
   이 파일은 next/headers를 import하지 않으므로
   미들웨어(Edge Runtime)에서도 안전하게 import 가능
================================================================ */

import type { NextRequest } from 'next/server'
import type { ImpersonationContext } from './types'

export const IMPERSONATION_COOKIE = 'moduhr_impersonation'

/**
 * Next.js 미들웨어에서 impersonation 컨텍스트를 읽는다.
 * (미들웨어는 next/headers 대신 request.cookies를 사용)
 */
export function getImpersonationFromRequest(request: NextRequest): ImpersonationContext | null {
  try {
    const raw = request.cookies.get(IMPERSONATION_COOKIE)?.value
    if (!raw) return null
    const ctx = JSON.parse(raw) as ImpersonationContext
    if (!ctx.type || !ctx.companyId || !ctx.adminUserId) return null
    return ctx
  } catch {
    return null
  }
}
