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
  is_contract: string        // "Y" = 계약직, 그 외 = 정규직
  contract_end_date: string  // YYYY-MM-DD (계약직인 경우)
  weekly_work_hours: string  // 숫자 (예: 40)
  is_foreigner: string       // "Y" = 외국인, 그 외 = 내국인
  nationality: string        // 국가명
  visa_type: string          // 비자유형
  registration_number: string // 주민(외국인)등록번호 (XXXXXX-XXXXXXX)
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
  'is_contract',
  'contract_end_date',
  'weekly_work_hours',
  'is_foreigner',
  'nationality',
  'visa_type',
  'registration_number',
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
  is_contract:        '계약직여부 (Y/N)',
  contract_end_date:  '계약만료일 (YYYY-MM-DD)',
  weekly_work_hours:  '1주소정근로시간',
  is_foreigner:        '외국인여부 (Y/N)',
  nationality:         '국가',
  visa_type:           '비자유형',
  registration_number: '주민(외국인)등록번호',
}

/** employment_status 허용값 */
export const VALID_EMPLOYMENT_STATUS = ['active', 'inactive'] as const
