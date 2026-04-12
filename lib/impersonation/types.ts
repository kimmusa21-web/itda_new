/* ================================================================
   itda — 빙의(impersonation) 컨텍스트 타입 정의
================================================================ */

export type ImpersonationType = 'company_manager' | 'employee'

/**
 * admin이 특정 회사/직원 관점으로 점검할 때 쿠키에 저장되는 컨텍스트.
 * 실제 Supabase 세션(auth.user)은 변경하지 않으며,
 * 이 컨텍스트만 화면 렌더링에 영향을 준다.
 */
export interface ImpersonationContext {
  /** 빙의 타입: 회사 manager 모드 또는 특정 직원 employee 모드 */
  type: ImpersonationType
  /** 대상 회사 ID */
  companyId: number
  /** 대상 회사 이름 (표시용) */
  companyName: string
  /** employee 모드일 때 대상 직원 ID */
  employeeId: number | null
  /** employee 모드일 때 대상 직원 이름 (표시용) */
  employeeName: string | null
  /** employee 모드일 때 대상 직원 이메일 */
  employeeEmail: string | null
  /** 빙의를 시작한 admin의 user.id (세션 검증용) */
  adminUserId: string
  /** DB 로그 row의 UUID (종료 시 ended_at 업데이트용) */
  logId: string | null
  /** 빙의 시작 시각 (ISO string) */
  startedAt: string
}
