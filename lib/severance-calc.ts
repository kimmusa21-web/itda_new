/* ================================================================
   itda — 퇴직금 산정 계산 유틸리티
   근거: 근로기준법 제34조, 퇴직급여법
================================================================ */

/** 월별 산정 구간 */
export interface MonthSegment {
  yearMonth:    string   // 'YYYY-MM'
  periodStart:  string   // 'YYYY-MM-DD'
  periodEnd:    string   // 'YYYY-MM-DD'
  daysInPeriod: number   // 해당 구간 일수 (분자)
  daysInMonth:  number   // 해당 월 총일수 (분모)
}

/** 월별 급여 데이터 (입력) */
export interface MonthlyPayInput {
  yearMonth:  string
  baseSalary: number   // 기본급
  allowances: number   // 제수당 (기본급 외 수당)
}

/** 산정 구간별 계산 결과 */
export interface SegmentResult {
  segment:          MonthSegment
  pay:              MonthlyPayInput
  proRatedBase:     number   // 기본급 일할
  proRatedAllow:    number   // 제수당 일할
  subtotal:         number   // 소계
}

/** 퇴직금 산정 최종 결과 */
export interface SeveranceResult {
  // 근속
  hireDate:       string
  retirementDate: string
  serviceDays:    number

  // 평균임금 구성
  segments:       MonthSegment[]
  segmentResults: SegmentResult[]
  totalBasePay:   number
  totalAllowances:number
  bonus3m:        number
  leaveAllow3m:   number
  total3mAmount:  number
  totalDays:      number
  averageWage:    number

  // 퇴직금
  severancePay:   number

  // 공제
  incomeTax:      number
  residentTax:    number
  otherDeductions:number
  totalDeductions:number

  // 실지급
  netPay: number
}

/* ── 날짜 헬퍼 ── */

/** YYYY-MM-DD 문자열 → Date (local, 시간 0) */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Date → YYYY-MM-DD 문자열 */
export function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** 해당 월의 마지막 일 (Date 객체 반환) */
function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0)
}

/** 해당 월의 총일수 */
function daysInMonth(year: number, month: number): number {
  return endOfMonth(year, month).getDate()
}

/** date - months 연산 (day overflow 방지) */
function subMonths(date: Date, months: number): Date {
  const y = date.getFullYear()
  const m = date.getMonth()
  const d = date.getDate()
  // target month
  const totalM = y * 12 + m - months
  const tY = Math.floor(totalM / 12)
  const tM = totalM % 12
  const maxDay = daysInMonth(tY, tM)
  return new Date(tY, tM, Math.min(d, maxDay))
}

/** 두 날짜 사이 일수 (exclusive end: end - start) */
function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86400000)
}

/* ── 핵심 함수: 3개월 구간 분할 ── */

/**
 * 퇴사일 기준 최근 3개월을 월별 구간으로 분할
 * 예) 퇴사일 2026-04-15
 *  → 2026-01-15 ~ 2026-01-31 (17일, 31일 분모)
 *  → 2026-02-01 ~ 2026-02-28 (28일, 28일 분모)
 *  → 2026-03-01 ~ 2026-03-31 (31일, 31일 분모)
 *  → 2026-04-01 ~ 2026-04-14 (14일, 30일 분모)
 */
export function computeSegments(retirementDateStr: string): MonthSegment[] {
  const retirement = parseDate(retirementDateStr)

  // 3개월 기간: [퇴사일 - 3개월, 퇴사일 - 1일]
  const periodStart = subMonths(retirement, 3)
  const periodEnd   = new Date(retirement)
  periodEnd.setDate(periodEnd.getDate() - 1)

  const segments: MonthSegment[] = []
  let cur = new Date(periodStart)

  while (cur <= periodEnd) {
    const y  = cur.getFullYear()
    const mo = cur.getMonth()

    // 이 구간의 끝 = min(월말, 기간 종료일)
    const mEnd      = endOfMonth(y, mo)
    const segEnd    = mEnd <= periodEnd ? mEnd : periodEnd
    const dim       = daysInMonth(y, mo)
    const dip       = daysBetween(cur, segEnd) + 1
    const ym        = `${y}-${String(mo + 1).padStart(2, '0')}`

    segments.push({
      yearMonth:    ym,
      periodStart:  fmtDate(new Date(cur)),
      periodEnd:    fmtDate(segEnd),
      daysInPeriod: dip,
      daysInMonth:  dim,
    })

    // 다음 달 1일
    cur = new Date(y, mo + 1, 1)
  }

  return segments
}

/* ── 핵심 함수: 퇴직금 산정 ── */

export function computeSeverance(params: {
  hireDate:       string
  retirementDate: string
  segments:       MonthSegment[]
  monthlyData:    Record<string, MonthlyPayInput>   // yearMonth → 급여
  annualBonus:    number   // 연간 상여금 총액
  annualLeaveAllow: number // 연간 연차수당 총액
  incomeTax:      number
  otherDeductions:number
}): SeveranceResult {
  const {
    hireDate, retirementDate, segments, monthlyData,
    annualBonus, annualLeaveAllow, incomeTax, otherDeductions,
  } = params

  // ── 근속일수
  const hire       = parseDate(hireDate)
  const retirement = parseDate(retirementDate)
  const serviceDays = daysBetween(hire, retirement)

  // ── 구간별 일할 계산
  const segmentResults: SegmentResult[] = segments.map(seg => {
    const pay = monthlyData[seg.yearMonth] ?? { yearMonth: seg.yearMonth, baseSalary: 0, allowances: 0 }
    const proRatedBase  = (pay.baseSalary * seg.daysInPeriod) / seg.daysInMonth
    const proRatedAllow = (pay.allowances  * seg.daysInPeriod) / seg.daysInMonth
    return { segment: seg, pay, proRatedBase, proRatedAllow, subtotal: proRatedBase + proRatedAllow }
  })

  // ── 합계
  const totalBasePay    = segmentResults.reduce((s, r) => s + r.proRatedBase,  0)
  const totalAllowances = segmentResults.reduce((s, r) => s + r.proRatedAllow, 0)
  const totalDays       = segments.reduce((s, seg) => s + seg.daysInPeriod, 0)

  const bonus3m      = annualBonus      * 3 / 12
  const leaveAllow3m = annualLeaveAllow * 3 / 12

  const total3mAmount = totalBasePay + totalAllowances + bonus3m + leaveAllow3m
  const averageWage   = totalDays > 0 ? total3mAmount / totalDays : 0

  // ── 퇴직금 = 평균임금 × 30 × 근속일수 / 365
  const severancePay = averageWage * 30 * serviceDays / 365

  // ── 공제
  const residentTax    = Math.floor(incomeTax * 0.1)
  const totalDeductions = incomeTax + residentTax + otherDeductions
  const netPay         = severancePay - totalDeductions

  return {
    hireDate, retirementDate, serviceDays,
    segments, segmentResults,
    totalBasePay, totalAllowances,
    bonus3m, leaveAllow3m,
    total3mAmount, totalDays, averageWage,
    severancePay,
    incomeTax, residentTax, otherDeductions, totalDeductions,
    netPay,
  }
}

/* ── 포맷 헬퍼 ── */
export function fmtKRW(n: number): string {
  return Math.round(n).toLocaleString('ko-KR') + '원'
}

export function fmtMonthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `${y}년 ${Number(m)}월`
}
