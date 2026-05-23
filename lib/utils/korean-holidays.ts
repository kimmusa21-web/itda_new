/**
 * 대한민국 관공서 공휴일 (관공서의 공휴일에 관한 규정)
 * 주말(토·일) + 아래 공휴일에 해당하는 날은 근무일에서 제외
 */

const HOLIDAYS_BY_YEAR: Record<number, string[]> = {
  2025: [
    '2025-01-01', // 신정
    '2025-01-28', '2025-01-29', '2025-01-30', // 설날 연휴·설날
    '2025-03-01', // 삼일절 (토 — 대체공휴일 없음)
    '2025-05-05', // 어린이날 / 부처님오신날 겹침
    '2025-05-06', // 어린이날 대체공휴일
    '2025-06-06', // 현충일
    '2025-08-15', // 광복절
    '2025-10-03', // 개천절
    '2025-10-05', '2025-10-06', '2025-10-07', // 추석 연휴·추석
    '2025-10-08', // 추석 대체공휴일 (10/5 일요일)
    '2025-10-09', // 한글날
    '2025-12-25', // 성탄절
  ],
  2026: [
    '2026-01-01', // 신정
    '2026-02-17', '2026-02-18', '2026-02-19', // 설날 연휴·설날
    '2026-03-01', // 삼일절 (일요일)
    '2026-03-02', // 삼일절 대체공휴일
    '2026-05-05', // 어린이날
    '2026-05-24', // 부처님오신날 (일요일 — 대체공휴일 5/25)
    '2026-05-25', // 부처님오신날 대체공휴일
    '2026-06-06', // 현충일 (토 — 대체공휴일 없음)
    '2026-08-15', // 광복절 (토 — 대체공휴일 없음)
    '2026-09-13', // 추석 연휴
    '2026-09-14', // 추석
    '2026-09-15', // 추석 연휴
    '2026-10-03', // 개천절 (토 — 대체공휴일 없음)
    '2026-10-09', // 한글날
    '2026-12-25', // 성탄절
  ],
}

// 연도 데이터가 없을 때 사용할 고정 공휴일 (음력 제외)
const FIXED_HOLIDAYS_MM_DD: [number, number][] = [
  [1,  1],
  [3,  1],
  [5,  5],
  [6,  6],
  [8, 15],
  [10, 3],
  [10, 9],
  [12,25],
]

function buildHolidaySet(year: number): Set<string> {
  if (HOLIDAYS_BY_YEAR[year]) {
    return new Set(HOLIDAYS_BY_YEAR[year])
  }
  const s = new Set<string>()
  for (const [m, d] of FIXED_HOLIDAYS_MM_DD) {
    s.add(`${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return s
}

const cache = new Map<number, Set<string>>()

function holidaySet(year: number): Set<string> {
  if (!cache.has(year)) cache.set(year, buildHolidaySet(year))
  return cache.get(year)!
}

export function isKoreanHoliday(dateStr: string): boolean {
  const year = parseInt(dateStr.slice(0, 4))
  return holidaySet(year).has(dateStr)
}

export function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr + 'T00:00:00+09:00').getDay()
  return day === 0 || day === 6
}

/** 주말·공휴일을 제외한 근무일 여부 */
export function isWorkday(dateStr: string): boolean {
  return !isWeekend(dateStr) && !isKoreanHoliday(dateStr)
}
