'use server'
/* ================================================================
   itda — 급여 표준 CSV 업로드 Server Action (pay_info_v2 전체 컬럼)

   처리 순서:
     1. 인증 + 권한 확인 (admin / manager)
     2. manager: company_id 불일치 차단
     3. 행별 형식 검증
     4. 파일 내 중복 검사 (email + pay_month)
     5. Option A: 오류 1건이라도 → 전체 중단
     6. company_id + email 기준 직원 매칭
        → 한 명이라도 실패 시 전체 중단
     7. pay_info_v2 upsert (company_id, employee_id, accrual_month)
     8. 결과 반환
================================================================ */

import { createClient } from '@/lib/supabase/server'
import { toAccrualDate } from '@/lib/payslip-utils'
import type {
  PayslipCsvRow,
  PayslipCsvResult,
  PayslipCsvFailure,
  PayslipCsvUploadParams,
} from '@/types/payslip-csv-upload'

/* ── 숫자 변환 헬퍼 ──────────────────────────────────────── */
/** 빈값/NaN → null, 음수 허용 여부 선택 */
function toNumOrNull(v: string | undefined, allowNegative = false): number | null {
  if (!v || v.trim() === '') return null
  const n = Number(v.replace(/,/g, ''))
  if (isNaN(n)) return null
  if (!allowNegative && n < 0) return null
  return n
}

/** 합산용: 빈값/NaN → 0 */
function toNum(v: string | undefined, allowNegative = false): number {
  return toNumOrNull(v, allowNegative) ?? 0
}

/* ── 정규식 ─────────────────────────────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const DATE_RE  = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

/* ── 서버 측 행 검증 ────────────────────────────────────── */
function serverValidateRow(
  row: PayslipCsvRow,
  rowNumber: number,
): PayslipCsvFailure[] {
  const failures: PayslipCsvFailure[] = []
  const fail = (reason: string) => failures.push({ rowNumber, email: row.email, reason })

  if (!row.email)                          fail('이메일 필수값')
  else if (!EMAIL_RE.test(row.email))      fail(`이메일 형식 오류: ${row.email}`)
  if (!row.pay_month)                      fail('귀속월 필수값 (YYYY-MM)')
  else if (!MONTH_RE.test(row.pay_month))  fail(`귀속월 형식 오류: ${row.pay_month}`)
  if (!row.base_salary)                    fail('기본급 필수값')
  else if (isNaN(Number(row.base_salary))) fail(`기본급 숫자 오류: ${row.base_salary}`)

  if (row.payment_date && !DATE_RE.test(row.payment_date))
    fail(`급여지급일 형식 오류: ${row.payment_date}`)
  if (row.start_date && !DATE_RE.test(row.start_date))
    fail(`정산시작일 형식 오류: ${row.start_date}`)
  if (row.end_date && !DATE_RE.test(row.end_date))
    fail(`정산종료일 형식 오류: ${row.end_date}`)

  return failures
}

