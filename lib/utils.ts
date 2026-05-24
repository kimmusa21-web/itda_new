/* ================================================================
   ModuHR — 공통 유틸리티 (최종본)
================================================================ */

/** Tailwind 클래스 병합 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** 원화 포맷  3000000 → "3,000,000원" */
export function formatKRW(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-'
  const n = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value
  if (isNaN(n)) return '-'
  const abs = Math.abs(Math.round(n))
  const formatted = abs.toLocaleString('ko-KR') + '원'
  return n < 0 ? `-${formatted}` : formatted
}

/** "3,000,000" 또는 "3000000" → 3000000 */
export function parseCurrency(value: string): number {
  if (!value) return 0
  const n = parseFloat(value.replace(/[,\s₩원]/g, ''))
  return isNaN(n) ? 0 : n
}

/** "2026-03" → "2026년 3월" */
export function formatMonth(ym: string): string {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return `${y}년 ${parseInt(m)}월`
}

/** "2026-03-15" → "2026.03.15" */
export function formatDateDot(date: string | null | undefined): string {
  if (!date) return '-'
  return date.replace(/-/g, '.')
}

/** "2026-03-15" → "2026년 3월 15일" */
export function formatDateKR(date: string | null | undefined): string {
  if (!date) return '-'
  const [y, m, d] = date.split('-')
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`
}

/** "2026-03-15" → "2026.03.15" (짧은 버전) */
export function formatDateShort(date: string | null | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('ko-KR')
}

/** 현재 월 YYYY-MM */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

/** 최근 N개월 목록 (최신순) */
export function recentMonths(n = 12): string[] {
  const result: string[] = []
  const d = new Date()
  for (let i = 0; i < n; i++) {
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d.setMonth(d.getMonth() - 1)
  }
  return result
}

/** 이름 → 이니셜 2자 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.slice(0, 2)
}

/** YYYY-MM 또는 YYYY-MM-DD 형식 확인 */
export function isValidMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])(-\d{2})?$/.test(value)
}

/** YYYY-MM-DD 형식 확인 */
export function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value))
}

/** CSV 금액 컬럼 정제 */
export function cleanAmount(val: string): string {
  return val.replace(/[,\s원₩]/g, '').trim()
}

/** 전화번호 자동 포맷팅 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.startsWith('02')) {
    if (digits.length <= 9) return `${digits.slice(0,2)}-${digits.slice(2,6)}-${digits.slice(6)}`
    return `${digits.slice(0,2)}-${digits.slice(2,6)}-${digits.slice(6)}`
  }
  if (digits.length <= 7) return `${digits.slice(0,3)}-${digits.slice(3)}`
  return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`
}

/** 급여 표시용 입력값 포맷 */
export function formatSalaryDisplay(value: number | ''): string {
  if (value === '' || value === 0) return ''
  return Number(value).toLocaleString('ko-KR')
}

export function parseSalaryInput(raw: string): number | '' {
  const cleaned = raw.replace(/[^0-9]/g, '')
  if (!cleaned) return ''
  const n = parseInt(cleaned, 10)
  return isNaN(n) ? '' : n
}
