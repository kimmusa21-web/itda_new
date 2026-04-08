'use server'
/* ================================================================
   itda — employee_requests Server Actions
   승인 시 employees 생성 + 인증번호 이메일 발송
================================================================ */

import { createHash, randomInt, randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { sendVerificationEmail, sendInviteEmail } from '@/lib/email'
import { notifyAllAdmins, createNotification } from '@/lib/supabase/queries/notifications'
import {
  mapRowToRequest,
  type EmployeeRequest,
  type EmployeeRequestRow,
  type EmployeeRequestStatus,
} from '@/types/employee-request'

/* ── 인증번호 유틸 ───────────────────────────────────────── */
/** 6자리 숫자 코드 생성 */
function generateOtp(): string {
  return String(randomInt(100000, 999999))
}

/** SHA-256 해시 (평문 저장 금지) */
function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

/* ── 현재 유저 프로필 ───────────────────────────────────── */
export async function getCurrentUserProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('id, email, name, role, company_id')
    .eq('id', user.id)
    .single()
  return data ?? null
}

/* ── manager 본인 신청 목록 조회 ────────────────────────── */
export async function getManagerRequests(): Promise<EmployeeRequest[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!['admin', 'manager'].includes(profile?.role ?? '')) return []

  const { data, error } = await supabase
    .from('employee_requests')
    .select('*, companies(name)')
    .eq('requested_by', user.id)
    .order('created_at', { ascending: false })

  if (error) { console.error('[getManagerRequests]', error.message); return [] }
  return (data as EmployeeRequestRow[]).map(mapRowToRequest)
}

/* ── 목록 조회 (admin용) ────────────────────────────────── */
export async function getEmployeeRequests(options?: {
  status?: EmployeeRequestStatus | 'all'
  search?: string
}): Promise<EmployeeRequest[]> {
  const supabase = createClient()

  let query = supabase
    .from('employee_requests')
    .select(`
      *,
      companies ( name ),
      requester:requested_by ( name, email )
    `)
    .order('created_at', { ascending: false })

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }
  if (options?.search?.trim()) {
    const q = options.search.trim()
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const { data, error } = await query
  if (error) { console.error('[getEmployeeRequests]', error.message); return [] }
  return (data as EmployeeRequestRow[]).map(mapRowToRequest)
}

/* ── 단건 조회 ─────────────────────────────────────────── */
async function getEmployeeRequestById(id: number) {
  const supabase = createClient()
  const { data } = await supabase
    .from('employee_requests')
    .select('*')
    .eq('id', id)
    .single()
  return data as EmployeeRequestRow | null
}

/* ── 중복 직원 확인 ────────────────────────────────────── */
async function findExistingEmployee(companyId: number, email: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('employees')
    .select('id, name, email')
    .eq('company_id', companyId)
    .ilike('email', email)
    .maybeSingle()
  return data ?? null
}

/* ── employees INSERT ──────────────────────────────────── */
async function createEmployeeFromRequest(
  req: EmployeeRequestRow,
): Promise<{ id: number; name: string } | null> {
  const supabase = createClient()

  // employees 테이블의 실제 컬럼명에 맞게 매핑
  // is_active=false: 인증 완료 후 true로 변경
  const { data, error } = await supabase
    .from('employees')
    .insert({
      company_id:       req.company_id,
      user_id:          null,
      name:             req.name,
      email:            req.email,
      birthdate:        req.birthdate,
      Tel:              req.phone,
      department:       req.department,
      position:         req.position,
      job:              req.job,
      Grade:            req.grade,
      Date_of_joining:  req.join_date,
      'Work details':   req.work_details,
      'Working place':  req.work_location,
      is_active:        false, // 인증 완료 전까지 비활성
    })
    .select('id, name')
    .single()

  if (error) {
    console.error('[createEmployeeFromRequest]', error.message)
    return null
  }
  return data
}

