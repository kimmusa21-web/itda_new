/* ================================================================
   itda — CSV 업로드 순수 유틸리티 함수 (Supabase 의존 없음)
================================================================ */

import type {
  CsvRow, ColumnMapping, MappingGroup,
  ValidationResult, ValidationError,
  PayInfoPayload, PreviewRow, EmployeeMaster,
} from '@/types/payroll-upload'

/* ── 1. 숫자 파싱 ─────────────────────────────────────
   "3,000,000" | "3000000" | "-51,635" → number
────────────────────────────────────────────────────── */
export function parseCurrency(value: string): number {
  if (!value || value.trim() === '') return 0
  const cleaned = value.replace(/[,\s₩원]/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

/* ── 2. 날짜 형식 확인 ─────────────────────────────── */
export function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value))
}

export function isValidMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value)
}

/* ── 3. CSV 행 검증 ────────────────────────────────────
   도메인 규칙:
   - 미등록 직원 이메일 → severity:'error' → canUpload:false
   - 다른 회사 직원    → severity:'warning' (무시 행)
   - 이메일 누락       → error
   - 날짜 형식 오류    → error
────────────────────────────────────────────────────── */
export function validateCsvRows(
  rows: CsvRow[],
  employees: EmployeeMaster[],
  mappings: ColumnMapping[],
  companyId: number,
): ValidationResult {
  const errors: ValidationError[] = []

  const emailCol  = mappings.find(m => m.db_key === 'email')?.csv_column_name    ?? 'email'
  const monthCol  = mappings.find(m => m.db_key === 'accrual_month')?.csv_column_name ?? 'accrual_month'
  const dateCol   = mappings.find(m => m.db_key === 'payment_date')?.csv_column_name  ?? 'payment_date'

  // 이 회사 직원 이메일 Set
  const companyEmails = new Set(
    employees.filter(e => e.company_id === companyId).map(e => e.email.toLowerCase()),
  )
  // 전체 직원 이메일 Set (다른 회사 포함)
  const allEmails = new Set(employees.map(e => e.email.toLowerCase()))

  let validRows   = 0
  let ignoredRows = 0

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i]
    const rIdx   = i + 2           // 헤더 제외 1-based
    const email  = (row[emailCol] ?? '').trim().toLowerCase()
    let rowOk    = true

    // 이메일 누락
    if (!email) {
      errors.push({ rowIndex: rIdx, reason: '이메일 값이 비어 있습니다', severity: 'error' })
      rowOk = false
    }
    // ★ 핵심 도메인 규칙: 시스템 미등록 이메일 → 전체 업로드 중단
    else if (!allEmails.has(email)) {
      errors.push({ rowIndex: rIdx, email, reason: '시스템에 등록되지 않은 직원 이메일입니다', severity: 'error' })
      rowOk = false
    }
    // 다른 회사 직원 → 무시(warning)
    else if (!companyEmails.has(email)) {
      errors.push({ rowIndex: rIdx, email, reason: '선택한 회사 소속이 아닌 직원입니다 (행 무시)', severity: 'warning' })
      ignoredRows++
      rowOk = false
    }

    // 귀속월 형식
    const month = (row[monthCol] ?? '').trim()
    if (month && !isValidMonth(month)) {
      errors.push({ rowIndex: rIdx, email: email || undefined, reason: `귀속월 형식 오류: "${month}" (YYYY-MM 필요)`, severity: 'error' })
      rowOk = false
    }

    // 지급일 형식
    const pd = (row[dateCol] ?? '').trim()
    if (pd && !isValidDate(pd)) {
      errors.push({ rowIndex: rIdx, email: email || undefined, reason: `지급일 형식 오류: "${pd}" (YYYY-MM-DD 필요)`, severity: 'error' })
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

/* ── 4. CSV 행 → PayInfoPayload 변환 ──────────────────
   mappings 기준으로 earnings / deductions JSONB 빌드
────────────────────────────────────────────────────── */
export function transformCsvRows(
  rows: CsvRow[],
  mappings: ColumnMapping[],
  employees: EmployeeMaster[],
  companyId: number,
  defaultMonth: string,
  defaultPayDate: string | null,
): PreviewRow[] {
  const emailCol   = mappings.find(m => m.db_key === 'email')?.csv_column_name ?? 'email'
  const monthCol   = mappings.find(m => m.db_key === 'accrual_month')?.csv_column_name ?? 'accrual_month'
  const dateCol    = mappings.find(m => m.db_key === 'payment_date')?.csv_column_name  ?? 'payment_date'
  const workDaysCol = mappings.find(m => m.db_key === 'work_days')?.csv_column_name
  const otCol      = mappings.find(m => m.db_key === 'overtime_hours')?.csv_column_name
  const totalPayCol = mappings.find(m => m.db_key === 'Total_payment')?.csv_column_name
  const totalDeCol  = mappings.find(m => m.db_key === 'Total_deductible')?.csv_column_name
  const netPayCol   = mappings.find(m => m.db_key === 'net_pay')?.csv_column_name

  const earningsMaps    = mappings.filter(m => m.group_type === 'earnings' && !['Total_payment'].includes(m.db_key))
  const deductionsMaps  = mappings.filter(m => m.group_type === 'deductions' && !['Total_deductible','net_pay'].includes(m.db_key))

  const companyEmails = new Set(
    employees.filter(e => e.company_id === companyId).map(e => e.email.toLowerCase()),
  )
  const empMap = new Map(employees.map(e => [e.email.toLowerCase(), e]))

  return rows.map((row, i) => {
    const rIdx = i + 2
    const email = (row[emailCol] ?? '').trim().toLowerCase()
    const emp   = empMap.get(email)

    // 오류/무시 행
    if (!email || !emp || !companyEmails.has(email)) {
      return {
        rowIndex: rIdx, email,
        employeeName: emp?.name ?? '—',
        accrualMonth: '', paymentDate: '',
        earnings: {}, deductions: {},
        totalEarnings: 0, totalDeductions: 0, netPay: 0,
        status: !email ? 'error' : !emp ? 'error' : 'ignored',
        errorReason: !email ? '이메일 없음' : !emp ? '미등록 직원' : '다른 회사',
      } as PreviewRow
    }

    // earnings JSON 빌드
    const earnings: Record<string, number> = {}
    for (const m of earningsMaps) {
      const v = parseCurrency(row[m.csv_column_name] ?? '')
      if (v !== 0) earnings[m.db_key] = v
    }

    // deductions JSON 빌드
    const deductions: Record<string, number> = {}
    for (const m of deductionsMaps) {
      const v = parseCurrency(row[m.csv_column_name] ?? '')
      if (v !== 0) deductions[m.db_key] = v
    }

    // 합계 계산
    const totalEarnings   = totalPayCol  ? parseCurrency(row[totalPayCol] ?? '') : Object.values(earnings).reduce((s,v)=>s+v,0)
    const totalDeductions = totalDeCol   ? parseCurrency(row[totalDeCol]  ?? '') : Object.values(deductions).reduce((s,v)=>s+v,0)
    const netPay          = netPayCol    ? parseCurrency(row[netPayCol]   ?? '') : totalEarnings - totalDeductions

    return {
      rowIndex:      rIdx,
      email,
      employeeName:  emp.name,
      accrualMonth:  (row[monthCol] ?? '').trim() || defaultMonth,
      paymentDate:   (row[dateCol]  ?? '').trim() || defaultPayDate ?? '',
      earnings,
      deductions,
      totalEarnings,
      totalDeductions,
      netPay,
      status: 'valid',
    } as PreviewRow
  })
}

/* ── 5. PreviewRow[] → PayInfoPayload[] ─────────────── */
export function toPayInfoPayloads(
  previews: PreviewRow[],
  employees: EmployeeMaster[],
  companyId: number,
): PayInfoPayload[] {
  const empMap = new Map(employees.map(e => [e.email.toLowerCase(), e]))

  return previews
    .filter(p => p.status === 'valid')
    .map(p => {
      const emp = empMap.get(p.email)!
      return {
        company_id:       companyId,
        employee_id:      emp.id,
        accrual_month:    p.accrualMonth,
        payment_date:     p.paymentDate || null,
        work_days:        null,
        overtime_hours:   null,
        earnings:         p.earnings,
        deductions:       p.deductions,
        total_earnings:   p.totalEarnings,
        total_deductions: p.totalDeductions,
        net_pay:          p.netPay,
        calculation_notes: [],
      }
    })
}
