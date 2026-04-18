'use server'
/* ================================================================
   itda — 직원별 급여내역 조회 Server Actions
   권한: admin(전체), manager(본인 회사만), employee(접근 불가)
================================================================ */

import { createClient } from '@/lib/supabase/server'
import type { PayInfoV2Row } from '@/types/payslip'

export interface EmployeeSearchItem {
  id:              number
  name:            string
  email:           string
  employee_number: string | null
  department:      string | null
  position:        string | null
  company_id:      number
  company_name:    string
}

/* ── 직원 검색 목록 ─────────────────────────────────────────── */
export async function getEmployeesForHistory(
  companyId?: number | null,
): Promise<{ employees: EmployeeSearchItem[]; error?: string }> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { employees: [], error: '인증이 필요합니다' }

  const { data: profile } = await supabase
    .from('profiles').select('role, company_id').eq('id', user.id).single()
  if (!profile || profile.role === 'employee') {
    return { employees: [], error: '권한이 없습니다' }
  }

  let query = supabase
    .from('employees')
    .select('id, name, email, employee_number, department, position, company_id, companies(name)')
    .order('name')

  if (profile.role === 'manager') {
    if (!profile.company_id) return { employees: [], error: '회사 정보가 없습니다' }
    query = query.eq('company_id', profile.company_id)
  } else if (profile.role === 'admin' && companyId) {
    query = query.eq('company_id', companyId)
  }

  const { data, error } = await query
  if (error) return { employees: [], error: error.message }

  return {
    employees: (data ?? []).map(e => ({
      id:              e.id,
      name:            e.name            ?? '',
      email:           e.email           ?? '',
      employee_number: e.employee_number ?? null,
      department:      e.department      ?? null,
      position:        e.position        ?? null,
      company_id:      e.company_id,
      company_name:    (e.companies as { name?: string } | null)?.name ?? '',
    })),
  }
}

/* ── 직원별 급여내역 전체 ────────────────────────────────────── */
export async function getEmployeePayrollHistory(
  employeeId: number,
): Promise<{ rows: PayInfoV2Row[]; error?: string }> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { rows: [], error: '인증이 필요합니다' }

  const { data: profile } = await supabase
    .from('profiles').select('role, company_id').eq('id', user.id).single()
  if (!profile || profile.role === 'employee') {
    return { rows: [], error: '권한이 없습니다' }
  }

  /* Manager: 본인 회사 직원 여부 확인 */
  if (profile.role === 'manager' && profile.company_id) {
    const { data: emp } = await supabase
      .from('employees').select('company_id').eq('id', employeeId).single()
    if (!emp || emp.company_id !== profile.company_id) {
      return { rows: [], error: '접근 권한이 없는 직원입니다' }
    }
  }

  const { data, error } = await supabase
    .from('pay_info_v2')
    .select(`
      *,
      employees(name, email, department, position, birthdate, employee_number, Date_of_joining, quit_date, company_id),
      companies(name, payslip_note, payroll_start_day, payroll_day, biz_number)
    `)
    .eq('employee_id', employeeId)
    .order('accrual_month', { ascending: false })

  if (error) return { rows: [], error: error.message }

  return { rows: (data ?? []) as PayInfoV2Row[] }
}