/* ── 인증번호 저장 ──────────────────────────────────────── */
async function saveVerificationCode(
  requestId: number,
  email: string,
  code: string,
): Promise<boolean> {
  const supabase = createClient()

  // 기존 미사용 코드 무효화
  await supabase
    .from('employee_verification_codes')
    .update({ verified_at: new Date().toISOString() })
    .eq('request_id', requestId)
    .is('verified_at', null)

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30분

  const { error } = await supabase
    .from('employee_verification_codes')
    .insert({
      request_id: requestId,
      email,
      code_hash:  hashOtp(code),
      expires_at: expiresAt.toISOString(),
    })

  if (error) {
    console.error('[saveVerificationCode]', error.message)
    return false
  }
  return true
}

/* ================================================================
   ★ 핵심 함수: 승인 + employees 생성 + 인증번호 발송

   처리 순서:
     1. employee_requests row 조회 및 상태 확인
     2. employees 중복 확인 (같은 이메일)
     3. employees INSERT (is_active=false, 인증 대기)
     4. employee_requests UPDATE (approved + employee_id 연결)
     5. 인증번호 생성 + DB 저장
     6. 인증번호 이메일 발송
     7. manager에게 승인 알림

   인증 완료 후:
     → /api/employee-verify 에서 is_active=true, user_id 연결
================================================================ */
export async function approveEmployeeRequestWithEmployeeCreate(
  requestId: number,
): Promise<{
  success:      boolean
  employeeId?:  number
  error?:       string
  isDuplicate?: boolean
}> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다' }

  /* Step 1: 신청 조회 */
  const req = await getEmployeeRequestById(requestId)
  if (!req) return { success: false, error: '신청 건을 찾을 수 없습니다' }
  if (req.status !== 'pending') {
    return {
      success: false,
      error: `이미 ${req.status === 'approved' ? '승인' : '거절'} 처리된 신청 건입니다`,
    }
  }

  /* Step 2: 중복 직원 확인 */
  const existing = await findExistingEmployee(req.company_id, req.email)
  if (existing) {
    console.warn(`[approveEmployeeRequest] 중복: ${req.email} (employeeId=${existing.id})`)
    return {
      success: false,
      isDuplicate: true,
      error: `이미 등록된 직원입니다 (이름: ${existing.name}). 직원 목록을 확인하세요.`,
    }
  }

  /* Step 3: employees INSERT */
  const newEmployee = await createEmployeeFromRequest(req)
  if (!newEmployee) {
    return { success: false, error: '직원 생성 중 오류가 발생했습니다. 다시 시도해주세요.' }
  }
  console.log(`[approveEmployeeRequest] 직원 생성: id=${newEmployee.id}, name=${newEmployee.name}`)

  /* Step 4: employee_requests 승인 */
  const { error: updateError } = await supabase
    .from('employee_requests')
    .update({
      status:        'approved',
      reviewed_by:   user.id,
      reviewed_at:   new Date().toISOString(),
      reject_reason: null,
      employee_id:   newEmployee.id,
    })
    .eq('id', requestId)

  if (updateError) {
    console.error('[approveEmployeeRequest] request 업데이트 실패:', updateError.message)
    return {
      success: false,
      error: '승인 상태 저장 중 오류가 발생했습니다. 직원은 생성되었으나 상태 반영이 필요합니다.',
    }
  }

  /* Step 5a: 초대 토큰 생성 (링크 기반, 24시간 유효) */
  const inviteToken = randomUUID()
  const inviteExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const { error: inviteInsertError } = await supabase
    .from('employee_invites')
    .insert({
      company_id:          req.company_id,
      employee_request_id: requestId,
      email:               req.email,
      name:                req.name,
      token:               inviteToken,
      expires_at:          inviteExpiresAt.toISOString(),
    })

  if (inviteInsertError) {
    console.error('[approveEmployeeRequest] 초대 토큰 저장 실패:', inviteInsertError.message)
  }

  /* Step 5b: OTP 인증번호 생성 및 저장 (기존 /auth/verify fallback 유지) */
  const otp = generateOtp()
  const saved = await saveVerificationCode(requestId, req.email, otp)
  if (!saved) {
    console.error('[approveEmployeeRequest] 인증번호 저장 실패')
  }

  /* Step 6: 초대 링크 이메일 발송 (링크 기반 — OTP 대체) */
  const { success: inviteMailOk, error: inviteMailError } = await sendInviteEmail(
    req.email,
    req.name,
    inviteToken,
    24,
  )
  if (!inviteMailOk) {
    console.error('[approveEmployeeRequest] 초대 이메일 발송 실패:', inviteMailError)
    // 이메일 실패해도 승인 성공 처리 (개발환경에서 콘솔에서 토큰 확인 가능)
  }

  /* Step 7: 요청자(manager)에게 알림 */
  if (req.requested_by) {
    try {
      await createNotification({
        userId:   req.requested_by,
        type:     'employee_request_approved',
        title:    '직원 등록 요청 승인됨',
        message:  `${req.name}의 등록 요청이 승인되었습니다. 인증 이메일이 발송되었습니다.`,
        targetId: String(requestId),
      })
    } catch (e) {
      console.error('[approveEmployeeRequest] 알림 생성 실패:', e)
    }
  }

  return { success: true, employeeId: newEmployee.id }
}

