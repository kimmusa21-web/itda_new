/**
 * 근로기준법 휴게시간 기준:
 * - 8시간 이상: 1시간 제외
 * - 4시간 이상 8시간 미만: 30분 제외
 * - 4시간 미만: 제외 없음
 */
export function breakMinutes(totalMinutes: number): number {
  if (totalMinutes >= 480) return 60
  if (totalMinutes >= 240) return 30
  return 0
}

/** 출퇴근 ISO 문자열로 실 근무시간(분) 계산 */
export function calcWorkMinutes(checkInIso: string, checkOutIso: string): number {
  const total = Math.max(0, Math.floor(
    (new Date(checkOutIso).getTime() - new Date(checkInIso).getTime()) / 60000,
  ))
  return total - breakMinutes(total)
}

/** 분 → "Xh Ym" 형식 */
export function fmtWorkHours(minutes: number): string {
  if (minutes <= 0) return '0분'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}

/** YYYY-MM-DD 기준 해당 주 월~일 범위 반환 */
export function getWeekRange(dateStr: string): { start: string; end: string } {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const dt  = new Date(y, mo - 1, d)
  const dow = dt.getDay() // 0=일,1=월,...
  const offset = dow === 0 ? -6 : 1 - dow
  const mon = new Date(y, mo - 1, d + offset)
  const sun = new Date(y, mo - 1, d + offset + 6)
  const fmt = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  return { start: fmt(mon), end: fmt(sun) }
}
