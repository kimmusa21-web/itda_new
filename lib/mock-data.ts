/* ================================================================
   itda — 통합 Mock 데이터 (MVP 최종본)
   pay_info_v2 JSON 구조 기반
================================================================ */

import type { Company, Employee, PayInfoV2, UploadLog, EmployeeRequest } from '@/types'

// ── 회사 ─────────────────────────────────────────────────────
export const mockCompanies: Company[] = [
  { id: 1, name: '브이에이성형외과', biz_number: '123-45-67890', representative: '박원장',
    'Business type': '의료업', Industry: '성형외과', Telephone: '02-1234-5678',
    address: '서울시 강남구', 'tax invoice email': 'tax@va.kr' },
  { id: 2, name: '브이에이뷰티랩',   biz_number: '234-56-78901', representative: '이원장',
    'Business type': '의료업', Industry: '피부과', Telephone: '02-2345-6789',
    address: '서울시 강남구', 'tax invoice email': 'tax@vabeauty.kr' },
  { id: 3, name: '핏에이치알',        biz_number: '345-67-89012', representative: '최대표',
    'Business type': '서비스업', Industry: 'HR컨설팅', Telephone: '02-3456-7890',
    address: '서울시 서초구', 'tax invoice email': 'tax@fithr.kr' },
]

// ── 직원 ─────────────────────────────────────────────────────
export const mockEmployees: Employee[] = [
  { id: 1,  name: '차혜진', email: 'neocha78@naver.com',    company_id: 1, department: '원무팀', position: '팀장', Grade: '2급', Role: '팀장',   job: '원무', Tel: '010-1111-2222', Sex: '여', Date_of_joining: '2025-02-14', quit_date: null, user_id: null, is_active: true, birthdate: '780928' },
  { id: 5,  name: '이정민', email: 'olive8212@naver.com',   company_id: 1, department: '간호팀', position: '주임', Grade: '3급', Role: '간호주임', job: '간호', Tel: '010-3333-4444', Sex: '여', Date_of_joining: '2025-07-14', quit_date: null, user_id: null, is_active: true, birthdate: '820212' },
  { id: 6,  name: '김혜영', email: 'rlagd613@naver.com',    company_id: 1, department: '원무팀', position: '사원', Grade: '4급', Role: '원무사원', job: '원무', Tel: '010-5555-6666', Sex: '여', Date_of_joining: '2025-03-17', quit_date: null, user_id: null, is_active: true, birthdate: '971008' },
  { id: 7,  name: '김세현', email: 'sh_0124@nate.com',      company_id: 1, department: '간호팀', position: '부실장', Grade: '2급', Role: '부실장', job: '간호', Tel: '010-7777-8888', Sex: '여', Date_of_joining: '2025-04-28', quit_date: null, user_id: null, is_active: true, birthdate: '920124' },
  { id: 9,  name: '최은심', email: 'ces841028@naver.com',   company_id: 2, department: '뷰티팀', position: '팀장', Grade: '2급', Role: '팀장',   job: '피부관리', Tel: '010-9999-0000', Sex: '여', Date_of_joining: '2025-04-14', quit_date: null, user_id: null, is_active: true, birthdate: '841028' },
  { id: 11, name: '박희진', email: 'gmlwls2779@naver.com',  company_id: 2, department: '뷰티팀', position: '주임', Grade: '3급', Role: '주임',   job: '피부관리', Tel: '010-1212-3434', Sex: '여', Date_of_joining: '2025-05-06', quit_date: null, user_id: null, is_active: true, birthdate: '990422' },
  { id: 12, name: '강가혜', email: 'gahye63@naver.com',     company_id: 2, department: '뷰티팀', position: '사원', Grade: '4급', Role: '사원',   job: '피부관리', Tel: '010-5656-7878', Sex: '여', Date_of_joining: '2026-01-26', quit_date: null, user_id: null, is_active: true, birthdate: '920603' },
  { id: 2,  name: '김상완', email: 'kimmusa@gmail.com',     company_id: 3, department: '운영팀', position: '사원', Grade: '4급', Role: '사원',   job: '운영', Tel: '010-0000-1111', Sex: '남', Date_of_joining: '2025-07-14', quit_date: null, user_id: null, is_active: true, birthdate: '850508' },
]

