'use server'
/* ================================================================
   itda — 매니저 직접 초대 플로우
   기존 employee_requests 승인 플로우와 병렬 동작

   createEmployeeWithInvite: 직원 생성 + 즉시 초대 이메일 발송
   resendEmployeeInvite:     기존 직원 재초대 (토큰 갱신)
================================================================ */

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendInviteEmail } from '@/lib/email'
import { generateUniqueEmployeeNumber } from '@/lib/employee-number'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'

/* ── service_role 클라이언트 (RLS 우회) ──────────────────────── */
function createServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error('SUPABASE_SERVICE_ROLE_KEY 미설정')
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

/* ── 권한 확인 헬퍼 ──────────────────────────────────────────── */
async function requireManagerOrAdmin(companyId: number) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role ?? ''))
    return { error: '권한이 없습니다' as const }

  if (profile.role === 'manager' && profile.company_id !== companyId)
    return { error: '본인 소속 회사의 직원만 등록할 수 있습니다' as const }

  return { user, profile }
}

/* ── 입력 타입 ───────────────────────────────────────────────── */
export interface EmployeeInviteInput {
  name:           string
  email:          string
  birthdate?:     string
  gender?:        'male' | 'female'
  phone?:         string
  department?:    string
  position?:      string
  jobTitle?:      string
  grade?:         string
  job?:           string
  jobDescription?: string
  workLocation?:  string
  joinDate:       string
  salaryType?:    'annual' | 'monthly'
  salaryAmount?:  number | ''
  salaryBasis?:   'gross' | 'net'
}

/* ================================================================
   createEmployeeWithInvite
   직원 생성 → invite 토큰 생성 → 이메일 즉시 발송
================================================================ */
export async function createEmployeeWithInvite(
  input:     EmployeeInviteInput,
  companyId: number,
): Promise<{ success: boolean; error?: string }> {
  /* ── 1. 권한 확인 ────────────────────────────────────────── */
  const auth = await requireManagerOrAdmin(companyId)
  if ('error' in auth) return { success: false, error: auth.error }
  const { user } = auth

  const service = createServiceClient()

  /* ── 2. 회사 확인 ────────────────────────────────────────── */
  const { data: company } = await service
    .from('companies')
    .select('id, biz_number')
    .eq('id', companyId)
    .single()

  if (!company) return { success: false, error: '회사 정보를 찾을 수 없습니다' }

  /* ── 3. 중복 이메일 확인 ──────────────────────────────────── */
  const normalizedEmail = input.email.trim().toLowerCase()

  const { data: existing } = await service
    .from('employees')
    .select('id, is_active, user_id')
    .eq('company_id', companyId)
    .ilike('email', normalizedEmail)
    .maybeSingle()

  if (existing) {
    if (existing.is_active && existing.user_id) {
      return { success: false, error: '이미 가입 완료된 직원입니다' }
    }
    if (existing.is_active && !existing.user_id) {
      return { success: false, error: '이미 등록된 이메일입니다. 초대 재발송을 이용하세요.' }
    }
    // is_active=false (퇴사): 재등록 허용
  }

  /* ── 4. 사번 생성 ────────────────────────────────────────── */
  let employeeNumber: string | null = null
  if (company.biz_number) {
    try {
      employeeNumber = await generateUniqueEmployeeNumber(
        service,
        company.biz_number,
        input.joinDate || null,
        companyId,
      )
    } catch (e) {
      console.error('[createEmployeeWithInvite] 사번 생성 실패:', e)
    }
  }

  /* ── 5. 직원 INSERT (is_active=false, user_id=null) ──────── */
  const { data: employee, error: empError } = await service
    .from('employees')
    .insert({
      company_id:       companyId,
      user_id:          null,
      name:             input.name.trim(),
      email:            normalizedEmail,
      birthdate:        input.birthdate    || null,
      Sex:              input.gender === 'male' ? 'M' : input.gender === 'female' ? 'F' : null,
      Tel:              input.phone        || null,
      department:       input.department   || null,
      position:         input.position     || null,
      job:              input.job          || null,
      Grade:            input.grade        || null,
      Date_of_joining:  input.joinDate     || null,
      'Work details':   input.jobDescription || null,
      'Working place':  input.workLocation || null,
      employee_number:  employeeNumber,
      is_active:        false,
    })
    .select('id, name, email')
    .single()

  if (empError || !employee) {
    console.error('[createEmployeeWithInvite] employees INSERT 실패:', empError?.message)
    return { success: false, error: empError?.message ?? '직원 등록에 실패했습니다' }
  }

  /* ── 6. invite 토큰 생성 ─────────────────────────────────── */
  const token     = randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const { error: inviteError } = await service
    .from('employee_invites')
    .insert({
      company_id:   companyId,
      employee_id:  employee.id,
      email:        normalizedEmail,
      name:         employee.name,
      token,
      expires_at:   expiresAt.toISOString(),
      invited_by:   user.id,
    })

  if (inviteError) {
    // 롤백: 방금 생성한 employees 행 삭제
    await service.from('employees').delete().eq('id', employee.id)
    console.error('[createEmployeeWithInvite] employee_invites INSERT 실패:', inviteError.message)
    return { success: false, error: '초대 토큰 생성에 실패했습니다' }
  }

  /* ── 7. 초대 이메일 발송 ─────────────────────────────────── */
  const emailResult = await sendInviteEmail(normalizedEmail, employee.name, token)
  if (!emailResult.success) {
    // 이메일 실패는 경고만 — 토큰이 살아 있으므로 재발송 가능
    console.warn('[createEmployeeWithInvite] 이메일 발송 실패 (재발송 가능):', emailResult.error)
  }

  revalidatePath('/manager/employees')
  revalidatePath('/admin/employees')

  return { success: true }
}

