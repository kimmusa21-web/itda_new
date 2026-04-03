/* ================================================================
   itda — employee_requests 타입 정의
   실제 DB 컬럼명과 1:1 매핑 (reject_reason 사용)
================================================================ */

export type EmployeeRequestStatus = 'pending' | 'approved' | 'rejected'
export type Gender      = 'male' | 'female'
export type SalaryType  = 'annual' | 'monthly'
export type SalaryBasis = 'gross' | 'net'

/** DB Row 그대로 */
export interface EmployeeRequestRow {
  id:            number
  company_id:    number
  requested_by:  string | null
  name:          string
  email:         string
  birthdate:     string | null
  gender:        Gender | null
  phone:         string | null
  department:    string | null
  position:      string | null
  job:           string | null
  grade:         string | null
  role_title:    string | null
  work_details:  string | null
  work_location: string | null
  join_date:     string | null
  salary_type:   SalaryType | null
  salary_amount: number | null
  salary_basis:  SalaryBasis | null
  status:        EmployeeRequestStatus
  reject_reason: string | null   // ★ 실제 컬럼명
  reviewed_by:   string | null
  reviewed_at:   string | null
  employee_id:   number | null
  created_at:    string
  updated_at:    string
  // JOIN
  companies?:  { name: string } | null
  requester?:  { name: string | null; email: string } | null
}

/** UI에서 사용하는 가공 타입 */
export interface EmployeeRequest {
  id:              string
  companyId:       string
  companyName:     string
  requestedBy:     string
  requestedByName: string
  // 기본 정보
  name:            string
  email:           string
  birthDate:       string
  gender:          Gender
  phone:           string
  // 조직
  department:      string
  position:        string
  jobTitle:        string
  jobLevel:        string
  jobDescription:  string
  workLocation:    string
  // 근무·급여
  joinDate:        string
  salaryType:      SalaryType
  salaryAmount:    number
  salaryBasis:     SalaryBasis
  // 워크플로우
  status:          EmployeeRequestStatus
  rejectionReason: string | undefined
  reviewedAt:      string | undefined
  reviewedBy:      string | undefined
  createdAt:       string
}

/** DB Row → UI 타입 */
export function mapRowToRequest(row: EmployeeRequestRow): EmployeeRequest {
  return {
    id:              String(row.id),
    companyId:       String(row.company_id),
    companyName:     row.companies?.name ?? '—',
    requestedBy:     row.requested_by ?? '',
    requestedByName: row.requester?.name ?? row.requester?.email ?? '—',
    name:            row.name,
    email:           row.email,
    birthDate:       row.birthdate ?? '',
    gender:          row.gender ?? 'male',
    phone:           row.phone ?? '',
    department:      row.department ?? '',
    position:        row.position ?? '',
    jobTitle:        row.job ?? '',
    jobLevel:        row.grade ?? '',
    jobDescription:  row.work_details ?? '',
    workLocation:    row.work_location ?? '',
    joinDate:        row.join_date ?? '',
    salaryType:      row.salary_type ?? 'monthly',
    salaryAmount:    row.salary_amount ?? 0,
    salaryBasis:     row.salary_basis ?? 'gross',
    status:          row.status,
    rejectionReason: row.reject_reason ?? undefined,
    reviewedAt:      row.reviewed_at ?? undefined,
    reviewedBy:      row.reviewed_by ?? undefined,
    createdAt:       row.created_at,
  }
}
