import { isWorkday } from '@/lib/utils/korean-holidays'

/** KST(UTC+9) 기준 오늘 날짜 'YYYY-MM-DD' */
export function kstToday(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

/** KST 기준 이번 달 첫째 날 'YYYY-MM-01' */
export function kstFirstOfMonth(): string {
  return kstToday().slice(0, 7) + '-01'
}

/** work_date가 소급 입력 허용 범위인지 확인 (이번달 1일 ~ 오늘, 주말·공휴일 제외) */
export function isAllowedWorkDate(workDate: string): boolean {
  const today        = kstToday()
  const firstOfMonth = kstFirstOfMonth()
  if (workDate < firstOfMonth || workDate > today) return false
  return isWorkday(workDate)
}