/* ================================================================
   resendEmployeeInvite
   기존 직원의 미사용 토큰을 만료 처리하고 새 초대 발송
================================================================ */
export async function resendEmployeeInvite(
  employeeId: number,
  companyId:  number,
): Promise<{ success: boolean; error?: string }> {
  /* ── 1. 권한 확인 ────────────────────────────────────────── */
  const auth = await requireManagerOrAdmin(companyId)
  if ('error' in auth) return { success: false, error: auth.error }
  const { user } = auth

  const service = createServiceClient()

  /* ── 2. 직원 확인 ────────────────────────────────────────── */
  const { data: emp } = await service
    .from('employees')
    .select('id, name, email, user_id, is_active')
    .eq('id', employeeId)
    .eq('company_id', companyId)
    .single()

  if (!emp)                        return { success: false, error: '직원을 찾을 수 없습니다' }
  if (emp.user_id && emp.is_active) return { success: false, error: '이미 가입 완료된 직원입니다' }

  /* ── 3. 기존 미사용 토큰 만료 처리 ──────────────────────── */
  await service
    .from('employee_invites')
    .update({ used_at: new Date().toISOString() })
    .eq('employee_id', employeeId)
    .is('used_at', null)

  /* ── 4. 새 토큰 생성 ─────────────────────────────────────── */
  const token     = randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const { error: inviteError } = await service
    .from('employee_invites')
    .insert({
      company_id:   companyId,
      employee_id:  employeeId,
      email:        emp.email,
      name:         emp.name,
      token,
      expires_at:   expiresAt.toISOString(),
      invited_by:   user.id,
    })

  if (inviteError) {
    console.error('[resendEmployeeInvite] 토큰 생성 실패:', inviteError.message)
    return { success: false, error: '초대 토큰 생성 실패' }
  }

  /* ── 5. 이메일 발송 ──────────────────────────────────────── */
  const emailResult = await sendInviteEmail(emp.email, emp.name, token)
  if (!emailResult.success) {
    return { success: false, error: `이메일 발송 실패: ${emailResult.error}` }
  }

  revalidatePath('/manager/employees')
  revalidatePath('/admin/employees')

  return { success: true }
}
