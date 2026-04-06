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
  work_days:        number | null
  overtime_hours:   number | null
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
  earnings:        Record<string, number>
  deductions:      Record<string, number>
  totalEarnings:   number
  totalDeductions: number
  netPay:          number
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
