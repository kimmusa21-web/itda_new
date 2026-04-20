/**
 * 급여명세서 "산출 근거" 기본값 — 항목 단위 구조
 *
 * 회사별 override 구조:
 *   companies.payslip_note_overrides JSONB  →  { annual_leave_pay: "...", ... }
 *
 * 우선순위:
 *   1. payslip_note_overrides (항목별 override, 신규)
 *   2. payslip_note (전체 텍스트 override, 레거시)
 *   3. DEFAULT_PAYSLIP_RULES (시스템 기본값)
 */

/* ── 항목 키 목록 ─────────────────────────────────────────── */
export const PAYSLIP_RULE_KEYS = [
  'prorated_salary',
  'overtime_pay',
  'night_pay',
  'holiday_pay',
  'annual_leave_pay',
  'national_pension',
  'health_insurance',
  'longterm_care',
  'employment_insurance',
  'income_tax',
  'resident_tax',
] as const

export type PayslipRuleKey = (typeof PAYSLIP_RULE_KEYS)[number]

/* ── 항목 한글 라벨 ───────────────────────────────────────── */
export const PAYSLIP_RULE_LABELS: Record<PayslipRuleKey, string> = {
  prorated_salary:      '일할계산',
  overtime_pay:         '연장근로수당',
  night_pay:            '야간근로수당',
  holiday_pay:          '휴일근로수당',
  annual_leave_pay:     '연차수당',
  national_pension:     '국민연금',
  health_insurance:     '건강보험',
  longterm_care:        '장기요양보험',
  employment_insurance: '고용보험',
  income_tax:           '소득세',
  resident_tax:         '주민세',
}

/* ── 시스템 기본 산출근거 (항목별) ─────────────────────────── */
export const DEFAULT_PAYSLIP_RULES: Record<PayslipRuleKey, string> = {
  prorated_salary:      '일할계산: (기본급+고정연장수당+식대)/당월일수×근무일수',
  overtime_pay:         '연장근로수당: (기본급+식대)/209h × 연장근로시간 × 1.5',
  night_pay:            '야간근로수당: (기본급+식대)/209h × 야간근로시간 × 0.5',
  holiday_pay:          '휴일근로수당: (기본급+식대)/209h × 휴일근로시간 × 1.5',
  annual_leave_pay:     '연차수당: (기본급+고정연장수당+식대)/209h × 8시간 × 잔여연차일수',
  national_pension:     '국민연금: 소득월액 × 4.75%',
  health_insurance:     '건강보험: 보수월액 × 3.545%',
  longterm_care:        '장기요양보험: 건강보험료 × 12.81%',
  employment_insurance: '고용보험: 과세소득 × 0.9%',
  income_tax:           '소득세: 간이세액표 기준',
  resident_tax:         '주민세: 소득세 × 10%',
}

/* ── 하위호환: string[] 형태 기본값 ─────────────────────────── */
export const DEFAULT_PAYSLIP_NOTES: string[] = PAYSLIP_RULE_KEYS.map(
  k => DEFAULT_PAYSLIP_RULES[k],
)

/** textarea placeholder용 기본 텍스트 */
export const DEFAULT_PAYSLIP_NOTE_PLACEHOLDER = DEFAULT_PAYSLIP_NOTES.join('\n')

/* ── mergePayslipRules ─────────────────────────────────────
   항목별 override를 기본값에 merge → 최종 string[] 반환
   overrides = { annual_leave_pay: '연차수당: 회사 기준...' }
────────────────────────────────────────────────────────── */
export function mergePayslipRules(
  overrides: Record<string, string> | null | undefined,
): string[] {
  if (!overrides) return [...DEFAULT_PAYSLIP_NOTES]
  return PAYSLIP_RULE_KEYS.map(key =>
    overrides[key]?.trim() || DEFAULT_PAYSLIP_RULES[key],
  )
}

/* ── getEffectivePayslipRules ──────────────────────────────
   최종 산출근거 결정 (우선순위):
     1. payslip_note_overrides (항목별 override, 신규)
     2. payslip_note (전체 텍스트 override, 레거시)
     3. systemDefaultNotes 또는 DEFAULT_PAYSLIP_NOTES
────────────────────────────────────────────────────────── */
export function getEffectivePayslipRules(
  payslipNote:          string | null | undefined,
  payslipNoteOverrides: Record<string, string> | null | undefined,
  systemDefaultNotes?:  string[],
): string[] {
  // 1차: 항목별 override (신규 방식)
  if (payslipNoteOverrides && Object.keys(payslipNoteOverrides).length > 0) {
    return mergePayslipRules(payslipNoteOverrides)
  }

  // 2차: 레거시 전체 텍스트 override
  if (payslipNote?.trim()) {
    return payslipNote
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
  }

  // 3차: 시스템 기본값
  return systemDefaultNotes ?? DEFAULT_PAYSLIP_NOTES
}

/* ── parsePayslipNote (하위호환 — 레거시 호출부 유지용) ──────
   @deprecated getEffectivePayslipRules 사용 권장
────────────────────────────────────────────────────────── */
export function parsePayslipNote(
  note: string | null | undefined,
  defaultNotes?: string[],
): string[] {
  return getEffectivePayslipRules(note, null, defaultNotes)
}
