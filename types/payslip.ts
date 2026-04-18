/* ================================================================
   itda — 급여명세서 타입 정의 (pay_info_v2 실제 구조 기반)
================================================================ */

/** pay_info_v2 DB Row */
export interface PayInfoV2Row {
  id:               number
  company_id:       number
  employee_id:      number
  accrual_month:    string               // YYYY-MM
  payment_date:     string | null        // date
  work_days:        number | string | null
  overtime_hours:   number | string | null
  // 정산기간 (선택)
  start_date?:       string | null        // DATE YYYY-MM-DD
  end_date?:         string | null        // DATE YYYY-MM-DD
  // 근로시간/연차 (선택)
  Over_time?:                  number | null
  Holiday_working_hours?:      number | null
  night_work_hours?:           number | null
  Remaining_annual_leave_hours?: number | null
  // pay_info 흡수 컬럼 (선택)
  Number_of_days?:     number | null   // 정산기간 총 일수
  Total_tax_salary?:   number | null   // 과세급여합계
  earnings:         Record<string, number>   // JSONB
  deductions:       Record<string, number>   // JSONB
  total_earnings:   number | string
  total_deductions: number | string
  net_pay:          number | string
  calculation_notes: string[] | null
  upload_log_id:    number | null
  created_at:       string
  updated_at:       string
  // JOIN
  employees?: {
    name:            string
    email:           string
    department:      string | null
    position:        string | null
    birthdate:       string | null
    Date_of_joining: string | null
    quit_date:       string | null
    employee_number: string | null
    company_id:      number
  } | null
  companies?: { name: string; payslip_note?: string | null; payroll_start_day?: number | null; payroll_day?: number | null } | null
}

/* ── 목록용 — 금액 없음 ─────────────────────────────────── */
export interface PayslipListItem {
  id:           number
  accrualMonth: string          // YYYY-MM
  paymentDate:  string | null
  status:       'paid' | 'pending'
}

/* ── 상세 화면 ViewModel ─────────────────────────────────── */
export interface PayslipLineItem {
  key:    string
  label:  string
  amount: number
}

export interface PayslipDetail {
  id:              number
  accrualMonth:    string
  paymentDate:     string | null
  workDays:        number | null
  overtimeHours:   number | null
  // 정산기간 (pay_info 직접 저장값)
  startDate?:      string | null   // YYYY-MM-DD
  endDate?:        string | null   // YYYY-MM-DD
  // 근로시간/연차 (분 단위)
  overTime?:                  number | null
  holidayWorkingHours?:       number | null
  nightWorkHours?:            number | null
  remainingAnnualLeaveHours?: number | null
  // pay_info 흡수 컬럼 (선택)
  numberOfDays?:     number | null   // 정산기간 총 일수 (Number_of_days)
  totalTaxSalary?:   number | null   // 과세급여합계 (Total_tax_salary)
  // 상세에서만 노출
  earnings:        PayslipLineItem[]
  deductions:      PayslipLineItem[]
  totalEarnings:   number
  totalDeductions: number
  netPay:          number
  calculationNotes: string[]
  employee: {
    name:        string
    email:       string
    department:  string | null
    position:    string | null
    joinDate:    string | null
    birthDate:   string | null
    employeeNo:  string
  }
  companyName: string
  // 급여 기간 정보 (fallback — company 기준 계산값)
  daysInMonth?: number        // 당월일수
  payrollPeriodStart?: string // 정산기간 시작 (fallback)
  payrollPeriodEnd?: string   // 정산기간 종료 (fallback)
}

/** DB Row → 목록 아이템 변환 (금액 필드 없음) */
export function rowToListItem(
  row: Pick<PayInfoV2Row, 'id' | 'accrual_month' | 'payment_date'>
): PayslipListItem {
  const today = new Date().toISOString().slice(0, 10)
  const paid  = !!row.payment_date && row.payment_date <= today
  return {
    id:           row.id,
    accrualMonth: row.accrual_month,
    paymentDate:  row.payment_date,
    status:       paid ? 'paid' : 'pending',
  }
}
