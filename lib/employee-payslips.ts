/* ================================================================
   itda — 직원 급여명세서 Supabase 쿼리 함수
   실제 테이블: pay_info_v2 (earnings/deductions JSONB)
================================================================ */

import { createClient }    from '@/lib/supabase/server'
import { mapEarnings, mapDeductions } from '@/lib/payroll-labels'
import {
  rowToListItem,
  type PayInfoV2Row,
  type PayslipListItem,
  type PayslipDetail,
} from '@/types/payslip'

/* ── 현재 로그인 직원 정보 ─────────────────────────────────
   1. auth.getUser() → uid
   2. employees WHERE user_id = uid  (초대 수락 시 자동 연결)
   3. fallback: email 매칭 (개발 환경 / 초대 미수락)
──────────────────────────────────────────────────────────── */
export async function getCurrentEmployee() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // user_id로 직접 매칭
  const { data: byUid } = await supabase
    .from('employees')
    .select('id, name, email, company_id, department, position, Date_of_joining, birthdate')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (byUid) return byUid

  // fallback: 이메일 매칭 (초대 미수락 상태)
  if (!user.email) return null
  const { data: byEmail } = await supabase
    .from('employees')
    .select('id, name, email, company_id, department, position, Date_of_joining, birthdate')
    .ilike('email', user.email)
    .eq('is_active', true)
    .maybeSingle()

  return byEmail ?? null
}

/* ── 급여 목록 조회 (금액 필드 완전 제외) ────────────────────
   ★ SELECT에서 earnings/deductions/net_pay 등 금액 필드 절대 포함 금지
──────────────────────────────────────────────────────────── */
export async function getEmployeePayslips(
  employeeId: number,
): Promise<PayslipListItem[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('pay_info_v2')
    .select('id, accrual_month, payment_date')   // ★ 금액 필드 제외
    .eq('employee_id', employeeId)
    .order('accrual_month', { ascending: false })

  if (error) {
    console.error('[getEmployeePayslips]', error.message)
    return []
  }

  return (data ?? []).map(rowToListItem)
}

/* ── 급여명세서 상세 조회 ─────────────────────────────────────
   반드시 employee_id 검증 → 타인 데이터 접근 차단
──────────────────────────────────────────────────────────── */
export async function getEmployeePayslipById(
  id: number,
  employeeId: number,
): Promise<PayslipDetail | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('pay_info_v2')
    .select(`
      *,
      employees ( name, email, department, position, Date_of_joining, birthdate, company_id ),
      companies ( name )
    `)
    .eq('id', id)
    .eq('employee_id', employeeId)   // ★ 본인 검증 (RLS 보완)
    .maybeSingle()

  if (error || !data) return null

  const row = data as PayInfoV2Row

  // total_deductions는 음수일 수 있음 → Math.abs로 표시용 절댓값
  const totalEarnings   = Math.round(Number(row.total_earnings))
  const totalDeductions = Math.abs(Math.round(Number(row.total_deductions)))
  const netPay          = Math.round(Number(row.net_pay))

  return {
    id:            row.id,
    accrualMonth:  row.accrual_month,
    paymentDate:   row.payment_date ?? null,
    workDays:      row.work_days != null ? Number(row.work_days) : null,
    overtimeHours: row.overtime_hours != null ? Number(row.overtime_hours) : null,
    earnings:      mapEarnings(row.earnings ?? {}),
    deductions:    mapDeductions(row.deductions ?? {}),
    totalEarnings,
    totalDeductions,
    netPay,
    calculationNotes: Array.isArray(row.calculation_notes)
      ? row.calculation_notes.filter(Boolean)
      : [],
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

/* ── 회사 월별 전체 조회 (어드민/담당자용) ────────────────── */
export async function getCompanyPayrollV2(companyId: number, accrualMonth?: string) {
  const supabase = createClient()

  let q = supabase
    .from('pay_info_v2')
    .select('*, employees(name,email,department,position)')
    .eq('company_id', companyId)
    .order('accrual_month', { ascending: false })

  if (accrualMonth) q = q.eq('accrual_month', accrualMonth)

  const { data } = await q
  return data ?? []
}
