/**
 * 연차휴가 계산 로직
 * 근로기준법 제60조 기준
 */

/** 해당 날짜가 주말(토/일)인지 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

/** start~end 사이 평일 일수 (양 끝 포함) */
export function countWeekdays(start: Date, end: Date): number {
  let count = 0
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const endD = new Date(end)
  endD.setHours(0, 0, 0, 0)
  while (cur <= endD) {
    if (!isWeekend(cur)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

/** 1일 소정근로시간 (주 소정근로시간 / 5) */
export function dailyHours(weeklyWorkHours: number | null): number {
  return (weeklyWorkHours ?? 40) / 5
}

/**
 * 근속연수 계산 (년 단위, 소수점)
 * hireDate ~ referenceDate
 */
export function yearsWorked(hireDate: Date, referenceDate: Date): number {
  const ms = referenceDate.getTime() - hireDate.getTime()
  return ms / (1000 * 60 * 60 * 24 * 365.25)
}

/**
 * 근속연수 N에 따른 연간 연차 일수
 * N < 1:  월 1일 (월차)
 * N >= 1: 15일 + floor((N-1)/2) 추가, max 25
 */
export function annualLeaveDays(years: number): number {
  if (years < 1) return 0  // 월차는 별도 계산
  const extra = Math.floor((years - 1) / 2)
  return Math.min(15 + extra, 25)
}

/**
 * 입사일 기준: 특정 주기(연도 cycle)의 연차 발생일수
 * @param hireDate 입사일
 * @param cycleYear cycleYear년의 입사 기념일 기준 근속연수로 계산
 * @returns 해당 주기에 발생할 연차 일수 (annual only, 1년 미만은 0)
 */
export function hireDateAnnualDays(hireDate: Date, cycleYear: number): number {
  // cycleYear년의 입사 기념일 시점 실제 근속연수 사용
  const anniversary = new Date(cycleYear, hireDate.getMonth(), hireDate.getDate())
  const years = Math.floor(yearsWorked(hireDate, anniversary))
  return annualLeaveDays(years)
}

/**
 * 회계연도 기준: 특정 연도의 연차 발생일수
 * @param hireDate  입사일
 * @param fiscalYear 회계연도 (1/1 기준)
 * @returns 해당 연도에 발생할 연차 일수
 */
export function fiscalYearAnnualDays(hireDate: Date, fiscalYear: number): number {
  const fiscalStart    = new Date(fiscalYear, 0, 1)   // Jan 1 of target year
  const fiscalEnd      = new Date(fiscalYear, 11, 31) // Dec 31 of target year
  const prevFiscalEnd  = new Date(fiscalYear - 1, 11, 31) // Dec 31 of previous year

  if (hireDate > fiscalEnd) return 0  // 해당 연도에 미입사

  // 회계연도 중 입사 → 당해연도 입사일~연말 일할 계산 (소수점 2자리)
  if (hireDate > fiscalStart) {
    const remainDays = Math.floor(
      (fiscalEnd.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
    return +((15 * remainDays / 365).toFixed(2))
  }

  // 회계연도 시작 이전 입사
  const years = yearsWorked(hireDate, fiscalStart)

  if (years < 1) {
    // 첫 번째 Jan 1 도래 — 이전 연도 입사일~연말 일할 계산 (소수점 2자리)
    const workedDays = Math.floor(
      (prevFiscalEnd.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
    if (workedDays <= 0) return 0
    return +((15 * workedDays / 365).toFixed(2))
  }

  return annualLeaveDays(years)
}

/**
 * 해당 월의 월차 발생 여부 (입사 후 첫 11개월)
 * @param hireDate 입사일
 * @param period   'YYYY-MM'
 * @returns 1일 or 0
 */
export function monthlyAccrualDays(hireDate: Date, period: string): number {
  const [y, m] = period.split('-').map(Number)
  const periodStart = new Date(y, m - 1, 1)

  const hireYear  = hireDate.getFullYear()
  const hireMonth = hireDate.getMonth()

  const monthsWorked =
    (periodStart.getFullYear() - hireYear) * 12 +
    (periodStart.getMonth() - hireMonth)

  // 입사월 다음달부터 11개월 (0-based: monthsWorked 1~11)
  if (monthsWorked >= 1 && monthsWorked <= 11) return 1
  return 0
}

/**
 * 입사일 기준 반대 방식(회계연도)의 연차 발생일수 계산 (참고용)
 */
export function calcAlternativeDays(
  hireDate: Date,
  basis: 'hire_date' | 'fiscal_year',
  referenceYear: number,
): number {
  if (basis === 'hire_date') {
    // 반대: 회계연도 기준으로 계산
    return fiscalYearAnnualDays(hireDate, referenceYear)
  } else {
    // 반대: 입사일 기준으로 계산
    return hireDateAnnualDays(hireDate, referenceYear)
  }
}

/**
 * 연차 신청 시 차감 시간 계산
 * @param leaveType  신청 유형
 * @param startDate  시작일
 * @param endDate    종료일
 * @param weeklyHours 소정근로시간/주
 * @param hourlyCount hourly 타입 시 시간 수
 */
export function calcRequestHours(
  leaveType: 'full_day' | 'half_day_am' | 'half_day_pm' | 'hourly',
  startDate: Date,
  endDate: Date,
  weeklyHours: number | null,
  hourlyCount?: number,
): number {
  const dh = dailyHours(weeklyHours)
  if (leaveType === 'hourly') return hourlyCount ?? 0
  if (leaveType === 'half_day_am' || leaveType === 'half_day_pm') return dh / 2
  // full_day: 주말 제외한 평일 수 × dailyHours
  const weekdays = countWeekdays(startDate, endDate)
  return weekdays * dh
}

/** period 'YYYY' or 'YYYY-MM' → expires_at: 1년 뒤 */
export function calcExpiresAt(period: string): string {
  if (period.length === 4) {
    return `${parseInt(period) + 1}-12-31`
  }
  const [y, m] = period.split('-').map(Number)
  const exp = new Date(y + 1, m - 1, 0)  // 1년 후 해당 월 말일
  return exp.toISOString().slice(0, 10)
}
