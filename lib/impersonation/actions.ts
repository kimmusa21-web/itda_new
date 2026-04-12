'use server'
/* ================================================================
   itda — 빙의 Server Actions
   start/stop impersonation, DB 로그 기록
   admin 전용: role !== 'admin' 이면 즉시 에러 반환
================================================================ */

import { cookies }                  from 'next/headers'
import { redirect }                 from 'next/navigation'
import { createClient }             from '@/lib/supabase/server'
import { IMPERSONATION_COOKIE }    from './cookie'
import { getImpersonationContext } from './server'
import type { ImpersonationContext } from './types'

const COOKIE_MAX_AGE = 60 * 60 * 8  // 8시간

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path:     '/',
  maxAge:   COOKIE_MAX_AGE,
} as const

/* ── 공통: admin 검증 ────────────────────────────────── */
async function assertAdmin() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('관리자만 사용할 수 있는 기능입니다')
  }

  return { supabase, user }
}

/* ── 회사 manager 모드 시작 ──────────────────────────── */
export async function startCompanyImpersonation(
  companyId:   number,
  companyName: string,
): Promise<void> {
  const { supabase, user } = await assertAdmin()

  // DB 로그 생성
  const { data: log } = await supabase
    .from('impersonation_logs')
    .insert({
      admin_user_id: user.id,
      type:          'company_manager',
      company_id:    companyId,
      company_name:  companyName,
    })
    .select('id')
    .single()

  const ctx: ImpersonationContext = {
    type:          'company_manager',
    companyId,
    companyName,
    employeeId:    null,
    employeeName:  null,
    employeeEmail: null,
    adminUserId:   user.id,
    logId:         log?.id ?? null,
    startedAt:     new Date().toISOString(),
  }

  cookies().set(IMPERSONATION_COOKIE, JSON.stringify(ctx), COOKIE_OPTIONS)
  redirect('/manager')
}

/* ── 직원 employee 모드 시작 ─────────────────────────── */
export async function startEmployeeImpersonation(
  companyId:     number,
  companyName:   string,
  employeeId:    number,
  employeeName:  string,
  employeeEmail: string,
): Promise<void> {
  const { supabase, user } = await assertAdmin()

  // DB 로그 생성
  const { data: log } = await supabase
    .from('impersonation_logs')
    .insert({
      admin_user_id:  user.id,
      type:           'employee',
      company_id:     companyId,
      company_name:   companyName,
      employee_id:    employeeId,
      employee_name:  employeeName,
      employee_email: employeeEmail,
    })
    .select('id')
    .single()

  const ctx: ImpersonationContext = {
    type:          'employee',
    companyId,
    companyName,
    employeeId,
    employeeName,
    employeeEmail,
    adminUserId:   user.id,
    logId:         log?.id ?? null,
    startedAt:     new Date().toISOString(),
  }

  cookies().set(IMPERSONATION_COOKIE, JSON.stringify(ctx), COOKIE_OPTIONS)
  redirect('/employee')
}

/* ── 빙의 종료 (관리자 모드 복귀) ───────────────────── */
export async function stopImpersonation(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 쿠키에서 logId 읽어 ended_at 업데이트
  const ctx = getImpersonationContext()
  if (user && ctx?.logId) {
    await supabase
      .from('impersonation_logs')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', ctx.logId)
      .eq('admin_user_id', user.id)
  }

  cookies().delete(IMPERSONATION_COOKIE)
  redirect('/admin')
}
