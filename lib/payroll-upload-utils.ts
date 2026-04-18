/* ================================================================
   itda — CSV 업로드 순수 유틸 함수 (Supabase 의존 없음)
   클라이언트 + 서버 양쪽에서 사용 가능
================================================================ */

import type {
  CsvRow,
  ColumnMapping,
  EmployeeMaster,
  ValidationResult,
  ValidationError,
  PayInfoPayload,
  PreviewRow,
} from '@/types/payroll-upload'
import { toAccrualDate } from '@/lib/payslip-utils'

/* ────────────────────────────────────────────────────────
   parseCurrency
   "3,000,000" | "-51,635" | "3000000" | null | undefined → number
   NaN, 빈값, null 모두 0 반환
──────────────────────────────────────────────────────── */
export function parseCurrency(value: string | undefined | null): number {
  if (value == null) return 0
  const trimmed = value.trim()
  if (trimmed === '') return 0
  const cleaned = trimmed.replace(/[,\s₩원]/g, '')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

/* ────────────────────────────────────────────────────────
   날짜 유효성 검사
──────────────────────────────────────────────────────── */
export function isValidDate(v: string): boolean {
  if (!v || typeof v !== 'string') return false
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v))
}

export function isValidMonth(v: string): boolean {
  if (!v || typeof v !== 'string') return false
  return /^\d{4}-(0[1-9]|1[0-2])(-\d{2})?$/.test(v)
}

/* ────────────────────────────────────────────────────────
   안전한 문자열 trim
   null / undefined 도 안전하게 처리
──────────────────────────────────────────────────────── */
function safeTrim(value: string | undefined | null): string {
  return (value ?? '').trim()
}

/* ────────────────────────────────────────────────────────
   getColStr
   CSV 행에서 값을 읽을 때 csv_column_name 우선, 없으면 label_ko 로 재시도
   → 한글 헤더로 다운받은 양식도 업로드 가능
──────────────────────────────────────────────────────── */
function getColStr(
  row:     CsvRow,
  mapping: ColumnMapping | undefined,
  fallback: string,
): string {
  if (!mapping) return safeTrim(row[fallback])
  const v = row[mapping.csv_column_name]
             ?? (mapping.label_ko != null ? row[mapping.label_ko] : undefined)
  return safeTrim(v)
}

function getColRaw(row: CsvRow, mapping: ColumnMapping): string | undefined {
  return row[mapping.csv_column_name]
      ?? (mapping.label_ko != null ? row[mapping.label_ko] : undefined)
}

/* ────────────────────────────────────────────────────────
   validateCsvRows
   ★ 핵심 도메인 규칙:
     - 시스템 미등록 이메일 → severity:'error' → canUpload:false → 전체 중단
     - 다른 회사 직원      → severity:'warning' → 해당 행만 무시
──────────────────────────────────────────────────────── */
export function validateCsvRows(
  rows:      CsvRow[],
  employees: EmployeeMaster[],
  mappings:  ColumnMapping[],
  companyId: number,
): ValidationResult {
  const errors: ValidationError[] = []

  const emailMap = mappings.find(m => m.db_key === 'email')
  const monthMap = mappings.find(m => m.db_key === 'accrual_month')
  const dateMap  = mappings.find(m => m.db_key === 'payment_date')

  const companyEmailSet = new Set(
    employees
      .filter(e => e.company_id === companyId)
      .map(e => e.email.toLowerCase()),
  )
  const allEmailSet = new Set(employees.map(e => e.email.toLowerCase()))

  let validRows = 0
  let ignoredRows = 0

  for (let i = 0; i < rows.length; i++) {
    const row  = rows[i]
    const rIdx = i + 2   // 헤더 제외, 1-based
    const email = getColStr(row, emailMap, 'email').toLowerCase()
    let rowOk = true

    // 이메일 누락
    if (!email) {
      errors.push({ rowIndex: rIdx, reason: '이메일이 비어 있습니다', severity: 'error' })
      rowOk = false

    // ★ 핵심: 시스템 미등록 이메일 → 전체 업로드 중단
    } else if (!allEmailSet.has(email)) {
      errors.push({
        rowIndex: rIdx,
        email,
        reason: '시스템에 등록되지 않은 직원 이메일입니다',
        severity: 'error',
      })
      rowOk = false

    // 다른 회사 직원 → 경고 + 무시
    } else if (!companyEmailSet.has(email)) {
      errors.push({
        rowIndex: rIdx,
        email,
        reason: '선택한 회사 소속 직원이 아닙니다 (행 무시)',
        severity: 'warning',
      })
      ignoredRows++
      rowOk = false
    }

    // 귀속월 형식 검사
    const month = getColStr(row, monthMap, 'accrual_month')
    if (month && !isValidMonth(month)) {
      errors.push({
        rowIndex: rIdx,
        email: email || undefined,
        reason: `귀속월 형식 오류: "${month}" (YYYY-MM 필요)`,
        severity: 'error',
      })
      rowOk = false
    }

    // 지급일 형식 검사
    const pd = getColStr(row, dateMap, 'payment_date')
    if (pd && !isValidDate(pd)) {
      errors.push({
        rowIndex: rIdx,
        email: email || undefined,
        reason: `지급일 형식 오류: "${pd}" (YYYY-MM-DD 필요)`,
        severity: 'error',
      })
      rowOk = false
    }

    if (rowOk) validRows++
  }

  const errorCount = errors.filter(e => e.severity === 'error').length

  return {
    totalRows:   rows.length,
    validRows,
    ignoredRows,
    errorRows:   errorCount,
    canUpload:   errorCount === 0,
    errors,
  }
}

