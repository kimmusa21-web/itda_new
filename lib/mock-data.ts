/* ================================================================
   itda — 통합 Mock 데이터 (MVP 최종본)
   pay_info_v2 JSON 구조 기반
================================================================ */

import type { Company, PayInfoV2, UploadLog, EmployeeRequest } from '@/types'

/* ================================================================
   타입 정의 — 컴포넌트(EmployeeCard, NoticeCard)에서 import
================================================================ */

/** 화면 표시용 직원 타입 (DB Employee와 별도) */
export interface MockEmployee {
  id:             number
  name:           string
  email:          string
  company:        string             // 회사명 (문자열)
  department:     string
  position:       string
  joinDate:       string             // YYYY-MM-DD
  status:         'active' | 'inactive'
  avatarBg:       string             // Tailwind / CSS 색상값
  avatarInitials: string             // 이니셜 2자
  role?:          string
  grade?:         string
  phone?:         string
}

/** 공지사항 타입 */
export interface Notice {
  id:        string
  title:     string
  preview:   string
  content?:  string
  createdAt: string                  // YYYY-MM-DD
  author:    string
  category?: string
}

/** 사용자 타입 (mockUsers에서 사용) */
export interface MockUser {
  id:             string
  name:           string
  email:          string
  role:           'admin' | 'manager' | 'employee'
  company:        string
  companyId:      number
  department:     string
  position:       string
  joinDate:       string
  avatarBg:       string
  avatarInitials: string
}

/** 목록용 간단 급여 타입 */
export interface MockPayslip {
  id:              number
  employeeId:      number
  month:           string    // YYYY-MM — formatMonth()에서 사용
  accrualMonth:    string    // YYYY-MM (month와 동일)
  paymentDate:     string
  totalEarnings:   number
  totalDeductions: number
  netPay:          number
  status:          'paid' | 'pending'
}

/* ================================================================
   회사
================================================================ */
export const mockCompanies: Company[] = [
  {
    id: 1, name: '브이에이성형외과', biz_number: '123-45-67890',
    representative: '박원장', 'Business type': '의료업', Industry: '성형외과',
    Telephone: '02-1234-5678', address: '서울시 강남구',
    'tax invoice email': 'tax@va.kr',
    status: 'active', contact_name: null, contact_email: null, deleted_at: null,
  },
  {
    id: 2, name: '브이에이뷰티랩', biz_number: '234-56-78901',
    representative: '이원장', 'Business type': '의료업', Industry: '피부과',
    Telephone: '02-2345-6789', address: '서울시 강남구',
    'tax invoice email': 'tax@vabeauty.kr',
    status: 'active', contact_name: null, contact_email: null, deleted_at: null,
  },
  {
    id: 3, name: '핏에이치알', biz_number: '345-67-89012',
    representative: '최대표', 'Business type': '서비스업', Industry: 'HR컨설팅',
    Telephone: '02-3456-7890', address: '서울시 서초구',
    'tax invoice email': 'tax@fithr.kr',
    status: 'active', contact_name: null, contact_email: null, deleted_at: null,
  },
]

