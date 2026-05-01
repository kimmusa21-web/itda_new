/* ================================================================
   itda — 급여 표준 CSV 업로드 타입 (pay_info_v2 전체 컬럼 기반)
================================================================ */

/** CSV 원본 행 — STANDARD_CSV_COLUMNS과 1:1 매핑 */
export interface PayslipCsvRow {
  // 식별
  email:            string
  employee_name?:   string
  employee_number?: string
  // 급여 기준
  pay_month:     string          // YYYY-MM (필수)
  payment_date?: string          // YYYY-MM-DD
  start_date?:   string          // YYYY-MM-DD
  end_date?:     string          // YYYY-MM-DD
  work_days?:    string          // 숫자 (일)
  // 지급 항목
  base_salary:              string  // 필수
  overtime_pay_fixed?:      string
  overtime_pay?:            string
  holidaytime_pay?:         string
  nighttime_pay?:           string
  meal_allowance?:          string
  incentive?:               string
  annual_leave_allowance?:  string
  Other_allowances?:        string
  Other_allowances2?:       string
  Holiday_bonus?:           string
  // 근로시간 (분)
  Over_time?:                    string
  Holiday_working_hours?:        string
  night_work_hours?:             string
  Remaining_annual_leave_hours?: string
  // 공제 항목
  national_pension?:            string
  health_insurance?:            string
  longterm_care?:               string
  employment_insurance?:        string
  income_tax?:                  string
  resident_tax?:                string
  student_loan?:                string
  income_tax_refund?:           string   // 환급이면 음수
  resident_tax_refund?:         string   // 환급이면 음수
  health_insurance_adjustment?: string   // 음수 가능
  Other_deductions?:            string
  // 합계 (미입력 시 서버에서 계산)
  Total_payment?:    string
  Total_tax_salary?: string   // 과세급여합계
  Total_deductible?: string
  net_pay?:          string
}

/** 행별 실패 상세 */
export interface PayslipCsvFailure {
  rowNumber: number
  email:     string
  reason:    string
}

/** 업로드 결과 */
export interface PayslipCsvResult {
  totalCount:   number
  successCount: number
  failureCount: number
  failures:     PayslipCsvFailure[]
  authError?:   string
}

/** 서버 액션 파라미터 */
export interface PayslipCsvUploadParams {
  companyId: number
  rows:      PayslipCsvRow[]
  fileName:  string
}

/** 필수 헤더 키 목록 */
export const REQUIRED_PAYSLIP_KEYS = ['email', 'pay_month', 'base_salary'] as const
export type RequiredPayslipKey = (typeof REQUIRED_PAYSLIP_KEYS)[number]

/** 필수 헤더 한글 라벨 */
export const REQUIRED_PAYSLIP_LABELS: Record<RequiredPayslipKey, string> = {
  email:       '이메일',
  pay_month:   '귀속월(YYYY-MM)',
  base_salary: '기본급',
}

/* ── 하위 호환성 유지 ─────────────────────────────────────── */
/** @deprecated REQUIRED_PAYSLIP_KEYS 사용 권장 */
export const REQUIRED_PAYSLIP_HEADERS = REQUIRED_PAYSLIP_KEYS
/** @deprecated REQUIRED_PAYSLIP_LABELS 사용 권장 */
export const PAYSLIP_HEADER_LABELS = REQUIRED_PAYSLIP_LABELS as Record<string, string>
