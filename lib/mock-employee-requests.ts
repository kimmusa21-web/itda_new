/* ================================================================
   itda — 직원 가입신청 타입 · Mock 데이터 · API 함수
================================================================ */

export type EmployeeRequestStatus = 'pending' | 'approved' | 'rejected'

export interface EmployeeRequest {
  id: string
  companyId: string
  companyName: string
  requestedBy: string
  requestedByName: string
  // 기본 정보
  name: string
  email: string
  birthDate: string        // YYMMDD
  gender: 'male' | 'female'
  phone: string
  // 조직 정보
  department: string
  position: string
  jobTitle: string
  jobLevel: string
  jobDescription: string
  workLocation: string
  // 근무·급여
  joinDate: string
  salaryType: 'annual' | 'monthly'
  salaryAmount: number
  salaryBasis: 'gross' | 'net'
  // 워크플로우
  status: EmployeeRequestStatus
  rejectionReason?: string
  createdAt: string
  reviewedAt?: string
}

/* ── Mock 데이터 ─────────────────────────────────────── */
export const mockEmployeeRequests: EmployeeRequest[] = [
  {
    id: 'req-001',
    companyId: 'co-1', companyName: '브이에이성형외과',
    requestedBy: 'usr-m1', requestedByName: '이담당',
    name: '홍길동', email: 'hong@va.kr', birthDate: '901225',
    gender: 'male', phone: '010-1234-5678',
    department: '간호팀', position: '사원',
    jobTitle: '간호사', jobLevel: '4급',
    jobDescription: '외래 간호 업무 및 수술 보조',
    workLocation: '서울 강남 본점',
    joinDate: '2026-04-01',
    salaryType: 'monthly', salaryAmount: 2_800_000, salaryBasis: 'gross',
    status: 'pending',
    createdAt: '2026-03-20T10:00:00Z',
  },
  {
    id: 'req-002',
    companyId: 'co-1', companyName: '브이에이성형외과',
    requestedBy: 'usr-m1', requestedByName: '이담당',
    name: '김수진', email: 'sujin@va.kr', birthDate: '950315',
    gender: 'female', phone: '010-5678-1234',
    department: '원무팀', position: '주임',
    jobTitle: '원무주임', jobLevel: '3급',
    jobDescription: '환자 접수 및 보험 청구 업무',
    workLocation: '서울 강남 본점',
    joinDate: '2026-04-15',
    salaryType: 'monthly', salaryAmount: 2_500_000, salaryBasis: 'gross',
    status: 'pending',
    createdAt: '2026-03-21T14:30:00Z',
  },
  {
    id: 'req-003',
    companyId: 'co-2', companyName: '브이에이뷰티랩',
    requestedBy: 'usr-m2', requestedByName: '박담당',
    name: '이미래', email: 'mirae@vabeauty.kr', birthDate: '920708',
    gender: 'female', phone: '010-9876-5432',
    department: '뷰티팀', position: '사원',
    jobTitle: '피부관리사', jobLevel: '4급',
    jobDescription: '피부 시술 및 고객 케어',
    workLocation: '서울 강남 지점',
    joinDate: '2026-04-01',
    salaryType: 'monthly', salaryAmount: 2_600_000, salaryBasis: 'gross',
    status: 'pending',
    createdAt: '2026-03-22T09:15:00Z',
  },
  {
    id: 'req-004',
    companyId: 'co-2', companyName: '브이에이뷰티랩',
    requestedBy: 'usr-m2', requestedByName: '박담당',
    name: '윤서연', email: 'seoyeon@vabeauty.kr', birthDate: '970428',
    gender: 'female', phone: '010-2222-3333',
    department: '뷰티팀', position: '주임',
    jobTitle: '뷰티 디렉터', jobLevel: '3급',
    jobDescription: '고객 상담 및 시술 기획',
    workLocation: '서울 강남 지점',
    joinDate: '2026-05-01',
    salaryType: 'monthly', salaryAmount: 2_900_000, salaryBasis: 'net',
    status: 'approved',
    createdAt: '2026-03-10T11:00:00Z',
    reviewedAt: '2026-03-12T10:00:00Z',
  },
  {
    id: 'req-005',
    companyId: 'co-3', companyName: '핏에이치알',
    requestedBy: 'usr-m3', requestedByName: '최담당',
    name: '박철수', email: 'cheolsu@fithr.kr', birthDate: '880512',
    gender: 'male', phone: '010-3333-4444',
    department: '운영팀', position: '팀장',
    jobTitle: 'HR 매니저', jobLevel: '2급',
    jobDescription: 'HR 운영 및 채용 관리',
    workLocation: '서울 서초 사무소',
    joinDate: '2026-04-01',
    salaryType: 'annual', salaryAmount: 52_000_000, salaryBasis: 'gross',
    status: 'approved',
    createdAt: '2026-03-08T09:00:00Z',
    reviewedAt: '2026-03-09T14:00:00Z',
  },
  {
    id: 'req-006',
    companyId: 'co-1', companyName: '브이에이성형외과',
    requestedBy: 'usr-m1', requestedByName: '이담당',
    name: '정은지', email: 'eunji@va.kr', birthDate: '930920',
    gender: 'female', phone: '010-7777-8888',
    department: '마취팀', position: '사원',
    jobTitle: '마취 간호사', jobLevel: '3급',
    jobDescription: '수술 마취 보조 업무',
    workLocation: '서울 강남 본점',
    joinDate: '2026-03-01',
    salaryType: 'monthly', salaryAmount: 3_200_000, salaryBasis: 'gross',
    status: 'rejected',
    rejectionReason: '동일 이메일로 이미 계정이 존재합니다. 이메일 확인 후 재신청 바랍니다.',
    createdAt: '2026-03-05T08:00:00Z',
    reviewedAt: '2026-03-06T09:30:00Z',
  },
]

/* ── Mock API 함수 ─────────────────────────────────────
   실제 Supabase 연동 시 이 함수들만 교체하면 됩니다.
   approve → supabase.from('employee_requests').update({status:'approved'})
   reject  → supabase.from('employee_requests').update({status:'rejected', reject_reason})
──────────────────────────────────────────────────── */
export async function approveRequest(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await new Promise(r => setTimeout(r, 900))
  return { success: true }
}

export async function rejectRequest(
  id: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  await new Promise(r => setTimeout(r, 900))
  if (!reason.trim()) return { success: false, error: '거절 사유를 입력해주세요' }
  return { success: true }
}