/* ================================================================
   직원 (EmployeeCard 전용 MockEmployee 타입)
================================================================ */
export const mockEmployees: MockEmployee[] = [
  { id: 1,  name: '차혜진', email: 'neocha78@naver.com',   company: '브이에이성형외과',
    department: '원무팀', position: '팀장',  joinDate: '2025-02-14', status: 'active',
    avatarBg: '#6366f1', avatarInitials: '차혜', role: '팀장',   grade: '2급', phone: '010-1111-2222' },
  { id: 5,  name: '이정민', email: 'olive8212@naver.com',  company: '브이에이성형외과',
    department: '간호팀', position: '주임',  joinDate: '2025-07-14', status: 'active',
    avatarBg: '#ec4899', avatarInitials: '이정', role: '간호주임', grade: '3급', phone: '010-3333-4444' },
  { id: 6,  name: '김혜영', email: 'rlagd613@naver.com',   company: '브이에이성형외과',
    department: '원무팀', position: '사원',  joinDate: '2025-03-17', status: 'active',
    avatarBg: '#f59e0b', avatarInitials: '김혜', role: '원무사원', grade: '4급', phone: '010-5555-6666' },
  { id: 7,  name: '김세현', email: 'sh_0124@nate.com',     company: '브이에이성형외과',
    department: '간호팀', position: '부실장', joinDate: '2025-04-28', status: 'active',
    avatarBg: '#10b981', avatarInitials: '김세', role: '부실장', grade: '2급', phone: '010-7777-8888' },
  { id: 9,  name: '최은심', email: 'ces841028@naver.com',  company: '브이에이뷰티랩',
    department: '뷰티팀', position: '팀장',  joinDate: '2025-04-14', status: 'active',
    avatarBg: '#8b5cf6', avatarInitials: '최은', role: '팀장',   grade: '2급', phone: '010-9999-0000' },
  { id: 11, name: '박희진', email: 'gmlwls2779@naver.com', company: '브이에이뷰티랩',
    department: '뷰티팀', position: '주임',  joinDate: '2025-05-06', status: 'active',
    avatarBg: '#3b82f6', avatarInitials: '박희', role: '주임',   grade: '3급', phone: '010-1212-3434' },
  { id: 12, name: '강가혜', email: 'gahye63@naver.com',    company: '브이에이뷰티랩',
    department: '뷰티팀', position: '사원',  joinDate: '2026-01-26', status: 'active',
    avatarBg: '#14b8a6', avatarInitials: '강가', role: '사원',   grade: '4급', phone: '010-5656-7878' },
  { id: 2,  name: '김상완', email: 'kimmusa@gmail.com',    company: '핏에이치알',
    department: '운영팀', position: '사원',  joinDate: '2025-07-14', status: 'active',
    avatarBg: '#f97316', avatarInitials: '김상', role: '사원',   grade: '4급', phone: '010-0000-1111' },
]

/* ================================================================
   ★ mockUsers — profile/page.tsx, manager/*.tsx에서 사용
   mockUsers.employee / mockUsers.manager 로 접근
================================================================ */
export const mockUsers: Record<'admin' | 'manager' | 'employee', MockUser> = {
  admin: {
    id:             'admin-001',
    name:           '김관리',
    email:          'kimmusa21@gmail.com',
    role:           'admin',
    company:        '핏에이치알',
    companyId:      3,
    department:     '운영팀',
    position:       '어드민',
    joinDate:       '2025-01-01',
    avatarBg:       '#0f172a',
    avatarInitials: '김관',
  },
  manager: {
    id:             'manager-001',
    name:           '박담당',
    email:          'manager@va.kr',
    role:           'manager',
    company:        '브이에이성형외과',
    companyId:      1,
    department:     '인사팀',
    position:       '팀장',
    joinDate:       '2024-03-01',
    avatarBg:       '#2563eb',
    avatarInitials: '박담',
  },
  employee: {
    id:             'employee-001',
    name:           '이정민',
    email:          'olive8212@naver.com',
    role:           'employee',
    company:        '브이에이성형외과',
    companyId:      1,
    department:     '간호팀',
    position:       '주임',
    joinDate:       '2025-07-14',
    avatarBg:       '#ec4899',
    avatarInitials: '이정',
  },
}

/* ================================================================
   ★ notices — manager/page.tsx에서 notices.slice(0,2).map() 사용
================================================================ */
export const notices: Notice[] = [
  {
    id:        'n1',
    title:     '2026년 3월 급여 지급 안내',
    preview:   '3월 급여는 4월 15일(수) 지급 예정입니다. 급여명세서를 확인해주세요.',
    content:   '3월 귀속 급여는 4월 15일(수)에 지급됩니다. 명세서는 급여조회 메뉴에서 확인 가능합니다.',
    createdAt: '2026-03-10',
    author:    '관리팀',
    category:  '급여',
  },
  {
    id:        'n2',
    title:     '4대보험 요율 변경 안내 (2026년)',
    preview:   '2026년 건강보험료율이 변경되었습니다. 명세서를 확인해주세요.',
    content:   '2026년 1월부터 건강보험료율이 3.545%로 변경됩니다.',
    createdAt: '2026-01-02',
    author:    '관리팀',
    category:  '공지',
  },
  {
    id:        'n3',
    title:     '2025년 연말정산 일정 안내',
    preview:   '2025년 귀속 연말정산이 2월 중 진행될 예정입니다.',
    content:   '2025년 귀속 연말정산을 2026년 2월 중 진행합니다.',
    createdAt: '2026-01-15',
    author:    '세무팀',
    category:  '세무',
  },
]

