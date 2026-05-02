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
  salaryType?:      'annual' | 'monthly' | 'hourly'
  salaryAmount?:    number | ''
  salaryBasis?:     'gross' | 'net'
  nonTaxableItems?: { name: string; amount: number }[]
  taxableTotal?:    number
  isContract?:      boolean
  contractEndDate?: string
  weeklyWorkHours?: number | null
  isForeigner?:        boolean
  nationality?:        string
  visaType?:           string
  registrationNumber?: string
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
    .select('id, biz_number, name')
    .eq('id', companyId)
    .single()

  if (!company) return { success: false, error: '회사 정보를 찾을 수 없습니다' }
  const companyName = (company as { id: number; biz_number: string | null; name: string }).name ?? '회사'

  /* ── 3. 중복 이메일 확인 ──────────────────────────────────── */
  const normalizedEmail = input.email.trim().toLowerCase()

  // 재직 중인 직원 확인 (is_active=true) — 퇴사자는 허용
  const { data: activeEmployee } = await service
    .from('employees')
    .select('id')
    .eq('company_id', companyId)
    .ilike('email', normalizedEmail)
    .eq('is_active', true)
    .maybeSingle()

  if (activeEmployee) {
    return { success: false, error: '이미 재직 중인 직원입니다' }
  }

  // 초대 발송됐으나 미가입(user_id=null) 확인 — 재발송 유도
  const { data: pendingEmployee } = await service
    .from('employees')
    .select('id')
    .eq('company_id', companyId)
    .ilike('email', normalizedEmail)
    .is('user_id', null)
    .maybeSingle()

  if (pendingEmployee) {
    return { success: false, error: '이미 초대가 발송된 이메일입니다. 초대 재발송을 이용하세요.' }
  }
  // 퇴사자(is_active=false, user_id 있음)는 재입사 허용 → 신규 레코드 생성

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

  /* ── 5. 직원 INSERT (재입사자도 항상 신규 레코드, 이전 퇴사 이력 보존) ── */
  const employeePayload = {
    user_id:          null,
    name:             input.name.trim(),
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
    employee_number:   employeeNumber,
    is_active:         false,
    is_contract:       input.isContract ?? false,
    contract_end_date: input.contractEndDate || null,
    weekly_work_hours: input.weeklyWorkHours ?? null,
    is_foreigner:        input.isForeigner ?? false,
    nationality:         input.nationality || null,
    visa_type:           input.visaType || null,
    registration_number: input.registrationNumber || null,
    salary_type:         input.salaryType || null,
    salary_amount:       input.salaryAmount || null,
    salary_basis:        input.salaryBasis || null,
    non_taxable_items:   input.nonTaxableItems?.length ? input.nonTaxableItems : null,
    taxable_total:       input.taxableTotal ?? null,
  }

  let employee: { id: number; name: string; email: string } | null = null
  let empError: { message: string } | null = null

  const { data, error } = await service
    .from('employees')
    .insert({ company_id: companyId, email: normalizedEmail, ...employeePayload })
    .select('id, name, email')
    .single()
  employee = data
  empError = error

  if (empError || !employee) {
    console.error('[createEmployeeWithInvite] employees 저장 실패:', empError?.message)
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
    console.error('[createEmployeeWithInvite] 이메일 발송 실패:', emailResult.error)
    return { success: false, error: `직원은 등록됐으나 초대 이메일 발송에 실패했습니다: ${emailResult.error}` }
  }

  revalidatePath('/manager/employees')
  revalidatePath('/admin/employees')

  /* ── 8. 어드민 알림 생성 ────────────────────────────────────── */
  try {
    const { data: admins } = await service
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      await service.from('notifications').insert(
        admins.map((a: { id: string }) => ({
          user_id:   a.id,
          type:      'new_employee_registered',
          title:     '신규 직원 등록',
          message:   `[${companyName}] ${employee.name}(${normalizedEmail}) 님이 등록되었습니다.`,
          target_id: String(employee.id),
          is_read:   false,
        }))
      )
    }
  } catch (e) {
    console.warn('[createEmployeeWithInvite] 어드민 알림 생성 실패:', e)
  }

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
