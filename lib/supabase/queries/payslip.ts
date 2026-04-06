'use server'
import { createClient } from '@/lib/supabase/server'
import type { PayInfoRow } from './payslip-shared'

export type { PayInfoRow } from './payslip-shared'

/** 직원: 본인 급여 목록 */
export async function getMyPayslips(): Promise<PayInfoRow[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: emp } = await supabase
    .from('employees').select('id').eq('user_id', user.id).single()
  if (!emp) return []

  const { data } = await supabase
    .from('pay_info')
    .select('*, employees(name,email,birthdate,Date_of_joining,quit_date,department,position,company_id,companies(name))')
    .eq('employee_id', emp.id)
    .order('accrual_month', { ascending: false })
  return (data ?? []) as PayInfoRow[]
}

/** 직원: 특정 급여 상세 */
export async function getMyPayslipById(payInfoId: number): Promise<PayInfoRow | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: emp } = await supabase
    .from('employees').select('id').eq('user_id', user.id).single()
  if (!emp) return null

  const { data } = await supabase
    .from('pay_info')
    .select('*, employees(name,email,birthdate,Date_of_joining,quit_date,department,position,company_id,companies(name))')
    .eq('id', payInfoId)
    .eq('employee_id', emp.id)
    .single()
  return (data as PayInfoRow | null)
}

/** 기업담당자/어드민: 회사 월별 급여 목록 */
export async function getCompanyPayroll(companyId: number, accrualMonth: string): Promise<PayInfoRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('pay_info')
    .select('*, employees(name,email,department,position)')
    .eq('company_id', companyId)
    .eq('accrual_month', accrualMonth)
    .order('employee_id')
  return (data ?? []) as PayInfoRow[]
}

/** 어드민: 전체 급여 배치 목록 */
export async function getAllBatches() {
  const supabase = createClient()
  const { data } = await supabase
    .from('payroll_batches')
    .select('*, companies(name)')
    .order('created_at', { ascending: false })
    .limit(20)
  return data ?? []
}

/** 최근 귀속월 목록 (실제 데이터 기반) */
export async function getAvailableMonths(companyId?: number): Promise<string[]> {
  const supabase = createClient()
  let q = supabase
    .from('pay_info')
    .select('accrual_month')
    .order('accrual_month', { ascending: false })
  if (companyId) q = q.eq('company_id', companyId)

  const { data } = await q
  const unique = [...new Set((data ?? []).map(r => r.accrual_month))]
  return unique
}