/* ── pay_info_v2 레코드 빌드 ────────────────────────────── */
function buildUpsertRecord(
  row:        PayslipCsvRow,
  companyId:  number,
  employeeId: number,
) {
  // 지급 항목 개별 컬럼
  const baseSalary             = toNum(row.base_salary)
  const overtimePayFixed       = toNumOrNull(row.overtime_pay_fixed)
  const overtimePay            = toNumOrNull(row.overtime_pay)
  const holidaytimePay         = toNumOrNull(row.holidaytime_pay)
  const nighttimePay           = toNumOrNull(row.nighttime_pay)
  const mealAllowance          = toNumOrNull(row.meal_allowance)
  const incentive              = toNumOrNull(row.incentive)
  const annualLeaveAllowance   = toNumOrNull(row.annual_leave_allowance)
  const otherAllowances        = toNumOrNull(row.Other_allowances)
  const otherAllowances2       = toNumOrNull(row.Other_allowances2)
  const holidayBonus           = toNumOrNull(row.Holiday_bonus)

  // 공제 항목 개별 컬럼 (환급 필드는 음수 허용)
  const nationalPension           = toNumOrNull(row.national_pension)
  const healthInsurance           = toNumOrNull(row.health_insurance)
  const longtermCare              = toNumOrNull(row.longterm_care)
  const employmentInsurance       = toNumOrNull(row.employment_insurance)
  const incomeTax                 = toNumOrNull(row.income_tax)
  const residentTax               = toNumOrNull(row.resident_tax)
  const studentLoan               = toNumOrNull(row.student_loan)
  const incomeTaxRefund           = toNumOrNull(row.income_tax_refund, true)
  const residentTaxRefund         = toNumOrNull(row.resident_tax_refund, true)
  const healthInsuranceAdjustment = toNumOrNull(row.health_insurance_adjustment, true)
  const otherDeductions           = toNumOrNull(row.Other_deductions)

  // JSONB earnings 빌드 (0이 아닌 항목만)
  const earnings: Record<string, number> = {}
  const earningsMap: [string, number | null][] = [
    ['base_salary',            baseSalary],
    ['overtime_pay_fixed',     overtimePayFixed],
    ['overtime_pay',           overtimePay],
    ['holidaytime_pay',        holidaytimePay],
    ['nighttime_pay',          nighttimePay],
    ['meal_allowance',         mealAllowance],
    ['incentive',              incentive],
    ['annual_leave_allowance', annualLeaveAllowance],
    ['Other_allowances',       otherAllowances],
    ['Other_allowances2',      otherAllowances2],
    ['Holiday_bonus',          holidayBonus],
  ]
  for (const [k, v] of earningsMap) {
    if (v !== null && v !== 0) earnings[k] = v
  }

  // JSONB deductions 빌드 (null이 아닌 항목만)
  const deductions: Record<string, number> = {}
  const deductionsMap: [string, number | null][] = [
    ['national_pension',            nationalPension],
    ['health_insurance',            healthInsurance],
    ['longterm_care',               longtermCare],
    ['employment_insurance',        employmentInsurance],
    ['income_tax',                  incomeTax],
    ['resident_tax',                residentTax],
    ['student_loan',                studentLoan],
    ['income_tax_refund',           incomeTaxRefund],
    ['resident_tax_refund',         residentTaxRefund],
    ['health_insurance_adjustment', healthInsuranceAdjustment],
    ['Other_deductions',            otherDeductions],
  ]
  for (const [k, v] of deductionsMap) {
    if (v !== null) deductions[k] = v
  }

  // 합계 계산 (CSV에 있으면 그 값 사용, 없으면 계산)
  const totalEarnings = row.Total_payment
    ? toNum(row.Total_payment)
    : Object.values(earnings).reduce((s, v) => s + v, 0)

  const totalDeductions = row.Total_deductible
    ? toNum(row.Total_deductible, true)
    : Object.values(deductions).reduce((s, v) => s + v, 0)

  const netPay = row.net_pay
    ? toNum(row.net_pay, true)
    : totalEarnings - totalDeductions

  // 근로시간: Over_time → overtime_hours (분 단위)
  const overtimeHours = toNumOrNull(row.Over_time) ?? 0

  return {
    company_id:        companyId,
    employee_id:       employeeId,
    accrual_month:     toAccrualDate(row.pay_month),
    payment_date:      row.payment_date || null,
    start_date:        row.start_date   || null,
    end_date:          row.end_date     || null,
    work_days:         row.work_days    ? toNum(row.work_days) : null,
    overtime_hours:    overtimeHours,
    // 지급 항목 개별 컬럼
    base_salary:               baseSalary,
    overtime_pay_fixed:        overtimePayFixed,
    overtime_pay:              overtimePay,
    holidaytime_pay:           holidaytimePay,
    nighttime_pay:             nighttimePay,
    meal_allowance:            mealAllowance,
    incentive:                 incentive,
    annual_leave_allowance:    annualLeaveAllowance,
    Other_allowances:          otherAllowances,
    Other_allowances2:         otherAllowances2,
    Holiday_bonus:             holidayBonus,
    Total_payment:             row.Total_payment  ? toNum(row.Total_payment)         : null,
    // 공제 항목 개별 컬럼
    national_pension:           nationalPension,
    health_insurance:           healthInsurance,
    longterm_care:              longtermCare,
    employment_insurance:       employmentInsurance,
    income_tax:                 incomeTax,
    resident_tax:               residentTax,
    student_loan:               studentLoan,
    income_tax_refund:          incomeTaxRefund,
    resident_tax_refund:        residentTaxRefund,
    health_insurance_adjustment: healthInsuranceAdjustment,
    Other_deductions:           otherDeductions,
    Total_deductible:           row.Total_deductible ? toNum(row.Total_deductible, true) : null,
    // JSONB
    earnings,
    deductions,
    total_earnings:   totalEarnings,
    total_deductions: totalDeductions,
    net_pay:          netPay,
    calculation_notes: ['표준 CSV 업로드'],
  }
}

