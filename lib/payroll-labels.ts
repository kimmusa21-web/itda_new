/* ================================================================
   ModuHR — 급여 항목 영어 키 → 한글 레이블 매핑 (최종본)
   pay_info_v2 실제 earnings/deductions JSONB 키 기반
================================================================ */

export const EARNINGS_LABELS: Record<string, string> = {
  base_salary:            '기본급',
  overtime_pay_fixed:     '고정연장근로수당',
  overtime_pay:           '연장근로수당',
  holidaytime_pay:        '휴일근로수당',
  nighttime_pay:          '야간근로수당',
  meal_allowance:         '식대',
  incentive:              '인센티브',
  annual_leave_allowance: '잔여연차수당',
  Other_allowances:       '기타수당1',
  Other_allowances2:      '기타수당2',
  Holiday_bonus:          '명절상여',
  Total_payment:          '지급합계',
  Total_tax_salary:       '과세급여합계',
}

export const DEDUCTIONS_LABELS: Record<string, string> = {
  national_pension:            '국민연금',
  health_insurance:            '건강보험',
  longterm_care:               '장기요양보험료',
  employment_insurance:        '고용보험',
  income_tax:                  '소득세',
  resident_tax:                '지방소득세',
  local_income_tax:            '지방소득세',
  income_tax_refund:           '소득세환급',
  resident_tax_refund:         '지방소득세환급',
  health_insurance_adjustment: '건강보험료정산',
  student_loan:                '학자금대출',
  Other_deductions:            '기타공제',
  Total_deductible:            '공제합계',
}

export function getEarningLabel(key: string)  { return EARNINGS_LABELS[key]   ?? key }
export function getDeductionLabel(key: string) { return DEDUCTIONS_LABELS[key] ?? key }

/** earnings JSONB → 표시용 배열 (0원 제외) */
export function mapEarnings(json: Record<string, number>, excludeZero = true) {
  return Object.entries(json)
    .map(([key, amount]) => ({
      key,
      label:  getEarningLabel(key),
      amount: Math.round(Number(amount)),
    }))
    .filter(e => !excludeZero || e.amount !== 0)
}

/** deductions JSONB → 표시용 배열 (0원 제외) */
export function mapDeductions(json: Record<string, number>, excludeZero = true) {
  return Object.entries(json)
    .map(([key, amount]) => ({
      key,
      label:  getDeductionLabel(key),
      amount: Math.round(Number(amount)),
    }))
    .filter(d => !excludeZero || d.amount !== 0)
}
