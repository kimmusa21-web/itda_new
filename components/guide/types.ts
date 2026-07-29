import type { ReactNode } from 'react'
import type { FeatureKey } from '@/lib/features'

/** 오른쪽 설명 한 줄 (①②③… 번호가 자동으로 붙음) */
export interface GuideNote {
  /** 설명 본문 */
  text: string
  /** 강조 표시 (굵게 + 밑줄) */
  strong?: boolean
  /** 하위 항목 */
  sub?: string[]
}

/** 사용설명서 한 페이지 = 왼쪽 화면 그림 + 오른쪽 설명 */
export interface GuideStep {
  id: string
  /** 페이지 제목 */
  title: string
  /** 해당 화면 경로 (예: 홈 > 직원관리) */
  path?: string
  /** 회사 기능 활성화 조건 — 하나라도 켜져 있으면 노출 */
  featureKeys?: FeatureKey[]
  /** 왼쪽 화면 목업 */
  screen: ReactNode
  /** 오른쪽 번호 설명 */
  notes: GuideNote[]
  /** 참고 박스 */
  tip?: string
  /** 주의 박스 */
  warn?: string
}
