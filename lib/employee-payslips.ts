'use server'
/* ================================================================
   itda — 직원 급여명세서 Supabase 쿼리 함수
   실제 테이블: pay_info_v2 (earnings/deductions JSONB)
================================================================ */

import { createClient }        from '@/lib/supabase/server'
import { mapEarnings, mapDeductions } from '@/lib/payroll-labels'
import { parsePayslipNote }   from '@/lib/payslip-defaults'
import { getDefaultPayslipNotes } from '@/lib/supabase/queries/app-settings'
import { getDaysInMonth, getPayrollPeriod } from '@/lib/payslip-utils'
import {
  rowToListItem,
  type PayInfoV2Row,
  type PayslipListItem,
  type PayslipDetail,
} from '@/types/payslip'

/* ────────────────────────────────────────────────────────
   derivePaymentDate — 귀속월 + 급여지급일 → 실제 지급일
   payrollDay=25, accrualMonth='2026-02' → '2026-02-25'
   말일 초과는 해당 월 말일로 클램프
──────────────────────────────────────────────────────── */
function derivePaymentDate(
  accrualMonth: string,
  payrollDay:   number | null | undefined,
): string | null {
  if (!payrollDay) return null
  const [year, month] = accrualMonth.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const day = Math.min(payrollDay, lastDay)
  return `${accrualMonth}-${String(day).padStart(2, '0')}`
}

/* ────────────────────────────────────────────────────────
   capWithQuitDate — 퇴사일로 정산종료일 캡
   quitDate가 존재하고 periodEnd보다 앞서면 quitDate 반환
──────────────────────────────────────────────────────── */
function capWithQuitDate(
  periodEnd: string | null | undefined,
  quitDate:  string | null | undefined,
): string | undefined {
  if (!periodEnd) return undefined
  if (!quitDate)  return periodEnd
  return quitDate < periodEnd ? quitDate : periodEnd
}

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
   getEmployeePayslipsForHistory — 이력 페이지용 (net_pay 포함)
   빙의 모드에서 history 페이지가 사용 (pay_info_v2 기반)
──────────────────────────────────────────────────────── */
export async function getEmployeePayslipsForHistory(
  employeeId: number,
): Promise<Array<{ id: number; netPay: number; accrualMonth: string; paymentDate: string | null }>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('pay_info_v2')
    .select('id, accrual_month, payment_date, net_pay')
    .eq('employee_id', employeeId)
    .order('accrual_month', { ascending: false })

  if (error) {
    console.error('[getEmployeePayslipsForHistory]', error.message)
    return []
  }

  return (data ?? []).map(r => ({
    id:           r.id,
    netPay:       Math.round(Number(r.net_pay ?? 0)),
    accrualMonth: r.accrual_month,
    paymentDate:  r.payment_date ?? null,
  }))
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
   getAdminEmployeePayslipDetail — admin/manager용 상세 조회
   company_id + accrual_month + employee_id 로 식별
   (소유권 검증 없음 — admin/manager 권한 전제)
