'use server'
import { createClient } from '@/lib/supabase/server'
import type { PayInfoV2 } from '@/types'
import { toAccrualDate, toAccrualMonth } from '@/lib/payslip-utils'

/** 직원: 본인 급여 목록 (최신순) */
export async function getMyPayslipsV2(): Promise<PayInfoV2[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: emp } = await supabase
    .from('employees').select('id').eq('user_id', user.id).single()
  if (!emp) return []

  const { data } = await supabase
    .from('pay_info_v2')
    .select('*, employees(name,email,birthdate,employee_number,Date_of_joining,department,position), companies(name)')
    .eq('employee_id', emp.id)
    .order('accrual_month', { ascending: false })
  return (data ?? []) as PayInfoV2[]
}

/** 직원: 특정 급여 상세 */
export async function getMyPayslipV2ById(id: number): Promise<PayInfoV2 | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: emp } = await supabase
    .from('employees').select('id').eq('user_id', user.id).single()
  if (!emp) return null

  const { data } = await supabase
    .from('pay_info_v2')
    .select('*, employees(name,email,birthdate,employee_number,Date_of_joining,department,position), companies(name)')
    .eq('id', id)
    .eq('employee_id', emp.id)
    .single()
  return data as PayInfoV2 | null
}

/** 기업담당자/어드민: 회사 월별 급여 */
export async function getCompanyPayrollV2(companyId: number, month: string): Promise<PayInfoV2[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('pay_info_v2')
    .select('*, employees(name,email,employee_number,department,position,birthdate,Date_of_joining,quit_date,company_id), companies(name,payslip_note,payroll_start_day,payroll_day)')
    .eq('company_id', companyId)
    .eq('accrual_month', toAccrualDate(month))
    .order('employee_id')
  return (data ?? []) as PayInfoV2[]
}

/** 귀속월 목록 */
export async function getAvailableMonthsV2(companyId?: number): Promise<string[]> {
  const supabase = createClient()
  let q = supabase.from('pay_info_v2').select('accrual_month')
  if (companyId) q = q.eq('company_id', companyId)
  const { data } = await q.order('accrual_month', { ascending: false })
  return [...new Set((data ?? []).map(r => toAccrualMonth(r.accrual_month)))]
}

/** 어드민: 급여 목록 조회 (전체 or 회사 필터) */
export async function getAdminPayrollListV2(opts?: {
  companyId?:    number
  accrualMonth?: string
  search?:       string
}): Promise<PayInfoV2[]> {
  const supabase = createClient()

  const select = '*, employees(name,email,department,position,birthdate,employee_number,Date_of_joining,quit_date,company_id), companies(name,payslip_note,payroll_start_day,payroll_day)'

  let q = supabase.from('pay_info_v2').select(select).order('employee_id')

  if (opts?.companyId)    q = q.eq('company_id', opts.companyId)
  if (opts?.accrualMonth) q = q.eq('accrual_month', toAccrualDate(opts.accrualMonth))

  const { data } = await q
  return (data ?? []) as PayInfoV2[]
}

/** 어드민: 사용 가능한 귀속월 목록 (전체 or 회사 필터) */
export async function getAdminAvailableMonthsV2(companyId?: number): Promise<string[]> {
  return getAvailableMonthsV2(companyId)
}