/* ────────────────────────────────────────────────────────
   transformCsvRows: CSV rows → PreviewRow[]
   column_mappings 기준으로 earnings/deductions JSONB 빌드
──────────────────────────────────────────────────────── */
export function transformCsvRows(
  rows:           CsvRow[],
  employees:      EmployeeMaster[],
  mappings:       ColumnMapping[],
  companyId:      number,
  defaultMonth:   string,
  defaultPayDate: string | null,
): PreviewRow[] {
  const emailMap     = mappings.find(m => m.db_key === 'email')
  const monthMap     = mappings.find(m => m.db_key === 'accrual_month')
  const dateMap      = mappings.find(m => m.db_key === 'payment_date')
  const startDateMap = mappings.find(m => m.db_key === 'start_date')
  const endDateMap   = mappings.find(m => m.db_key === 'end_date')
  const totalPayMap  = mappings.find(m => m.db_key === 'Total_payment')
  const totalDeMap   = mappings.find(m => m.db_key === 'Total_deductible')
  const netPayMap    = mappings.find(m => m.db_key === 'net_pay')

  // ★ workDayKey, otKey는 현재 미사용이므로 제거 (빌드 경고 방지)

  const earningMaps   = mappings.filter(m =>
    m.group_type === 'earnings' && m.db_key !== 'Total_payment'
  )
  const deductionMaps = mappings.filter(m =>
    m.group_type === 'deductions' &&
    m.db_key !== 'Total_deductible' &&
    m.db_key !== 'net_pay'
  )

  const companyEmails = new Set(
    employees.filter(e => e.company_id === companyId).map(e => e.email.toLowerCase()),
  )
  const empMap = new Map(employees.map(e => [e.email.toLowerCase(), e]))

  return rows.map((row, i) => {
    const rIdx  = i + 2
    const email = getColStr(row, emailMap, 'email').toLowerCase()
    const emp   = empMap.get(email)


    // 무효/무시 행 — 빠른 반환
    if (!email || !emp || !companyEmails.has(email)) {
      const status: PreviewRow['status'] = !email || !emp ? 'error' : 'ignored'
      const errorReason = !email
        ? '이메일 없음'
        : !emp
        ? '미등록 직원'
        : '다른 회사 직원'

      return {
        rowIndex:        rIdx,
        email,
        employeeName:    emp?.name ?? '—',
        accrualMonth:    '',
        paymentDate:     '',
        earnings:        {},
        deductions:      {},
        totalEarnings:   0,
        totalDeductions: 0,
        netPay:          0,
        status,
        errorReason,
      } satisfies PreviewRow
    }

    // ── earnings JSONB 빌드 ──────────────────────────────
    const earnings: Record<string, number> = {}
    for (const m of earningMaps) {
      const v = parseCurrency(getColRaw(row, m))
      if (v !== 0) earnings[m.db_key] = v
    }

    // ── deductions JSONB 빌드 ────────────────────────────
    const deductions: Record<string, number> = {}
    for (const m of deductionMaps) {
      const v = parseCurrency(getColRaw(row, m))
      if (v !== 0) deductions[m.db_key] = v
    }

    // ── 합계 계산 ─────────────────────────────────────────
    const totalEarnings =
      totalPayMap != null
        ? parseCurrency(getColRaw(row, totalPayMap))
        : Object.values(earnings).reduce((s, v) => s + v, 0)

    const totalDeductions =
      totalDeMap != null
        ? parseCurrency(getColRaw(row, totalDeMap))
        : Object.values(deductions).reduce((s, v) => s + v, 0)

    const netPay =
      netPayMap != null
        ? parseCurrency(getColRaw(row, netPayMap))
        : totalEarnings - totalDeductions

    const accrualMonth = getColStr(row, monthMap,     'accrual_month') || defaultMonth
    const paymentDate  = getColStr(row, dateMap,      'payment_date')  || (defaultPayDate ?? '')
    const startDate    = getColStr(row, startDateMap, 'start_date')    || undefined
    const endDate      = getColStr(row, endDateMap,   'end_date')      || undefined

    return {
      rowIndex:        rIdx,
      email,
      employeeName:    emp.name,
      accrualMonth,
      paymentDate,
      startDate,
      endDate,
      earnings,
      deductions,
      totalEarnings,
      totalDeductions,
      netPay,
      status:          'valid',
    } satisfies PreviewRow
  })
}

