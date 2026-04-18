/**
 * YYYY-MM (URL/표시) → YYYY-MM-01 (DB 저장)
 * 이미 YYYY-MM-DD이면 그대로 반환
 */
export function toAccrualDate(month: string): string {
  if (!month) return month
  if (month.length >= 10) return month.slice(0, 10)
  return `${month}-01`
}

/**
 * YYYY-MM-DD (DB) or YYYY-MM → YYYY-MM (URL / 표시 / grouping 키)
 */
export function toAccrualMonth(dateOrMonth: string): string {
  return (dateOrMonth ?? '').slice(0, 7)
}

/**
 * 원화 포맷 변환
 * formatKRW(9001480) → "9,001,480원"
 * formatKRW(-51635)  → "-51,635원"
 */
export function formatKRW(amount: number): string {
  const abs = Math.abs(Math.round(amount))
  const formatted = abs.toLocaleString('ko-KR') + '원'
  return amount < 0 ? `-${formatted}` : formatted
}

/**
 * "2026-02" → "2026년 2월"
 */
export function formatAccrualMonth(ym: string): string {
  const [year, month] = ym.split('-')
  return `${year}년 ${parseInt(month)}월`
}

/**
 * "2026-03-15" → "2026.03.15"
 */
export function formatDateDot(date: string): string {
  return date.replace(/-/g, '.')
}

/**
 * "2026-03-15" → "2026년 3월 15일"
 */
export function formatDateKR(date: string): string {
  const [y, m, d] = date.split('-')
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`
}

/**
 * "2026-02-01" ~ "2026-02-28" → "2026.02.01 ~ 2026.02.28"
 */
export function formatPeriod(start: string, end: string): string {
  return `${formatDateDot(start)} ~ ${formatDateDot(end)}`
}

/**
 * 해당 귀속월의 총 일수 반환 (윤년 자동 고려)
 * getDaysInMonth('2026-02') → 28
 * getDaysInMonth('2024-02') → 29  (윤년)
 * getDaysInMonth('2026-03') → 31
 */
export function getDaysInMonth(payMonth: string): number {
  const [year, month] = payMonth.split('-').map(Number)
  // new Date(year, month, 0) = 해당 월의 마지막 날 (day 0 of next month)
  return new Date(year, month, 0).getDate()
}

/**
 * 급여 정산기간 계산
 *
 * payrollStartDay = 15, payMonth = '2026-05'
 *   → { start: '2026-04-15', end: '2026-05-14' }
 *
 * payrollStartDay = null (or 1), payMonth = '2026-05'
 *   → { start: '2026-05-01', end: '2026-05-31' }  (해당 월 전체)
 *
 * 전월 말일 초과 startDay 자동 클램프 (예: 2월에 startDay=30 → 28/29로)
 */
export function getPayrollPeriod(
  payMonth: string,
  payrollStartDay: number | null | undefined,
): { start: string; end: string } {
  const [year, month] = payMonth.split('-').map(Number)

  // Fallback: 해당 월 1일 ~ 말일
  if (!payrollStartDay || payrollStartDay <= 1) {
    const lastDay = new Date(year, month, 0).getDate()
    return {
      start: `${payMonth}-01`,
      end:   `${payMonth}-${String(lastDay).padStart(2, '0')}`,
    }
  }

  // 정산 시작일이 2 이상인 경우:
  // 시작: (전월 payrollStartDay) ~ 종료: (당월 payrollStartDay - 1)
  const prevYear  = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12       : month - 1

  // 전월 말일을 초과하는 startDay 클램프 (e.g. 2월 → max 28/29)
  const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate()
  const clampedStart     = Math.min(payrollStartDay, prevMonthLastDay)

  const prevMonthStr = `${String(prevYear).padStart(4, '0')}-${String(prevMonth).padStart(2, '0')}`
  const start = `${prevMonthStr}-${String(clampedStart).padStart(2, '0')}`
  const end   = `${payMonth}-${String(payrollStartDay - 1).padStart(2, '0')}`

  return { start, end }
}