/* ── 거절 처리 ─────────────────────────────────────────── */
export async function rejectEmployeeRequest(
  requestId: number,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  if (!reason.trim()) return { success: false, error: '거절 사유를 입력해주세요' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다' }

  // 신청 조회
  const req = await getEmployeeRequestById(requestId)
  if (!req) return { success: false, error: '신청 건을 찾을 수 없습니다' }

  const { error } = await supabase
    .from('employee_requests')
    .update({
      status:        'rejected',
      reject_reason: reason.trim(),
      reviewed_by:   user.id,
      reviewed_at:   new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')

  if (error) return { success: false, error: error.message }

  // 요청자(manager)에게 반려 알림
  if (req.requested_by) {
    try {
      await createNotification({
        userId:   req.requested_by,
        type:     'employee_request_rejected',
        title:    '직원 등록 요청 반려됨',
        message:  `${req.name}의 등록 요청이 반려되었습니다. 사유: ${reason.trim()}`,
        targetId: String(requestId),
      })
    } catch (e) {
      console.error('[rejectEmployeeRequest] 알림 생성 실패:', e)
    }
  }

  return { success: true }
}

/* ── manager가 직원 등록 시 어드민에게 알림 ─────────────── */
export async function createEmployeeRegistrationRequest(
  companyId: number,
  input: {
    name: string
    email: string
    birthdate?: string
    gender?: 'male' | 'female'
    phone?: string
    department?: string
    position?: string
    job?: string
    grade?: string
    role_title?: string
    work_details?: string
    work_location?: string
    join_date?: string
    salary_type?: 'annual' | 'monthly'
    salary_amount?: number
    salary_basis?: 'gross' | 'net'
  },
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!['admin', 'manager'].includes(profile?.role ?? ''))
    return { success: false, error: '권한이 없습니다' }

  // manager는 본인 회사만 등록 가능
  if (profile?.role === 'manager' && profile.company_id !== companyId)
    return { success: false, error: '본인 회사 직원만 등록할 수 있습니다' }

  // 중복 이메일 확인 (pending 요청)
  const { data: dupReq } = await supabase
    .from('employee_requests')
    .select('id')
    .eq('email', input.email)
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .maybeSingle()
  if (dupReq) return { success: false, error: '동일한 이메일로 대기 중인 요청이 있습니다' }

  // 이미 직원으로 등록된 경우
  const { data: dupEmp } = await supabase
    .from('employees')
    .select('id')
    .eq('email', input.email)
    .eq('company_id', companyId)
    .maybeSingle()
  if (dupEmp) return { success: false, error: '이미 등록된 이메일입니다' }

  // 회사명 조회 (알림용)
  const { data: company } = await supabase
    .from('companies').select('name').eq('id', companyId).single()

  const { data: inserted, error } = await supabase
    .from('employee_requests')
    .insert({
      company_id:    companyId,
      requested_by:  user.id,
      name:          input.name,
      email:         input.email,
      birthdate:     input.birthdate || null,
      gender:        input.gender || null,
      phone:         input.phone || null,
      department:    input.department || null,
      position:      input.position || null,
      job:           input.job || null,
      grade:         input.grade || null,
      role_title:    input.role_title || null,
      work_details:  input.work_details || null,
      work_location: input.work_location || null,
      join_date:     input.join_date || null,
      salary_type:   input.salary_type || null,
      salary_amount: input.salary_amount || null,
      salary_basis:  input.salary_basis || null,
      status:        'pending',
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  // 어드민 전체에게 알림
  try {
    await notifyAllAdmins({
      type:     'new_employee_request',
      title:    '새 직원 등록 요청',
      message:  `${company?.name ?? '알 수 없는 회사'}에서 ${input.name}(${input.email}) 직원 등록 요청이 접수되었습니다.`,
      targetId: String(inserted.id),
    })
  } catch (e) {
    console.error('[createEmployeeRegistrationRequest] 알림 실패:', e)
  }

  return { success: true }
}

/* ── 초대 이메일 재발송 ─────────────────────────────────── */
/**
 * 승인 완료된 직원에게 새 초대 링크를 발송합니다.
 * - 기존 미사용 초대 토큰을 즉시 만료 처리 후 새 토큰 생성
 * - admin 전용
 */
export async function resendEmployeeInvite(
  requestId: number,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { success: false, error: '어드민 권한이 필요합니다' }

  /* 신청 조회 */
  const req = await getEmployeeRequestById(requestId)
  if (!req) return { success: false, error: '신청 건을 찾을 수 없습니다' }
  if (req.status !== 'approved') return { success: false, error: '승인 완료된 신청 건에만 재발송 가능합니다' }

  /* 이미 가입 완료된 직원인지 확인 */
  const { data: existingEmployee } = await supabase
    .from('employees')
    .select('id, user_id, is_active')
    .eq('company_id', req.company_id)
    .ilike('email', req.email)
    .maybeSingle()

  if (existingEmployee?.user_id && existingEmployee?.is_active) {
    return { success: false, error: '이미 가입이 완료된 직원입니다' }
  }

  /* 기존 미사용 초대 토큰 즉시 만료 처리 */
  await supabase
    .from('employee_invites')
    .update({ expires_at: new Date().toISOString() })
    .eq('employee_request_id', requestId)
    .is('used_at', null)

  /* 새 초대 토큰 생성 */
  const newToken = randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const { error: insertErr } = await supabase
    .from('employee_invites')
    .insert({
      company_id:          req.company_id,
      employee_request_id: requestId,
      email:               req.email,
      name:                req.name,
      token:               newToken,
      expires_at:          expiresAt.toISOString(),
    })

  if (insertErr) {
    console.error('[resendEmployeeInvite] 토큰 생성 실패:', insertErr.message)
    return { success: false, error: '초대 토큰 생성 중 오류가 발생했습니다' }
  }

  /* 이메일 발송 */
  const { success: mailOk, error: mailError } = await sendInviteEmail(
    req.email,
    req.name,
    newToken,
    24,
  )

  if (!mailOk) {
    console.error('[resendEmployeeInvite] 이메일 발송 실패:', mailError)
    return { success: false, error: '이메일 발송 중 오류가 발생했습니다' }
  }

  console.log(`[resendEmployeeInvite] 재발송 완료: ${req.email}`)
  return { success: true }
}
