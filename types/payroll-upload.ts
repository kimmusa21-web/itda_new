/* ================================================================
   itda — CSV 업로드 타입 정의 (pay_info_v2 구조 기반)
================================================================ */

export type MappingGroup = 'meta' | 'earnings' | 'deductions'

/** column_mappings DB Row */
export interface ColumnMapping {
  id:              number
  company_id:      number
  csv_column_name: string        // CSV 헤더명
  db_key:          string        // pay_info_v2 earnings/deductions JSON 키
  group_type:      MappingGroup
  label_ko:        string | null
  is_required:     boolean
  sort_order:      number
}

/** papaparse가 파싱한 CSV 1행 */
export type CsvRow = Record<string, string>

/** 검증 오류 1건 */
export type ValidationSeverity = 'error' | 'warning'

export interface ValidationError {
  rowIndex: number               // 1-based (헤더 제외)
  email?:   string
  reason:   string
  severity: ValidationSeverity
}

/** 검증 결과 전체 */
export interface ValidationResult {
  totalRows:   number
  validRows:   number
  ignoredRows: number
  errorRows:   number
  canUpload:   boolean           // severity=error가 없어야 true
  errors:      ValidationError[]
}

/** pay_info_v2 upsert용 페이로드 */
export interface PayInfoPayload {
  company_id:       number
  employee_id:      number
  accrual_month:    string       // YYYY-MM
  payment_date:     string | null
  start_date?:      string | null  // 정산시작일 YYYY-MM-DD
  end_date?:        string | null  // 정산종료일 YYYY-MM-DD
  work_days:        number | null
  overtime_hours:   number | null
  // pay_info 흡수 컬럼 (선택)
  Number_of_days?:   number | null   // 정산기간 총 일수
  Total_tax_salary?: number | null   // 과세급여합계
  // 지급 항목 개별 컬럼 (JSONB와 1:1 대응)
  base_salary?:               number | null
  overtime_pay_fixed?:        number | null
  overtime_pay?:              number | null
  holidaytime_pay?:           number | null
  nighttime_pay?:             number | null
  meal_allowance?:            number | null
  incentive?:                 number | null
  annual_leave_allowance?:    number | null
  Other_allowances?:          number | null
  Other_allowances2?:         number | null
  Holiday_bonus?:             number | null
  Total_payment?:             number | null
  // 공제 항목 개별 컬럼
  national_pension?:           number | null
  health_insurance?:           number | null
  longterm_care?:              number | null
  employment_insurance?:       number | null
  income_tax?:                 number | null
  resident_tax?:               number | null
  student_loan?:               number | null
  income_tax_refund?:          number | null
  resident_tax_refund?:        number | null
  Total_deductible?:           number | null
  Other_deductions?:           number | null
  health_insurance_adjustment?: number | null
  // JSONB (표시용)
  earnings:         Record<string, number>
  deductions:       Record<string, number>
  total_earnings:   number
  total_deductions: number
  net_pay:          number
  calculation_notes: string[]
  upload_log_id?:   number | null
}

/** 직원 마스터 (이메일 매핑용) */
export interface EmployeeMaster {
  id:         number
  email:      string
  name:       string
  company_id: number
}

/** 미리보기 행 */
export type PreviewStatus = 'valid' | 'error' | 'ignored'

export interface PreviewRow {
  rowIndex:        number
  email:           string
  employeeName:    string
  accrualMonth:    string
  paymentDate:     string
  startDate?:      string   // 정산시작일 YYYY-MM-DD
  endDate?:        string   // 정산종료일 YYYY-MM-DD
  earnings:        Record<string, number>
  deductions:      Record<string, number>
  totalEarnings:   number
  totalDeductions: number
  netPay:          number
  totalTaxSalary?: number | null  // 과세급여합계
  status:          PreviewStatus
  errorReason?:    string
}

/** upload_logs INSERT 파라미터 */
export interface UploadLogParams {
  company_id:    number
  accrual_month: string
  payment_date:  string | null
  file_name:     string
  uploaded_by:   string
  total_rows:    number
  success_rows:  number
  ignored_rows:  number
  error_rows:    number
  status:        'success' | 'failed'
  note?:         string
  error_detail?: ValidationError[]
}
