/* ================================================================
   itda — 직원 CSV 대량 등록 타입 정의
================================================================ */

/** CSV 1행 (파싱 후 raw 데이터) */
export interface EmployeeCsvRawRow {
  name: string
  email: string
  employee_number: string
  department: string
  position: string
  phone: string
  join_date: string
  employment_status: string
}

/** 행별 업로드 결과 */
export interface EmployeeUploadRowResult {
  rowNumber: number
  rawData: EmployeeCsvRawRow
  status: 'success' | 'failure'
  reasons?: string[]
}

/** 전체 업로드 결과 */
export interface EmployeeUploadResult {
  totalCount: number
  successCount: number
  failureCount: number
  successes: EmployeeUploadRowResult[]
  failures: EmployeeUploadRowResult[]
}

/** Server Action 파라미터 */
export interface BulkUploadParams {
  companyId: number
  rows: EmployeeCsvRawRow[]
  fileName: string
}

/** CSV 헤더 정의 */
export const EMPLOYEE_CSV_HEADERS = [
  'name',
  'email',
  'employee_number',
  'department',
  'position',
  'phone',
  'join_date',
  'employment_status',
] as const

export type EmployeeCsvHeader = typeof EMPLOYEE_CSV_HEADERS[number]

/** 필수 컬럼 (사번은 자동 생성이므로 불필요) */
export const REQUIRED_CSV_HEADERS: EmployeeCsvHeader[] = [
  'name',
  'email',
]

/** 컬럼 한글 라벨 */
export const CSV_HEADER_LABELS: Record<EmployeeCsvHeader, string> = {
  name:               '이름',
  email:              '이메일',
  employee_number:    '사번',
  department:         '부서',
  position:           '직위',
  phone:              '전화번호',
  join_date:          '입사일 (YYYY-MM-DD)',
  employment_status:  '재직상태 (active/inactive)',
}

/** employment_status 허용값 */
export const VALID_EMPLOYMENT_STATUS = ['active', 'inactive'] as const
