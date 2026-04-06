'use server'
/* ================================================================
   itda — employee_requests Server Actions (최종본)
   승인 시 employees 테이블 자동 생성 포함
================================================================ */

import { createClient } from '@/lib/supabase/server'
import {
  mapRowToRequest,
  type EmployeeRequest,
  type EmployeeRequestRow,
  type EmployeeRequestStatus,
} from '@/types/employee-request'

/* ── 현재 어드민 프로필 ────────────────────────────────── */
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

/* ── 목록 조회 ─────────────────────────────────────────── */
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

/* ── 중복 직원 확인 ─────────────────────────────────────── */
async function findExistingEmployee(companyId: number, email: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('employees')
    .select('id, name, email')
    .eq('company_id', companyId)
    .ilike('email', email)   // 대소문자 무관
    .maybeSingle()
  return data ?? null
}

/* ── employees INSERT ───────────────────────────────────── */
async function createEmployeeFromRequest(
  req: EmployeeRequestRow
): Promise<{ id: number; name: string } | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('employees')
    .insert({
      company_id:    req.company_id,
      user_id:       null,         // 초대 수락 전까지 null
      name:          req.name,
      email:         req.email,
      // 정규화된 컬럼명 사용 (DB 실제 컬럼)
      birthdate:     req.birthdate,
      gender:        req.gender,
      Tel:           req.phone,
      department:    req.department,
      position:      req.position,
      job_title:     req.job,       // employee_requests.job → employees.job_title
      Grade:         req.grade,
      role_title:    req.role_title,
      work_details_n: req.work_details,
      work_location: req.work_location,
      join_date:     req.join_date,
      salary_type:   req.salary_type,
      salary_amount: req.salary_amount,
      salary_basis:  req.salary_basis,
      is_active:     true,
    })
    .select('id, name')
    .single()

  if (error) {
    console.error('[createEmployeeFromRequest]', error.message)
    return null
  }
  return data
}

/* ================================================================
   ★ 핵심 함수: 승인 + employees 생성

   처리 순서:
     1. employee_requests row 조회
     2. employees 중복 확인 → 있으면 중단 (status 변경 안 함)
     3. employees INSERT
     4. employee_requests UPDATE (approved + employee_id 연결)
     5. 결과 반환

   중복 정책:
     같은 (company_id + email)이 이미 존재하면
     → employees 생성 안 함
     → employee_requests.status도 바꾸지 않음
     → "이미 등록된 직원" 에러 반환
     (어드민이 혼동 없이 상황을 인지하도록)
================================================================ */
export async function approveEmployeeRequestWithEmployeeCreate(
  requestId: number
): Promise<{
  success:     boolean
  employeeId?: number
  error?:      string
  isDuplicate?: boolean
}> {
  const supabase = createClient()

  /* ── 인증 확인 ── */
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다' }

  /* ── Step 1: 신청 조회 ── */
  const req = await getEmployeeRequestById(requestId)
  if (!req) return { success: false, error: '신청 건을 찾을 수 없습니다' }
  if (req.status !== 'pending') {
    return { success: false, error: `이미 ${req.status === 'approved' ? '승인' : '거절'} 처리된 신청 건입니다` }
  }

  /* ── Step 2: 중복 직원 확인 ── */
  const existing = await findExistingEmployee(req.company_id, req.email)
  if (existing) {
    console.warn(`[approveEmployeeRequest] 중복: ${req.email} (employeeId=${existing.id})`)
    return {
      success: false,
      isDuplicate: true,
      error: `이미 등록된 직원입니다 (이름: ${existing.name}, 이메일: ${existing.email}). 직원 목록을 확인하세요.`,
    }
  }

  /* ── Step 3: employees INSERT ── */
  const newEmployee = await createEmployeeFromRequest(req)
  if (!newEmployee) {
    return { success: false, error: '직원 생성 중 오류가 발생했습니다. 다시 시도해주세요.' }
  }

  console.log(`[approveEmployeeRequest] 직원 생성 완료: id=${newEmployee.id}, name=${newEmployee.name}`)

  /* ── Step 4: employee_requests 승인 처리 ── */
  const { error: updateError } = await supabase
    .from('employee_requests')
    .update({
      status:        'approved',
      reviewed_by:   user.id,
      reviewed_at:   new Date().toISOString(),
      reject_reason: null,
      employee_id:   newEmployee.id,   // 생성된 직원과 연결
    })
    .eq('id', requestId)

  if (updateError) {
    // employee_requests 업데이트 실패 시:
    // employees는 이미 생성됐지만 request가 pending 상태로 남음
    // → 다음 승인 시도에서 "이미 등록된 직원" 중복 체크가 잡아줌
    console.error('[approveEmployeeRequest] request 업데이트 실패:', updateError.message)
    return {
      success: false,
      error: '승인 상태 저장 중 오류가 발생했습니다. 직원은 생성되었으나 상태 반영이 필요합니다.',
    }
  }

  return { success: true, employeeId: newEmployee.id }
}

/* ── 거절 처리 (employees 생성 없음) ─────────────────────── */
export async function rejectEmployeeRequest(
  requestId: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!reason.trim()) return { success: false, error: '거절 사유를 입력해주세요' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다' }

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
  return { success: true }
}