/** 하위 호환성: mockNotices → notices 별칭 */
export const mockNotices = notices

/* ================================================================
   ★ payslips — manager/page.tsx에서 payslips[0].month 사용
================================================================ */
export const payslips: MockPayslip[] = [
  {
    id:              1,
    employeeId:      5,
    month:           '2026-02',   // ★ formatMonth(latestPayslip.month) 에서 사용
    accrualMonth:    '2026-02',
    paymentDate:     '2026-03-15',
    totalEarnings:   8900000,
    totalDeductions: 710510,
    netPay:          8189490,
    status:          'paid',
  },
  {
    id:              2,
    employeeId:      5,
    month:           '2026-01',
    accrualMonth:    '2026-01',
    paymentDate:     '2026-02-15',
    totalEarnings:   3524574,
    totalDeductions: 529520,
    netPay:          2995054,
    status:          'paid',
  },
  {
    id:              3,
    employeeId:      5,
    month:           '2025-12',
    accrualMonth:    '2025-12',
    paymentDate:     '2026-01-15',
    totalEarnings:   3200000,
    totalDeductions: 490000,
    netPay:          2710000,
    status:          'paid',
  },
]

/* ================================================================
   급여 상세 (pay_info_v2 JSON 구조)
================================================================ */
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
    upload_log_id: null,
    created_at: '2026-03-15T09:00:00Z', updated_at: '2026-03-15T09:00:00Z',
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
    upload_log_id: null,
    created_at: '2026-03-15T09:00:00Z', updated_at: '2026-03-15T09:00:00Z',
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
    upload_log_id: null,
    created_at: '2026-02-15T09:00:00Z', updated_at: '2026-02-15T09:00:00Z',
    employees: { name: '이정민', email: 'olive8212@naver.com', Date_of_joining: '2025-07-14', department: '간호팀', position: '주임', birthdate: '820212' },
    companies: { name: '브이에이성형외과' },
  },
]

/* ================================================================
   업로드 로그
================================================================ */
export const mockUploadLogs: UploadLog[] = [
  {
    id: 1, company_id: 1, accrual_month: '2026-02', uploaded_by: 'admin',
    file_name: 'va_payroll_2026_02.csv', total_rows: 4, success_rows: 4,
    error_rows: 0, error_detail: null, created_at: '2026-03-15T09:00:00Z',
    companies: { name: '브이에이성형외과' },
  },
]

/* ================================================================
   직원 가입신청
================================================================ */
export const mockEmployeeRequests: EmployeeRequest[] = [
  {
    id: 1, company_id: 1, name: '홍길동', email: 'hong@va.kr',
    birthdate: '901225', gender: 'male', phone: '010-1234-5678',
    department: '간호팀', position: '사원', job: '간호보조', grade: '4급',
    join_date: '2026-04-01', salary_type: 'monthly', salary_amount: 2800000,
    salary_basis: 'gross', status: 'pending', created_at: '2026-03-20T10:00:00Z',
  },
]

/* ================================================================
   헬퍼 함수
================================================================ */
export function getEmployeeById(id: number): MockEmployee | undefined {
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
  return mockPayInfoV2.filter(
    p => p.company_id === companyId && p.accrual_month === month,
  )
}

export function getAvailableMonths(companyId: number): string[] {
  const months = [
    ...new Set(
      mockPayInfoV2.filter(p => p.company_id === companyId).map(p => p.accrual_month),
    ),
  ]
  return months.sort((a, b) => b.localeCompare(a))
}