/* ────────────────────────────────────────────────────────
   toPayInfoPayloads: PreviewRow[] → PayInfoPayload[]
──────────────────────────────────────────────────────── */
export function toPayInfoPayloads(
  previews:  PreviewRow[],
  employees: EmployeeMaster[],
  companyId: number,
): PayInfoPayload[] {
  const empMap = new Map(employees.map(e => [e.email.toLowerCase(), e]))

  return previews
    .filter(p => p.status === 'valid')
    .flatMap(p => {
      // ★ null assertion(!) 제거 — 안전하게 처리
      const emp = empMap.get(p.email)
      if (!emp) return []   // 매핑 실패 시 조용히 건너뜀

      // earnings/deductions JSONB에서 개별 컬럼 추출 (null-safe)
      const e = p.earnings
      const d = p.deductions
      const nvl = (v: number | undefined): number | null => (v !== undefined && v !== 0) ? v : null

      return [{
        company_id:        companyId,
        employee_id:       emp.id,
        accrual_month:     toAccrualDate(p.accrualMonth ?? ''),
        payment_date:      p.paymentDate || null,
        start_date:        p.startDate   || null,
        end_date:          p.endDate     || null,
        work_days:         null,
        overtime_hours:    null,
        Total_tax_salary:  nvl(e.Total_tax_salary),
        // 지급 항목 개별 컬럼
        base_salary:               nvl(e.base_salary),
        overtime_pay_fixed:        nvl(e.overtime_pay_fixed),
        overtime_pay:              nvl(e.overtime_pay),
        holidaytime_pay:           nvl(e.holidaytime_pay),
        nighttime_pay:             nvl(e.nighttime_pay),
        meal_allowance:            nvl(e.meal_allowance),
        incentive:                 nvl(e.incentive),
        annual_leave_allowance:    nvl(e.annual_leave_allowance),
        Other_allowances:          nvl(e.Other_allowances),
        Other_allowances2:         nvl(e.Other_allowances2),
        Holiday_bonus:             nvl(e.Holiday_bonus),
        Total_payment:             p.totalEarnings || null,
        // 공제 항목 개별 컬럼
        national_pension:           nvl(d.national_pension),
        health_insurance:           nvl(d.health_insurance),
        longterm_care:              nvl(d.longterm_care),
        employment_insurance:       nvl(d.employment_insurance),
        income_tax:                 nvl(d.income_tax),
        resident_tax:               nvl(d.resident_tax),
        student_loan:               nvl(d.student_loan),
        income_tax_refund:          d.income_tax_refund !== undefined ? d.income_tax_refund : null,
        resident_tax_refund:        d.resident_tax_refund !== undefined ? d.resident_tax_refund : null,
        Total_deductible:           p.totalDeductions || null,
        Other_deductions:           nvl(d.Other_deductions),
        health_insurance_adjustment: nvl(d.health_insurance_adjustment),
        // JSONB (표시용)
        earnings:          p.earnings,
        deductions:        p.deductions,
        total_earnings:    p.totalEarnings,
        total_deductions:  p.totalDeductions,
        net_pay:           p.netPay,
        calculation_notes: [],
      } satisfies PayInfoPayload]
    })
}
