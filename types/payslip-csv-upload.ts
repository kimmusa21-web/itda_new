/* ================================================================
   itda — 급여 간편 CSV 업로드 타입
   pay_info_v2에 upsert (company_id, employee_id, accrual_month)
================================================================ */

/** CSV 원본 행 (헤더 기준) */
export interface PayslipCsvRow {
  email:        string
  pay_month:    string   // YYYY-MM
  base_salary:  string
  bonus:        string
  allowance:    string
  deduction:    string
  payment_date: string   // optional, YYYY-MM-DD
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

/** CSV 헤더 목록 (순서 고정) */
export const PAYSLIP_CSV_HEADERS = [
  'email', 'pay_month', 'base_salary', 'bonus', 'allowance', 'deduction', 'payment_date',
] as const
export type PayslipCsvHeader = (typeof PAYSLIP_CSV_HEADERS)[number]

/** 필수 헤더 */
export const REQUIRED_PAYSLIP_HEADERS: PayslipCsvHeader[] = ['email', 'pay_month', 'base_salary']

/** 헤더 한글 라벨 */
export const PAYSLIP_HEADER_LABELS: Record<PayslipCsvHeader, string> = {
  email:        '이메일',
  pay_month:    '귀속월(YYYY-MM)',
  base_salary:  '기본급',
  bonus:        '상여금',
  allowance:    '수당',
  deduction:    '공제액',
  payment_date: '지급일(YYYY-MM-DD)',
}