// ── 급여 (pay_info_v2 JSON 구조) ──────────────────────────
export const mockPayInfoV2: PayInfoV2[] = [
  {
    id: 1, company_id: 1, employee_id: 5,
    accrual_month: '2026-02', payment_date: '2026-03-15',
    work_days: 22, overtime_hours: 4,
    earnings: {
      base_salary: 2824574, overtime_pay_fixed: 500000,
      meal_allowance: 200000, Other_allowances: 5375426,
    },
    deductions: {
      national_pension: 139500, health_insurance: 115020,
      longterm_care: 14870, employment_insurance: 27000,
      income_tax: 376480, resident_tax: 37640,
    },
    total_earnings: 8900000, total_deductions: 710510, net_pay: 8189490,
    calculation_notes: [
      '월급제: 기본급 + 고정수당으로 산정됩니다.',
      '국민연금: 기준소득월액 × 4.5%',
      '건강보험: 기준소득월액 × 3.545%',
      '고용보험: 과세급여 × 0.9%',
      '소득세: 간이세액표 기준',
    ],
    upload_log_id: null, created_at: '2026-03-15T09:00:00Z', updated_at: '2026-03-15T09:00:00Z',
    employees: { name: '이정민', email: 'olive8212@naver.com', Date_of_joining: '2025-07-14', department: '간호팀', position: '주임', birthdate: '820212' },
    companies: { name: '브이에이성형외과' },
  },
  {
    id: 2, company_id: 1, employee_id: 1,
    accrual_month: '2026-02', payment_date: '2026-03-15',
    work_days: 22, overtime_hours: 0,
    earnings: {
      base_salary: 5227761, overtime_pay_fixed: 500000,
      meal_allowance: 200000, Other_allowances: 3426659,
    },
    deductions: {
      national_pension: 139500, health_insurance: 115020,
      longterm_care: 14870, employment_insurance: 27000,
      income_tax: 376480, resident_tax: 37640,
    },
    total_earnings: 9354420, total_deductions: 710510, net_pay: 8643910,
    calculation_notes: ['월급제 기준 산정', '국민연금 4.5% 적용'],
    upload_log_id: null, created_at: '2026-03-15T09:00:00Z', updated_at: '2026-03-15T09:00:00Z',
    employees: { name: '차혜진', email: 'neocha78@naver.com', Date_of_joining: '2025-02-14', department: '원무팀', position: '팀장', birthdate: '780928' },
    companies: { name: '브이에이성형외과' },
  },
  {
    id: 3, company_id: 1, employee_id: 5,
    accrual_month: '2026-01', payment_date: '2026-02-15',
    work_days: 23, overtime_hours: 2,
    earnings: { base_salary: 2824574, overtime_pay_fixed: 500000, meal_allowance: 200000 },
    deductions: { national_pension: 139500, health_insurance: 115020, income_tax: 250000, resident_tax: 25000 },
    total_earnings: 3524574, total_deductions: 529520, net_pay: 2995054,
    calculation_notes: ['월급제 기준 산정'],
    upload_log_id: null, created_at: '2026-02-15T09:00:00Z', updated_at: '2026-02-15T09:00:00Z',
    employees: { name: '이정민', email: 'olive8212@naver.com', Date_of_joining: '2025-07-14', department: '간호팀', position: '주임', birthdate: '820212' },
    companies: { name: '브이에이성형외과' },
  },
]

// ── 업로드 로그 ────────────────────────────────────────────
export const mockUploadLogs: UploadLog[] = [
  { id: 1, company_id: 1, accrual_month: '2026-02', uploaded_by: 'admin',
    file_name: 'va_payroll_2026_02.csv', total_rows: 4, success_rows: 4, error_rows: 0,
    error_detail: null, created_at: '2026-03-15T09:00:00Z', companies: { name: '브이에이성형외과' } },
]

// ── 직원 가입신청 ─────────────────────────────────────────
export const mockEmployeeRequests: EmployeeRequest[] = [
  { id: 1, company_id: 1, name: '홍길동', email: 'hong@va.kr', birthdate: '901225',
    gender: 'male', phone: '010-1234-5678', department: '간호팀', position: '사원',
    job: '간호보조', grade: '4급', join_date: '2026-04-01',
    salary_type: 'monthly', salary_amount: 2800000, salary_basis: 'gross',
    status: 'pending', created_at: '2026-03-20T10:00:00Z' },
]

// ── 공지사항 (mock) ───────────────────────────────────────
export const mockNotices = [
  { id: 'n1', title: '2026년 3월 급여 지급 안내', preview: '3월 급여는 4월 15일(수) 지급 예정입니다.', createdAt: '2026-03-10', author: '관리팀' },
  { id: 'n2', title: '4대보험 요율 변경 안내', preview: '2026년 건강보험료율이 변경되었습니다. 명세서를 확인해주세요.', createdAt: '2026-01-02', author: '관리팀' },
]

// ── 헬퍼 함수들 ──────────────────────────────────────────
export function getEmployeeById(id: number): Employee | undefined {
  return mockEmployees.find(e => e.id === id)
}

export function getPayslipsByEmployee(employeeId: number): PayInfoV2[] {
  return mockPayInfoV2
    .filter(p => p.employee_id === employeeId)
    .sort((a, b) => b.accrual_month.localeCompare(a.accrual_month))
}

export function getPayslipById(payInfoId: number): PayInfoV2 | undefined {
  return mockPayInfoV2.find(p => p.id === payInfoId)
}

export function getCompanyPayroll(companyId: number, month: string): PayInfoV2[] {
  return mockPayInfoV2.filter(p => p.company_id === companyId && p.accrual_month === month)
}

export function getAvailableMonths(companyId: number): string[] {
  const months = [...new Set(mockPayInfoV2.filter(p => p.company_id === companyId).map(p => p.accrual_month))]
  return months.sort((a, b) => b.localeCompare(a))
}
