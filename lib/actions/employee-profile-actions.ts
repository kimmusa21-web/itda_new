'use server'
/* ================================================================
   itda — employee 내 정보 수정 Server Action
   업데이트 대상:
     1. employees.email + employees.phone_number
     2. profiles.email
   (auth 이메일은 MVP 단계에서 생략 — 확인 메일 발송 필요)
================================================================ */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ProfileUpdateResult =
  | { success: true }
  | { success: false; error: string }

const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE    = /^[0-9\-\s+()]{0,20}$/

export async function updateEmployeeProfile(data: {
  email:        string
  phoneNumber:  string
}): Promise<ProfileUpdateResult> {
  const supabase = createClient()

  /* ── 인증 확인 ── */
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { success: false, error: '인증이 필요합니다' }

  /* ── 역할 + company_id 확인 ── */
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id, email')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'employee') {
    return { success: false, error: '권한이 없습니다' }
  }
  if (!profile.company_id) {
    return { success: false, error: '소속 회사 정보가 없습니다' }
  }

  /* ── 입력값 검증 ── */
  const email       = data.email.trim()
  const phoneNumber = data.phoneNumber.trim()

  if (!email) return { success: false, error: '이메일은 필수값입니다' }
  if (!EMAIL_RE.test(email)) return { success: false, error: '올바른 이메일 형식이 아닙니다' }
  if (phoneNumber && !PHONE_RE.test(phoneNumber)) {
    return { success: false, error: '전화번호는 숫자, -, + 만 입력 가능합니다' }
  }

  /* ── 해당 직원 확인 (company_id + 기존 email 기준) ── */
  const currentEmail = profile.email ?? user.email ?? ''
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('company_id', profile.company_id)
    .ilike('email', currentEmail)
    .eq('is_active', true)
    .maybeSingle()

  if (!emp) {
    return { success: false, error: '직원 정보를 찾을 수 없습니다' }
  }

  /* ── 1. employees 업데이트 ── */
  const { error: empErr } = await supabase
    .from('employees')
    .update({
      email:        email,
      phone_number: phoneNumber || null,
      updated_at:   new Date().toISOString(),
    })
    .eq('id', emp.id)

  if (empErr) {
    console.error('[updateEmployeeProfile] employees update error:', empErr.message)
    return { success: false, error: '직원 정보 저장 중 오류가 발생했습니다' }
  }

  /* ── 2. profiles 업데이트 ── */
  const { error: profErr } = await supabase
    .from('profiles')
    .update({ email, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (profErr) {
    console.error('[updateEmployeeProfile] profiles update error:', profErr.message)
    return { success: false, error: '프로필 정보 저장 중 오류가 발생했습니다' }
  }

  revalidatePath('/employee/profile')
  return { success: true }
}
