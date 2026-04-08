'use server'
/* ================================================================
   itda — 직원 급여명세서 Supabase 쿼리 함수
   실제 테이블: pay_info_v2 (earnings/deductions JSONB)
================================================================ */

import { createClient }        from '@/lib/supabase/server'
import { mapEarnings, mapDeductions } from '@/lib/payroll-labels'
import { parsePayslipNote }   from '@/lib/payslip-defaults'
import {
  rowToListItem,
  type PayInfoV2Row,
  type PayslipListItem,
  type PayslipDetail,
} from '@/types/payslip'

/* ────────────────────────────────────────────────────────
   getCurrentEmployee
   우선순위:
     1. employees.user_id = auth.uid()       (초대 수락 완료)
     2. employees.email  = auth.user.email   (개발/fallback)
──────────────────────────────────────────────────────── */
export async function getCurrentEmployee() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 1순위: user_id 매칭
  const { data: byUid } = await supabase
    .from('employees')
    .select('id, name, email, company_id, department, position, Date_of_joining, birthdate')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (byUid) return byUid

  // 2순위: email 매칭 (user_id=null인 개발 환경 fallback)
  if (!user.email) return null

  const { data: byEmail } = await supabase
    .from('employees')
    .select('id, name, email, company_id, department, position, Date_of_joining, birthdate')
    .ilike('email', user.email)
    .eq('is_active', true)
    .maybeSingle()

  return byEmail ?? null
}

/* ────────────────────────────────────────────────────────
   getEmployeePayslips — 목록 조회
   ★★★ SELECT에 earnings/deductions/금액 필드 절대 포함 금지 ★★★
──────────────────────────────────────────────────────── */
export async function getEmployeePayslips(
  employeeId: number,
): Promise<PayslipListItem[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('pay_info_v2')
    // ★ 금액 필드(earnings, deductions, total_*, net_pay) 제외
    .select('id, accrual_month, payment_date')
    .eq('employee_id', employeeId)
    .order('accrual_month', { ascending: false })

  if (error) {
    console.error('[getEmployeePayslips]', error.message)
    return []
  }

  return (data ?? []).map(rowToListItem)
}

/* ────────────────────────────────────────────────────────
   getEmployeePayslipById — 상세 조회
   ★ .eq('employee_id', employeeId) 로 본인 데이터 강제 검증
──────────────────────────────────────────────────────── */
export async function getEmployeePayslipById(
  id:         number,
  employeeId: number,
): Promise<PayslipDetail | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('pay_info_v2')
    .select(`
      *,
      employees (
        name, email, department, position,
        Date_of_joining, birthdate, company_id
      ),
      companies ( name, payslip_note )
    `)
    .eq('id', id)
    .eq('employee_id', employeeId)   // ★ 본인 검증 — 다른 직원 id면 null 반환
    .maybeSingle()

  if (error || !data) return null

  const row = data as PayInfoV2Row

  // total_deductions는 음수(환급 포함)일 수 있음 → abs로 표시
  const totalEarnings   = Math.round(Number(row.total_earnings))
  const totalDeductions = Math.abs(Math.round(Number(row.total_deductions)))
  const netPay          = Math.round(Number(row.net_pay))

  return {
    id:           row.id,
    accrualMonth: row.accrual_month,
    paymentDate:  row.payment_date ?? null,
    workDays:     row.work_days != null ? Number(row.work_days) : null,
    overtimeHours: row.overtime_hours != null ? Number(row.overtime_hours) : null,

    // 금액 (상세에서만 노출)
    earnings:     mapEarnings(row.earnings ?? {}),
    deductions:   mapDeductions(row.deductions ?? {}),
    totalEarnings,
    totalDeductions,
    netPay,

    calculationNotes: parsePayslipNote(
      (row.companies as any)?.payslip_note ?? null
    ),

    employee: {
      name:       row.employees?.name       ?? '',
      email:      row.employees?.email      ?? '',
      department: row.employees?.department ?? null,
      position:   row.employees?.position   ?? null,
      joinDate:   row.employees?.Date_of_joining ?? null,
      birthDate:  row.employees?.birthdate  ?? null,
      employeeNo: `EMP-${String(employeeId).padStart(4, '0')}`,
    },
    companyName: row.companies?.name ?? '',
  }
}
