'use server'
/* ================================================================
   인증 관련 서버 액션
   직원은 사번 기반 synthetic 이메일(emp{id}@itda.internal)로 Auth 계정을
   갖기 때문에, 실제 이메일로 로그인/비밀번호 재설정 시 변환이 필요하다.
================================================================ */

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { sendPasswordResetEmail } from '@/lib/email'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

/**
 * 실제 이메일로 활성 직원의 synthetic Auth 이메일 목록을 반환한다.
 * 로그인 시 real email → synthetic email 변환에 사용.
 * 한 사람이 여러 회사에 동시 재직 중이면 여러 개 반환될 수 있다.
 */
export async function resolveAuthEmailsForLogin(realEmail: string): Promise<string[]> {
  const service = getServiceClient()
  const { data } = await service
    .from('employees')
    .select('id')
    .eq('email', realEmail.trim().toLowerCase())
    .eq('is_active', true)
    .not('user_id', 'is', null)
    .order('id', { ascending: false })

  return (data ?? []).map((emp: { id: number }) => `emp${emp.id}@itda.internal`)
}

/**
 * 실제 이메일 기반으로 비밀번호 재설정 메일을 발송한다.
 * 직원이면 synthetic 이메일로 recovery link 생성 후 실제 이메일로 발송.
 * 관리자/어드민이면 Auth 이메일이 실제 이메일이므로 직접 link 생성.
 * 계정이 없어도 성공 반환(계정 존재 여부 노출 방지).
 */
export async function sendPasswordResetByRealEmail(
  realEmail: string,
): Promise<{ success: boolean; error?: string }> {
  const service = getServiceClient()
  // headers()로 실제 요청 호스트를 감지 — 로컬/프로덕션 모두 정확히 동작
  const h       = headers()
  const host    = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto   = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL?.startsWith('http') && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_APP_URL
    : `${proto}://${host}`
  const email   = realEmail.trim().toLowerCase()

  // 1. 활성 직원 중 해당 실제 이메일 소유자 탐색 (가장 최근 사번 기준)
  const { data: employees } = await service
    .from('employees')
    .select('id, name')
    .eq('email', email)
    .eq('is_active', true)
    .not('user_id', 'is', null)
    .order('id', { ascending: false })
    .limit(1)

  const emp = (employees ?? [])[0] as { id: number; name: string } | undefined

  if (emp) {
    const syntheticEmail = `emp${emp.id}@itda.internal`
    const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
      type:    'recovery',
      email:   syntheticEmail,
      options: { redirectTo: `${appUrl}/reset-password` },
    })

    if (!linkErr && linkData?.properties?.action_link) {
      return sendPasswordResetEmail(email, emp.name ?? '안녕하세요', linkData.properties.action_link)
    }
  }

  // 2. 관리자/매니저 등 실제 이메일이 Auth 이메일인 경우 시도
  const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
    type:    'recovery',
    email,
    options: { redirectTo: `${appUrl}/reset-password` },
  })

  if (!linkErr && linkData?.properties?.action_link) {
    // profiles에서 이름 조회 (없으면 기본값)
    const { data: profile } = await service
      .from('profiles')
      .select('name')
      .eq('email', email)
      .maybeSingle()

    return sendPasswordResetEmail(email, (profile as { name?: string } | null)?.name ?? '안녕하세요', linkData.properties.action_link)
  }

  // 3. 계정 없음 — 보안상 성공으로 반환 (계정 존재 여부 노출 방지)
  return { success: true }
}
