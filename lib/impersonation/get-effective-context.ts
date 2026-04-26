/* ================================================================
   itda — 빙의 유효 컨텍스트 헬퍼

   manager/employee 페이지에서 "실제 사용자" vs "빙의 대상" 중
   어느 쪽의 데이터를 써야 하는지 단일 함수로 판단한다.

   - admin + impersonation cookie  → 빙의 대상의 context 반환
   - 실제 manager / employee       → 본인 context 반환
================================================================ */

import { createClient }          from '@/lib/supabase/server'
import { getImpersonationContext } from './server'

/* ── manager 컨텍스트 ─────────────────────────────────── */

export interface ManagerContext {
  companyId:       number
  companyName:     string
  isImpersonating: boolean
}

/**
 * 현재 요청의 "유효 회사 컨텍스트"를 반환한다.
 * - admin + company_manager impersonation → 빙의 대상 회사
 * - admin/manager 본인                   → profile.company_id
 * - company_id 없음 / 권한 없음           → null
 */
export async function getEffectiveManagerContext(): Promise<ManagerContext | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const impersonation = getImpersonationContext()

  // admin이 company_manager 모드로 빙의 중 — adminUserId 검증 필수
  if (
    impersonation?.type === 'company_manager' &&
    impersonation.adminUserId === user.id
  ) {
    return {
      companyId:       impersonation.companyId,
      companyName:     impersonation.companyName,
      isImpersonating: true,
    }
  }

  // 실제 manager(또는 company_id가 있는 admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id, companies(name)')
    .eq('id', user.id)
    .single()

  if (!['admin', 'manager'].includes(profile?.role ?? '')) return null
  if (!profile?.company_id) return null

  return {
    companyId:       profile.company_id,
    companyName:     (profile.companies as { name?: string } | null)?.name ?? '',
    isImpersonating: false,
  }
}

/* ── employee 컨텍스트 ────────────────────────────────── */

export interface EmployeeContext {
  employeeId:      number
  employeeName:    string
  employeeEmail:   string
  employeeNumber:  string | null
  companyId:       number
  department:      string | null
  position:        string | null
  dateOfJoining:   string | null
  birthdate:       string | null
  phone:           string | null
  gender:          string | null
  grade:           string | null
  roleTitle:       string | null
  job:             string | null
  workLocation:    string | null
  isImpersonating: boolean
}

/**
 * 현재 요청의 "유효 직원 컨텍스트"를 반환한다.
 * - admin + employee impersonation → 빙의 대상 직원
 * - 실제 employee                 → user_id 또는 email 매칭 직원
 * - 매칭 없음 / 권한 없음          → null
 */
export async function getEffectiveEmployeeContext(): Promise<EmployeeContext | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const impersonation = getImpersonationContext()

  // admin이 employee 모드로 빙의 중
  if (
    impersonation?.type === 'employee' &&
    impersonation.adminUserId === user.id &&
    impersonation.employeeId != null
  ) {
    const { data: emp } = await supabase
      .from('employees')
      .select('id, name, email, employee_number, company_id, department, position, Date_of_joining, birthdate, Tel, Sex, Grade, Role, job, "Working place"')
      .eq('id', impersonation.employeeId)
      .single()

    if (!emp) return null

    return {
      employeeId:     emp.id,
      employeeName:   emp.name,
      employeeEmail:  emp.email,
      employeeNumber: emp.employee_number ?? null,
      companyId:      emp.company_id,
      department:     emp.department,
      position:       emp.position,
      dateOfJoining:  emp.Date_of_joining,
      birthdate:      emp.birthdate,
      phone:          (emp as Record<string, unknown>).Tel as string | null ?? null,
      gender:         (emp as Record<string, unknown>).Sex as string | null ?? null,
      grade:          (emp as Record<string, unknown>).Grade as string | null ?? null,
      roleTitle:      (emp as Record<string, unknown>).Role as string | null ?? null,
      job:            (emp as Record<string, unknown>).job as string | null ?? null,
      workLocation:   (emp as Record<string, unknown>)['Working place'] as string | null ?? null,
      isImpersonating: true,
    }
  }

  // 실제 employee: 1순위 user_id, 2순위 email 매칭
  const { data: byUid } = await supabase
    .from('employees')
    .select('id, name, email, employee_number, company_id, department, position, Date_of_joining, birthdate, Tel, Sex, Grade, Role, job, "Working place"')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (byUid) {
    return {
      employeeId:     byUid.id,
      employeeName:   byUid.name,
      employeeEmail:  byUid.email,
      employeeNumber: byUid.employee_number ?? null,
      companyId:      byUid.company_id,
      department:     byUid.department,
      position:       byUid.position,
      dateOfJoining:  byUid.Date_of_joining,
      birthdate:      byUid.birthdate,
      phone:          (byUid as Record<string, unknown>).Tel as string | null ?? null,
      gender:         (byUid as Record<string, unknown>).Sex as string | null ?? null,
      grade:          (byUid as Record<string, unknown>).Grade as string | null ?? null,
      roleTitle:      (byUid as Record<string, unknown>).Role as string | null ?? null,
      job:            (byUid as Record<string, unknown>).job as string | null ?? null,
      workLocation:   (byUid as Record<string, unknown>)['Working place'] as string | null ?? null,
      isImpersonating: false,
    }
  }

  if (!user.email) return null

  const { data: byEmail } = await supabase
    .from('employees')
    .select('id, name, email, employee_number, company_id, department, position, Date_of_joining, birthdate, Tel, Sex, Grade, Role, job, "Working place"')
    .ilike('email', user.email)
    .eq('is_active', true)
    .maybeSingle()

  if (!byEmail) return null

  return {
    employeeId:     byEmail.id,
    employeeName:   byEmail.name,
    employeeEmail:  byEmail.email,
    employeeNumber: byEmail.employee_number ?? null,
    companyId:      byEmail.company_id,
    department:     byEmail.department,
    position:       byEmail.position,
    dateOfJoining:  byEmail.Date_of_joining,
    birthdate:      byEmail.birthdate,
    phone:          (byEmail as Record<string, unknown>).Tel as string | null ?? null,
    gender:         (byEmail as Record<string, unknown>).Sex as string | null ?? null,
    grade:          (byEmail as Record<string, unknown>).Grade as string | null ?? null,
    roleTitle:      (byEmail as Record<string, unknown>).Role as string | null ?? null,
    job:            (byEmail as Record<string, unknown>).job as string | null ?? null,
    workLocation:   (byEmail as Record<string, unknown>)['Working place'] as string | null ?? null,
    isImpersonating: false,
  }
}
