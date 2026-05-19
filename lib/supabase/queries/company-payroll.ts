'use server'
/**
 * 기업별 급여 조회 흐름 전용 쿼리
 * admin/manager 공통 사용 — checkCompanyAccess()로 권한 분기
 */
import { createClient } from '@/lib/supabase/server'
import type { PayInfoV2 } from '@/types'
import { toAccrualDate, toAccrualMonth } from '@/lib/payslip-utils'

/* ── 공통 헬퍼 ─────────────────────────────────────────────── */
function parseAmt(val: string | null | undefined): number {
  if (!val) return 0
  const n = parseInt(String(val).replace(/[,\s]/g, ''), 10)
  return isNaN(n) ? 0 : Math.abs(n)
}

/* ── 타입 ─────────────────────────────────────────────────── */

export interface CompanyDetail {
  id: number
  name: string
  biz_number: string | null
  representative: string | null
  status: 'active' | 'inactive'
  contact_name: string | null
  contact_email: string | null
  payroll_day: number | null
  payslip_note: string | null
  payslip_note_overrides: Record<string, string> | null
  biz_doc_url: string | null
  features: Record<string, boolean> | null
  seal_image_url: string | null
}

export interface PayrollLedgerSummary {
  accrual_month: string        // 'YYYY-MM'
  payment_date: string | null
  total_earnings: number
  total_deductions: number
  net_pay: number
  employee_count: number
}

export interface CompanyEmployeeRow {
  id: number
  name: string
  email: string
  employee_number: string | null
  department: string | null
  position: string | null
  is_active: boolean
  Date_of_joining: string | null
}

/* ═══════════════════════════════════════════════════════════
   권한 확인 헬퍼
   admin → 모든 회사 허용
   manager → 본인 company_id 만 허용
   employee → 차단
═══════════════════════════════════════════════════════════ */
export async function checkCompanyAccess(companyId: number): Promise<{
  allowed: boolean
  role: 'admin' | 'manager' | null
  profileCompanyId: number | null
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { allowed: false, role: null, profileCompanyId: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { allowed: false, role: null, profileCompanyId: null }

  const role = profile.role as string
  const profileCompanyId = profile.company_id as number | null

  if (role === 'admin') return { allowed: true, role: 'admin', profileCompanyId }
  if (role === 'manager' && profileCompanyId === companyId) {
    return { allowed: true, role: 'manager', profileCompanyId }
  }
  return { allowed: false, role: null, profileCompanyId }
}

/* ═══════════════════════════════════════════════════════════
   회사 상세 조회
═══════════════════════════════════════════════════════════ */
export async function getCompanyDetail(id: number): Promise<CompanyDetail | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, biz_number, representative, status, contact_name, contact_email, payroll_day, payslip_note, payslip_note_overrides, biz_doc_url, features, seal_image_url')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error || !data) return null
  return data as unknown as CompanyDetail
}

/* ═══════════════════════════════════════════════════════════
   월별 급여대장 집계 (최근순)
═══════════════════════════════════════════════════════════ */
export async function getCompanyPayrollLedgerSummaries(
  companyId: number,
): Promise<PayrollLedgerSummary[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('pay_info_v2')
    .select('accrual_month, payment_date, total_earnings, total_deductions, net_pay, employee_id')
    .eq('company_id', companyId)
    .order('accrual_month', { ascending: false })

  if (!data || data.length === 0) return []

  const map = new Map<string, PayrollLedgerSummary>()

  for (const row of data) {
    const earnings   = Math.round(Number(row.total_earnings   ?? 0))
    const deductions = Math.abs(Math.round(Number(row.total_deductions ?? 0)))
    const net        = Math.round(Number(row.net_pay          ?? 0))
    const month      = toAccrualMonth(row.accrual_month as string)

    const existing = map.get(month)
    if (existing) {
      existing.total_earnings   += earnings
      existing.total_deductions += deductions
      existing.net_pay          += net
      existing.employee_count   += 1
      const pd = row.payment_date as string | null
      if (pd && (!existing.payment_date || pd > existing.payment_date)) {
        existing.payment_date = pd
      }
    } else {
      map.set(month, {
        accrual_month:    month,
        payment_date:     row.payment_date as string | null,
        total_earnings:   earnings,
        total_deductions: deductions,
        net_pay:          net,
        employee_count:   1,
      })
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    b.accrual_month.localeCompare(a.accrual_month),
  )
}

/* ═══════════════════════════════════════════════════════════
   회사 직원 목록
═══════════════════════════════════════════════════════════ */
export async function getCompanyEmployees(
  companyId: number,
): Promise<CompanyEmployeeRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('employees')
    .select('id, name, email, employee_number, department, position, is_active, Date_of_joining')
    .eq('company_id', companyId)
    .order('name')
  return (data ?? []) as CompanyEmployeeRow[]
}

/* ═══════════════════════════════════════════════════════════
   월별 급여 전체 rows (직원 join 포함)
═══════════════════════════════════════════════════════════ */
export async function getMonthlyPayrollRows(
  companyId: number,
  payMonth: string,
): Promise<PayInfoV2[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('pay_info_v2')
    .select(
      '*, employees(name,email,employee_number,department,position,birthdate,Date_of_joining,quit_date,company_id,companies(name,payslip_note,payroll_start_day))',
    )
    .eq('company_id', companyId)
    .like('accrual_month', `${payMonth.slice(0, 7)}%`)
    .order('employee_id')
  return (data ?? []) as PayInfoV2[]
}

/* ═══════════════════════════════════════════════════════════
   특정 직원 급여명세서 단건
═══════════════════════════════════════════════════════════ */
/** @deprecated getAdminEmployeePayslipDetail (lib/employee-payslips.ts) 사용 권장 */
export async function getEmployeePayslipForAdmin(
  companyId: number,
  payMonth: string,
  employeeId: number,
): Promise<PayInfoV2 | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pay_info_v2')
    .select(
      '*, employees(name,email,employee_number,department,position,birthdate,Date_of_joining,quit_date,company_id,companies(name,payslip_note,payroll_start_day))',
    )
    .eq('company_id', companyId)
    .like('accrual_month', `${payMonth.slice(0, 7)}%`)
    .eq('employee_id', employeeId)
    .maybeSingle()
  if (error || !data) return null
  return data as PayInfoV2
}
