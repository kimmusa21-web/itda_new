/**
 * 회사별 기능 활성화 정의
 * 추후 플랜 기반 결제 시스템 도입 시 plan → features 매핑으로 확장
 */

export type FeatureKey = 'employees' | 'attendance' | 'leave' | 'documents' | 'payroll'

export interface CompanyFeatures {
  employees:  boolean  // 직원관리 — 기본 기능, 항상 활성화
  attendance: boolean  // 근태관리
  leave:      boolean  // 연차관리
  documents:  boolean  // 서류발급관리
  payroll:    boolean  // 급여관리
}

export const DEFAULT_FEATURES: CompanyFeatures = {
  employees:  true,
  attendance: false,
  leave:      false,
  documents:  false,
  payroll:    false,
}

export interface FeatureDef {
  label:       string
  description: string
  required?:   boolean  // true면 비활성화 불가
}

export const FEATURE_DEFS: Record<FeatureKey, FeatureDef> = {
  employees: {
    label:       '직원관리',
    description: '직원 등록·수정·퇴사, 계정 초대',
    required:    true,
  },
  attendance: {
    label:       '근태관리',
    description: '출퇴근 기록, 지각·결근·초과근무 관리',
  },
  leave: {
    label:       '연차관리',
    description: '연차 발생·사용·잔여 관리, 연차 신청/승인',
  },
  documents: {
    label:       '서류발급관리',
    description: '재직증명서, 경력증명서 등 문서 발급',
  },
  payroll: {
    label:       '급여관리',
    description: '급여 계산, 명세서 발행, 급여대장 관리',
  },
}

export const FEATURE_KEYS = Object.keys(FEATURE_DEFS) as FeatureKey[]

/** DB에서 읽은 raw JSONB → CompanyFeatures (누락 키를 DEFAULT로 채움) */
export function parseFeatures(raw: Record<string, boolean> | null | undefined): CompanyFeatures {
  if (!raw) return { ...DEFAULT_FEATURES }
  return {
    employees:  raw.employees  ?? true,
    attendance: raw.attendance ?? false,
    leave:      raw.leave      ?? false,
    documents:  raw.documents  ?? false,
    payroll:    raw.payroll    ?? false,
  }
}
