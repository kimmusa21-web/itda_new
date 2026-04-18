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

/* ================================================================
   퇴직소득세 자동 계산
   근거: 소득세법 제48조, 소득세법 시행령 제107조
================================================================ */

/** 근속월수 (입사월~퇴사월 포함 카운트) */
export function computeServiceMonths(hireDateStr: string, retirementDateStr: string): number {
  const hire = parseDate(hireDateStr)
  const ret  = parseDate(retirementDateStr)
  return (ret.getFullYear() - hire.getFullYear()) * 12
       + (ret.getMonth()   - hire.getMonth())
       + 1
}

/** 근속연수 = ceil(근속월수 / 12), 최소 1 */
export function computeServiceYears(serviceMonths: number): number {
  return Math.max(1, Math.ceil(serviceMonths / 12))
}

/**
 * 근속년수별 퇴직소득공제
 *  ≤  5년: 100만 × 근속연수
 *  ≤ 10년: 500만 + (근속연수-5) × 200만
 *  ≤ 20년: 1500만 + (근속연수-10) × 250만
 *  > 20년: 4000만 + (근속연수-20) × 300만
 */
export function computeServiceYearDeduction(serviceYears: number): number {
  if (serviceYears <=  5) return 1_000_000 * serviceYears
  if (serviceYears <= 10) return  5_000_000 + (serviceYears -  5) * 2_000_000
  if (serviceYears <= 20) return 15_000_000 + (serviceYears - 10) * 2_500_000
  return                        40_000_000 + (serviceYears - 20) * 3_000_000
}

/**
 * 환산급여 = (퇴직급여 - 근속년수별공제) × 12 / 근속연수
 */
export function computeConvertedSalary(
  severancePay:         number,
  serviceYearDeduction: number,
  serviceYears:         number,
): number {
  return (severancePay - serviceYearDeduction) * 12 / serviceYears
}

/**
 * 환산급여공제
 *  ≤ 800만: 전액
 *  ≤ 7,000만: 800만 + (초과 × 60%)
 *  ≤ 10,000만: 4,520만 + (초과 × 55%)
 *  ≤ 30,000만: 6,170만 + (초과 × 45%)
 *  > 30,000만: 15,170만 + (초과 × 35%)
 */
export function computeConvertedSalaryDeduction(convertedSalary: number): number {
  if (convertedSalary <=  8_000_000) return convertedSalary
  if (convertedSalary <= 70_000_000) return  8_000_000 + (convertedSalary -   8_000_000) * 0.60
  if (convertedSalary <= 100_000_000) return 45_200_000 + (convertedSalary -  70_000_000) * 0.55
  if (convertedSalary <= 300_000_000) return 61_700_000 + (convertedSalary - 100_000_000) * 0.45
  return                             151_700_000 + (convertedSalary - 300_000_000) * 0.35
}

/**
 * 기본세율 적용 환산산출세액
 *  ≤ 1,400만: × 6%
 *  ≤ 5,000만: × 15% − 126만
 *  ≤ 8,800만: × 24% − 576만
 *  ≤ 1.5억: × 35% − 1,544만
 *  ≤ 3억: × 38% − 1,994만
 *  ≤ 5억: × 40% − 2,594만
 *  ≤ 10억: × 42% − 3,594만
 *  > 10억: × 45% − 6,594만
 */
export function computeConvertedTax(taxBase: number): number {
  if (taxBase <=  14_000_000) return taxBase * 0.06
  if (taxBase <=  50_000_000) return taxBase * 0.15 -  1_260_000
  if (taxBase <=  88_000_000) return taxBase * 0.24 -  5_760_000
  if (taxBase <= 150_000_000) return taxBase * 0.35 - 15_440_000
  if (taxBase <= 300_000_000) return taxBase * 0.38 - 19_940_000
  if (taxBase <= 500_000_000) return taxBase * 0.40 - 25_940_000
  if (taxBase <= 1_000_000_000) return taxBase * 0.42 - 35_940_000
  return                              taxBase * 0.45 - 65_940_000
}

/** 퇴직소득세 계산 결과 */
export interface RetirementTaxResult {
  serviceMonths:             number
  serviceYears:              number
  serviceYearDeduction:      number
  convertedSalary:           number
  convertedSalaryDeduction:  number
  taxBase:                   number
  convertedTax:              number
  calculatedTax:             number
  incomeTax:                 number   // 소득세 (10원 단위 절사)
  residentTax:               number   // 주민세 (10원 단위 절사)
  totalTax:                  number   // 납부세액
}

/**
 * 퇴직소득세 자동 계산
 * severancePay: 퇴직금액 (원)
 */
export function computeRetirementTax(
  severancePay:    number,
  hireDateStr:     string,
  retirementDateStr: string,
): RetirementTaxResult {
  const serviceMonths           = computeServiceMonths(hireDateStr, retirementDateStr)
  const serviceYears            = computeServiceYears(serviceMonths)
  const serviceYearDeduction    = computeServiceYearDeduction(serviceYears)
  const convertedSalary         = Math.max(0, computeConvertedSalary(severancePay, serviceYearDeduction, serviceYears))
  const convertedSalaryDeduction = computeConvertedSalaryDeduction(convertedSalary)
  const taxBase                 = Math.max(0, convertedSalary - convertedSalaryDeduction)
  const convertedTax            = computeConvertedTax(taxBase)
  const calculatedTax           = (convertedTax / 12) * serviceYears
  const incomeTax               = Math.floor(calculatedTax / 10) * 10   // 10원 단위 절사
  const residentTax             = Math.floor(incomeTax * 0.1  / 10) * 10 // 10원 단위 절사
  const totalTax                = incomeTax + residentTax

  return {
    serviceMonths,
    serviceYears,
    serviceYearDeduction,
    convertedSalary,
    convertedSalaryDeduction,
    taxBase,
    convertedTax,
    calculatedTax,
    incomeTax,
    residentTax,
    totalTax,
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