──────────────────────────────────────────────────────── */
export async function getAdminEmployeePayslipDetail(
  companyId:  number,
  payMonth:   string,
  employeeId: number,
): Promise<PayslipDetail | null> {
  const supabase = createClient()
  const systemDefaultNotes = await getDefaultPayslipNotes()

  const { data, error } = await supabase
    .from('pay_info_v2')
    .select(`
      *,
      employees (
        name, email, department, position,
        Date_of_joining, birthdate, quit_date, employee_number, company_id
      ),
      companies ( name, payslip_note, payroll_start_day, payroll_day )
    `)
    .eq('company_id', companyId)
    .eq('accrual_month', payMonth)
    .eq('employee_id', employeeId)
    .maybeSingle()

  if (error || !data) return null

  const row = data as PayInfoV2Row

  const totalEarnings   = Math.round(Number(row.total_earnings))
  const totalDeductions = Math.abs(Math.round(Number(row.total_deductions)))
  const netPay          = Math.round(Number(row.net_pay))

  const daysInMonth = getDaysInMonth(row.accrual_month)
  const payrollStartDay = ((row.companies as any)?.payroll_start_day ?? null) as number | null
  const payrollDay      = ((row.companies as any)?.payroll_day      ?? null) as number | null
  const { start: payrollPeriodStart, end: payrollPeriodEnd } =
    getPayrollPeriod(row.accrual_month, payrollStartDay)

  // 퇴사자: 퇴사일이 정산종료일보다 앞서면 퇴사일로 캡
  const quitDate = (row.employees as any)?.quit_date as string | null | undefined
  const cappedEndDate        = capWithQuitDate(row.end_date ?? null, quitDate)
  const cappedPayrollPeriodEnd = capWithQuitDate(payrollPeriodEnd, quitDate)

  return {
    id:           row.id,
    accrualMonth: row.accrual_month,
    paymentDate:  row.payment_date ?? derivePaymentDate(row.accrual_month, payrollDay),
    workDays:     row.work_days != null ? Number(row.work_days) : null,
    overtimeHours: row.overtime_hours != null ? Number(row.overtime_hours) : null,
    startDate: row.start_date ?? null,
    endDate:   cappedEndDate,
    overTime:                  row.Over_time                   ?? null,
    holidayWorkingHours:       row.Holiday_working_hours       ?? null,
    nightWorkHours:            row.night_work_hours            ?? null,
    remainingAnnualLeaveHours: row.Remaining_annual_leave_hours ?? null,
    numberOfDays:   (row as any).Number_of_days != null ? Number((row as any).Number_of_days) : null,
    totalTaxSalary: (row as any).Total_tax_salary != null ? Number((row as any).Total_tax_salary) : null,
    earnings:     mapEarnings(row.earnings ?? {}),
    deductions:   mapDeductions(row.deductions ?? {}),
    totalEarnings,
    totalDeductions,
    netPay,
    calculationNotes: parsePayslipNote(
      (row.companies as any)?.payslip_note ?? null,
      systemDefaultNotes,
    ),
    employee: {
      name:       row.employees?.name       ?? '',
      email:      row.employees?.email      ?? '',
      department: row.employees?.department ?? null,
      position:   row.employees?.position   ?? null,
      joinDate:   row.employees?.Date_of_joining ?? null,
      birthDate:  row.employees?.birthdate  ?? null,
      employeeNo: row.employees?.employee_number ?? `EMP-${String(employeeId).padStart(4, '0')}`,
    },
    companyName:        row.companies?.name ?? '',
    daysInMonth,
    payrollPeriodStart,
    payrollPeriodEnd: cappedPayrollPeriodEnd,
  }
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
  const systemDefaultNotes = await getDefaultPayslipNotes()

  const { data, error } = await supabase
    .from('pay_info_v2')
    .select(`
      *,
      employees (
        name, email, department, position,
        Date_of_joining, birthdate, quit_date, employee_number, company_id
      ),
      companies ( name, payslip_note, payroll_start_day, payroll_day )
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

  // ── 당월일수 + 정산기간 ──
  // pay_info_v2에 start_date/end_date가 있으면 우선 사용, 없으면 company 기준 계산
  const daysInMonth = getDaysInMonth(row.accrual_month)
  const payrollStartDay = ((row.companies as any)?.payroll_start_day ?? null) as number | null
  const payrollDay2     = ((row.companies as any)?.payroll_day      ?? null) as number | null
  const { start: payrollPeriodStart, end: payrollPeriodEnd } =
    getPayrollPeriod(row.accrual_month, payrollStartDay)

  // 퇴사자: 퇴사일이 정산종료일보다 앞서면 퇴사일로 캡
  const quitDate2 = (row.employees as any)?.quit_date as string | null | undefined
  const cappedEndDate2         = capWithQuitDate(row.end_date ?? null, quitDate2)
  const cappedPayrollPeriodEnd2 = capWithQuitDate(payrollPeriodEnd, quitDate2)

  return {
    id:           row.id,
    accrualMonth: row.accrual_month,
    paymentDate:  row.payment_date ?? derivePaymentDate(row.accrual_month, payrollDay2),
    workDays:     row.work_days != null ? Number(row.work_days) : null,
    overtimeHours: row.overtime_hours != null ? Number(row.overtime_hours) : null,

    // ★ 정산기간 — pay_info_v2 직접 저장값 (퇴사일 캡 적용)
    startDate: row.start_date ?? null,
    endDate:   cappedEndDate2,

    // ★ 근로시간/연차
    overTime:                  row.Over_time                   ?? null,
    holidayWorkingHours:       row.Holiday_working_hours       ?? null,
    nightWorkHours:            row.night_work_hours            ?? null,
    remainingAnnualLeaveHours: row.Remaining_annual_leave_hours ?? null,

    // ★ pay_info 흡수 필드
    numberOfDays:   (row as any).Number_of_days != null ? Number((row as any).Number_of_days) : null,
    totalTaxSalary: (row as any).Total_tax_salary != null ? Number((row as any).Total_tax_salary) : null,

    // 금액 (상세에서만 노출)
    earnings:     mapEarnings(row.earnings ?? {}),
    deductions:   mapDeductions(row.deductions ?? {}),
    totalEarnings,
    totalDeductions,
    netPay,

    calculationNotes: parsePayslipNote(
      (row.companies as any)?.payslip_note ?? null,
      systemDefaultNotes,
    ),

    employee: {
      name:       row.employees?.name       ?? '',
      email:      row.employees?.email      ?? '',
      department: row.employees?.department ?? null,
      position:   row.employees?.position   ?? null,
      joinDate:   row.employees?.Date_of_joining ?? null,
      birthDate:  row.employees?.birthdate  ?? null,
      employeeNo: row.employees?.employee_number ?? `EMP-${String(employeeId).padStart(4, '0')}`,
    },
    companyName:        row.companies?.name ?? '',
    daysInMonth,
    payrollPeriodStart,
    payrollPeriodEnd: cappedPayrollPeriodEnd2,
  }
}
