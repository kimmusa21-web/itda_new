/**
 * 급여명세서 "산출 근거" 기본값
 *
 * 회사가 companies.payslip_note를 설정하지 않은 경우 사용.
 * 관리자가 Supabase Studio 또는 어드민 UI에서 회사별로 커스터마이징 가능.
 */

export const DEFAULT_PAYSLIP_NOTES: string[] = [
  '일할계산: (기본급+고정연장수당+식대)/당월일수×근무일수',
  '연장근로수당: (기본급+식대)/209h × 연장근로시간 × 1.5',
  '야간근로수당: (기본급+식대)/209h × 야간근로시간 × 0.5',
  '휴일근로수당: (기본급+식대)/209h × 휴일근로시간 × 1.5',
  '연차수당: (기본급+고정연장수당+식대)/209h × 잔여연차시간',
  '국민연금: 소득월액 × 4.5%',
  '건강보험: 보수월액 × 3.545%',
  '장기요양보험: 건강보험료 × 12.81%',
  '고용보험: 과세소득 × 0.9%',
  '소득세: 간이세액표 기준',
  '주민세: 소득세 × 10%',
]

/** textarea placeholder용 기본 텍스트 */
export const DEFAULT_PAYSLIP_NOTE_PLACEHOLDER = DEFAULT_PAYSLIP_NOTES.join('\n')

/**
 * DB에 저장된 payslip_note 문자열 → 화면 표시용 string[] 변환
 *
 * - null/빈 문자열 → DEFAULT_PAYSLIP_NOTES 반환
 * - 줄바꿈(\n) 기준으로 분리, 공백 줄 제거
 */
export function parsePayslipNote(note: string | null | undefined): string[] {
  if (!note?.trim()) return DEFAULT_PAYSLIP_NOTES
  return note
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
}