/* ── 메인 서버 액션 ─────────────────────────────────────── */
export async function uploadPayslipCsv(
  params: PayslipCsvUploadParams,
): Promise<PayslipCsvResult> {
  const empty: PayslipCsvResult = {
    totalCount: 0, successCount: 0, failureCount: 0, failures: [],
  }

  /* 1. 인증 */
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ...empty, authError: '인증이 필요합니다' }

  /* 2. 권한 확인 */
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | undefined
  if (!role || !['admin', 'manager'].includes(role)) {
    return { ...empty, authError: '권한이 없습니다 (admin / manager 전용)' }
  }

  /* 3. manager: company_id 일치 확인 */
  if (role === 'manager') {
    if (!profile?.company_id || profile.company_id !== params.companyId) {
      return { ...empty, authError: '본인 회사 데이터만 업로드할 수 있습니다' }
    }
  }

  const { companyId, rows } = params
  const totalCount = rows.length
  const allFailures: PayslipCsvFailure[] = []

  /* 4. 행별 형식 검증 */
  for (let i = 0; i < rows.length; i++) {
    allFailures.push(...serverValidateRow(rows[i], i + 2))
  }

  /* 5. 파일 내 중복 검사 */
  const keyCount = new Map<string, number>()
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row.email || !row.pay_month) continue
    const key = `${row.email.toLowerCase()}|${row.pay_month}`
    if (keyCount.has(key)) {
      allFailures.push({
        rowNumber: i + 2,
        email:     row.email,
        reason:    `파일 내 중복 (${row.email} / ${row.pay_month})`,
      })
    } else {
      keyCount.set(key, i + 2)
    }
  }

  /* Option A: 형식/중복 오류 있으면 전체 중단 */
  if (allFailures.length > 0) {
    return {
      totalCount,
      successCount: 0,
      failureCount: allFailures.length,
      failures:     allFailures,
      authError:    '검증 오류가 있어 업로드를 중단했습니다. 오류를 수정 후 다시 업로드해주세요.',
    }
  }

  /* 6. 직원 목록 조회 */
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, email')
    .eq('company_id', companyId)

  if (empError) {
    return { ...empty, totalCount, authError: `직원 조회 오류: ${empError.message}` }
  }

  const emailToId = new Map<string, number>()
  for (const emp of employees ?? []) {
    if (emp.email) emailToId.set(emp.email.toLowerCase(), emp.id as number)
  }

  /* 7. 직원 매칭 */
  const matchFailures: PayslipCsvFailure[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!emailToId.has(row.email.toLowerCase())) {
      matchFailures.push({
        rowNumber: i + 2,
        email:     row.email,
        reason:    `직원 없음 — company_id=${companyId}, email=${row.email}`,
      })
    }
  }

  if (matchFailures.length > 0) {
    return {
      totalCount,
      successCount: 0,
      failureCount: matchFailures.length,
      failures:     matchFailures,
      authError:    `직원 매칭 실패 ${matchFailures.length}건. employees 테이블에서 직원 등록 여부를 확인하세요.`,
    }
  }

  /* 8. upsert 데이터 빌드 */
  const upsertRows = rows.map(row =>
    buildUpsertRecord(row, companyId, emailToId.get(row.email.toLowerCase())!)
  )

  /* 9. bulk upsert */
  const BATCH_SIZE = 100
  let successCount = 0
  const upsertFailures: PayslipCsvFailure[] = []

  for (let start = 0; start < upsertRows.length; start += BATCH_SIZE) {
    const batch = upsertRows.slice(start, start + BATCH_SIZE)

    const { error: upsertError } = await supabase
      .from('pay_info_v2')
      .upsert(batch, {
        onConflict:       'company_id,employee_id,accrual_month',
        ignoreDuplicates: false,
      })

    if (upsertError) {
      for (let j = start; j < start + batch.length; j++) {
        upsertFailures.push({
          rowNumber: j + 2,
          email:     rows[j]?.email ?? '',
          reason:    `DB 저장 오류: ${upsertError.message}`,
        })
      }
    } else {
      successCount += batch.length
    }
  }

  return {
    totalCount,
    successCount,
    failureCount: upsertFailures.length,
    failures:     upsertFailures,
  }
}
