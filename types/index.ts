/* ================================================================
   itda — 공통 타입 정의 (MVP 최종본)
   pay_info_v2 기반 JSON 구조
================================================================ */

export type Role = 'admin' | 'manager' | 'employee'

// ── 프로필 ────────────────────────────────────────────────────
export interface Profile {
  id: string
  email: string
  name: string | null
  role: Role
  company_id: number | null
  phone: string | null
  position: string | null
  department: string | null
  avatar_color: string
  created_at: string
  updated_at: string
}

// ── 회사 ─────────────────────────────────────────────────────
export interface Company {
  id: number
  name: string
  biz_number: string | null
  representative: string | null
  'Business type': string | null
  Industry: string | null
  Telephone: string | null
  address: string | null
  'tax invoice email': string | null
  // 신규 추가 (migration 20260406)
  status: 'active' | 'inactive'
  contact_name: string | null
  contact_email: string | null
  deleted_at: string | null
  // 신규 추가 (migration 20260411)
  payroll_day: number | null
  // 신규 추가 (migration 20260412)
  payroll_start_day: number | null
}

// ── 알림 ─────────────────────────────────────────────────────
export interface Notification {
  id: number
  user_id: string
  type: string
  title: string
  message: string | null
  target_id: string | null
  is_read: boolean
  created_at: string
}

// ── 직원 인증코드 ────────────────────────────────────────────
export interface VerificationCode {
  id: number
  request_id: number
  email: string
  code_hash: string
  expires_at: string
  verified_at: string | null
  created_at: string
}

// ── 직원 ─────────────────────────────────────────────────────
export interface Employee {
  id: number
  name: string
  email: string
  birthdate: string | null
  company_id: number
  department: string | null
  position: string | null
  Grade: string | null
  Role: string | null
  job: string | null
  Tel: string | null
  Sex: string | null
  Date_of_joining: string | null
  quit_date: string | null
  user_id: string | null
  is_active: boolean
  is_contract: boolean
  contract_end_date: string | null
}

// ── 급여 (MVP JSON 구조) ─────────────────────────────────────
export interface PayInfoV2 {
  id: number
  company_id: number
  employee_id: number
  accrual_month: string           // YYYY-MM
  payment_date: string | null
  work_days: number | null
  overtime_hours: number | null
  // 정산기간 (선택)
  start_date?: string | null       // DATE (YYYY-MM-DD)
  end_date?: string | null         // DATE (YYYY-MM-DD)
  // 근로시간/연차 (선택)
  Over_time?: number | null
  Holiday_working_hours?: number | null
  night_work_hours?: number | null
  Remaining_annual_leave_hours?: number | null
  // pay_info 흡수 컬럼 (선택)
  Number_of_days?: number | null     // 정산기간 총 일수
  Total_tax_salary?: number | null   // 과세급여합계
  earnings: Record<string, number>
  deductions: Record<string, number>
  total_earnings: number
  total_deductions: number
  net_pay: number
  calculation_notes: string[]
  upload_log_id: number | null
  created_at: string
  updated_at: string
  // join
  employees?: {
    name: string
    email: string
    employee_number: string | null
    Date_of_joining: string | null
    department: string | null
    position: string | null
    birthdate: string | null
  }
  companies?: { name: string; payslip_note?: string | null; payroll_start_day?: number | null }
}

// ── 업로드 로그 ────────────────────────────────────────────
export interface UploadLog {
  id: number
  company_id: number
  accrual_month: string
  uploaded_by: string | null
  file_name: string | null
  total_rows: number
  success_rows: number
  error_rows: number
  error_detail: UploadError[] | null
  created_at: string
  companies?: { name: string }
}

export interface UploadError {
  rowIndex: number
  email?: string
  reason: string
}

// ── 직원 가입신청 ─────────────────────────────────────────
export interface EmployeeRequest {
  id: number
  company_id: number
  name: string
  email: string
  birthdate: string | null
  gender: 'male' | 'female' | null
  phone: string | null
  department: string | null
  position: string | null
  job: string | null
  grade: string | null
  join_date: string | null
  salary_type: 'annual' | 'monthly' | null
  salary_amount: number | null
  salary_basis: 'gross' | 'net' | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

// ── 기업 가입신청 ─────────────────────────────────────────
export interface CompanyAdminRequest {
  id: number
  company_name: string | null
  biz_number: string | null
  representative: string | null
  admin_name: string | null
  admin_email: string | null
  admin_phone: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reject_reason: string | null
}

// ── CSV 관련 ──────────────────────────────────────────────
export type CsvRow = Record<string, string>

export interface ParsedRow {
  rowIndex: number
  email: string
  employeeName: string
  accrualMonth: string
  paymentDate: string
  earnings: Record<string, number>
  deductions: Record<string, number>
  totalEarnings: number
  totalDeductions: number
  netPay: number
  status: 'valid' | 'error' | 'ignored'
  errorReason?: string
}

export interface ColumnMapping {
  csvColumn: string
  dbKey: string
  label: string
  group: 'meta' | 'earnings' | 'deductions'
  required: boolean
}

// ── 급여 항목 한글 레이블 ─────────────────────────────────
export const EARNINGS_LABELS: Record<string, string> = {
  base_salary:            '기본급',
  overtime_pay_fixed:     '고정연장근로수당',
  overtime_pay:           '연장근로수당',
  holidaytime_pay:        '휴일근로수당',
  nighttime_pay:          '야간근로수당',
  meal_allowance:         '식대',
  incentive:              '인센티브',
  annual_leave_allowance: '잔여연차수당',
  Other_allowances:       '기타수당1',
  Other_allowances2:      '기타수당2',
  Holiday_bonus:          '명절상여',
}

export const DEDUCTIONS_LABELS: Record<string, string> = {
  national_pension:             '국민연금',
  health_insurance:             '건강보험',
  longterm_care:                '장기요양보험료',
  employment_insurance:         '고용보험',
  income_tax:                   '소득세',
  resident_tax:                 '지방소득세',
  income_tax_refund:            '소득세환급',
  resident_tax_refund:          '지방소득세환급',
  health_insurance_adjustment:  '건강보험료정산',
  student_loan:                 '학자금대출',
  Other_deductions:             '기타공제',
}

export function getEarningLabel(key: string): string {
  return EARNINGS_LABELS[key] ?? key
}

export function getDeductionLabel(key: string): string {
  return DEDUCTIONS_LABELS[key] ?? key
}
