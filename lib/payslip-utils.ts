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
