/* ================================================================
   itda — 급여대장 Excel/CSV 파싱 유틸리티
   xlsx 패키지를 사용하여 클라이언트 사이드에서 파싱 수행
   직원 식별: 사번(1순위) → 이름(2순위, 단일 매칭만)
================================================================ */

// ── 한국어 컬럼명 → DB 키 매핑 ────────────────────────────────
export const LEDGER_COLUMN_MAP: Record<string, string> = {
  // 직원 식별
  '사번':        'employee_number',
  '사원번호':    'employee_number',
  '직원번호':    'employee_number',
  '사원코드':    'employee_number',
  '성명':        'name',
  '이름':        'name',
  '직원명':      'name',
  '사원명':      'name',

  // 귀속월 / 지급일
  '귀속월':      'accrual_month',
  '급여월':      'accrual_month',
  '지급월':      'accrual_month',
  '귀속년월':    'accrual_month',
  '지급일':      'payment_date',
  '급여지급일':  'payment_date',
  '지급년월일':  'payment_date',

  // 지급 항목
  '기본급':          'base_salary',
  '정연장수당':      'overtime_pay_fixed',
  '고정연장수당':    'overtime_pay_fixed',
  '연장근로수당':    'overtime_pay',
  '시간외수당':      'overtime_pay',
  '연장수당':        'overtime_pay',
  '휴일근로수당':    'holidaytime_pay',
  '휴일수당':        'holidaytime_pay',
  '야간근로수당':    'nighttime_pay',
  '야간수당':        'nighttime_pay',
  '식대':            'meal_allowance',
  '식비':            'meal_allowance',
  '식사비':          'meal_allowance',
  '인센티브':        'incentive',
  '성과급':          'incentive',
  '연차수당':        'annual_leave_allowance',
  '잔여연차수당':    'annual_leave_allowance',
  '미사용연차수당':  'annual_leave_allowance',
  '기타수당1':       'Other_allowances',
  '기타수당':        'Other_allowances',
  '기타수당2':       'Other_allowances2',
  '명절상여':        'Holiday_bonus',
  '명절보너스':      'Holiday_bonus',
  '상여':            'Holiday_bonus',
  '지급합계':        'Total_payment',
  '총지급액':        'Total_payment',
  '지급액합계':      'Total_payment',

  // 공제 항목
  '국민연금':          'national_pension',
  '건강보험':          'health_insurance',
  '장기요양보험':      'longterm_care',
  '장기요양보험료':    'longterm_care',
  '건강보험료':        'longterm_care',
  '고용보험':          'employment_insurance',
  '소득세':            'income_tax',
  '주민세':            'resident_tax',
  '지방소득세':        'resident_tax',
  '학자금대출':        'student_loan',
  '상가금대출':        'student_loan',
  '소득세환급':        'income_tax_refund',
  '지방소득세환급':    'resident_tax_refund',
  '주민세환급':        'resident_tax_refund',
  '기타공제':          'Other_deductions',
  '건강보험료정산':    'health_insurance_adjustment',
  '공제합계':          'Total_deductible',
  '총공제액':          'Total_deductible',
  '공제액합계':        'Total_deductible',

  // 실수령액
  '차인지급액':   'net_pay',
  '실수령액':     'net_pay',
  '실지급액':     'net_pay',
  '실급여':       'net_pay',
}

// ── earnings / deductions DB 키 목록 ──────────────────────────
export const EARNINGS_DB_KEYS = [
  'base_salary', 'overtime_pay_fixed', 'overtime_pay',
  'holidaytime_pay', 'nighttime_pay', 'meal_allowance',
  'incentive', 'annual_leave_allowance', 'Other_allowances',
  'Other_allowances2', 'Holiday_bonus',
] as const

export const DEDUCTIONS_DB_KEYS = [
  'national_pension', 'health_insurance', 'longterm_care',
  'employment_insurance', 'income_tax', 'resident_tax',
  'student_loan', 'income_tax_refund', 'resident_tax_refund',
  'Other_deductions', 'health_insurance_adjustment',
] as const

// ── 숫자 변환 ────────────────────────────────────────────────
export function toNumber(value: unknown): number {
  if (value == null) return 0
  const str = String(value).replace(/[,\s₩원]/g, '').trim()
  if (str === '' || str === '-') return 0
  const n = parseFloat(str)
  return isNaN(n) ? 0 : n
}

// ── 귀속월 파싱 (YYYY-MM) ────────────────────────────────────
export function parsePayMonth(value: unknown): string | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  // "2025-03", "2025.03", "2025년 3월", "202503"
  const m = raw.match(/(\d{4})[년\-./\s]*(\d{1,2})/)
  if (!m) return null
  return `${m[1]}-${m[2].padStart(2, '0')}`
}

// ── 지급일 파싱 (YYYY-MM-DD) ─────────────────────────────────
export function parsePayDate(value: unknown): string | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  // "2025-03-25", "2025.03.25", "2025년 3월 25일"
  const m = raw.match(/(\d{4})[년\-./\s]*(\d{1,2})[월\-./\s]*(\d{1,2})/)
  if (!m) return null
  const y = m[1], mo = m[2].padStart(2, '0'), d = m[3].padStart(2, '0')
  const dt = new Date(`${y}-${mo}-${d}`)
  if (isNaN(dt.getTime())) return null
  return `${y}-${mo}-${d}`
}

// ── 파싱된 급여대장 1행 ───────────────────────────────────────
export interface ParsedLedgerRow {
  rowIndex:           number
  rawName:            string
  rawEmployeeNumber:  string
  accrualMonth:       string | null
  paymentDate:        string | null
  // 지급 항목
  base_salary:             number
  overtime_pay_fixed:      number
  overtime_pay:            number
  holidaytime_pay:         number
  nighttime_pay:           number
  meal_allowance:          number
  incentive:               number
  annual_leave_allowance:  number
  Other_allowances:        number
  Other_allowances2:       number
  Holiday_bonus:           number
  Total_payment:           number
  // 공제 항목
  national_pension:           number
  health_insurance:           number
  longterm_care:              number
  employment_insurance:       number
  income_tax:                 number
  resident_tax:               number
  student_loan:               number
  income_tax_refund:          number
  resident_tax_refund:        number
  Other_deductions:           number
  health_insurance_adjustment: number
  Total_deductible:           number
  // 차인지급액
  net_pay: number
}

// ── JSON rows → ParsedLedgerRow[] ────────────────────────────
export function parseLedgerRows(
  jsonRows: Record<string, unknown>[],
): ParsedLedgerRow[] {
  const results: ParsedLedgerRow[] = []

  for (let i = 0; i < jsonRows.length; i++) {
    const raw = jsonRows[i]

    // 한국어 헤더 → DB 키 매핑
    const mapped: Record<string, unknown> = {}
    for (const [header, value] of Object.entries(raw)) {
      const dbKey = LEDGER_COLUMN_MAP[header.trim()]
      if (dbKey) mapped[dbKey] = value
    }

    const name            = String(mapped['name']            ?? '').trim()
    const employeeNumber  = String(mapped['employee_number'] ?? '').trim()

    // 이름도 없고 사번도 없으면 스킵
    if (!name && !employeeNumber) continue

    results.push({
      rowIndex:          i + 2,   // 헤더 = 1행
      rawName:           name,
      rawEmployeeNumber: employeeNumber,
      accrualMonth:      parsePayMonth(mapped['accrual_month']),
      paymentDate:       parsePayDate(mapped['payment_date']),
      // 지급
      base_salary:              toNumber(mapped['base_salary']),
      overtime_pay_fixed:       toNumber(mapped['overtime_pay_fixed']),
      overtime_pay:             toNumber(mapped['overtime_pay']),
      holidaytime_pay:          toNumber(mapped['holidaytime_pay']),
      nighttime_pay:            toNumber(mapped['nighttime_pay']),
      meal_allowance:           toNumber(mapped['meal_allowance']),
      incentive:                toNumber(mapped['incentive']),
      annual_leave_allowance:   toNumber(mapped['annual_leave_allowance']),
      Other_allowances:         toNumber(mapped['Other_allowances']),
      Other_allowances2:        toNumber(mapped['Other_allowances2']),
      Holiday_bonus:            toNumber(mapped['Holiday_bonus']),
      Total_payment:            toNumber(mapped['Total_payment']),
      // 공제
      national_pension:           toNumber(mapped['national_pension']),
      health_insurance:           toNumber(mapped['health_insurance']),
      longterm_care:              toNumber(mapped['longterm_care']),
      employment_insurance:       toNumber(mapped['employment_insurance']),
      income_tax:                 toNumber(mapped['income_tax']),
      resident_tax:               toNumber(mapped['resident_tax']),
      student_loan:               toNumber(mapped['student_loan']),
      income_tax_refund:          toNumber(mapped['income_tax_refund']),
      resident_tax_refund:        toNumber(mapped['resident_tax_refund']),
      Other_deductions:           toNumber(mapped['Other_deductions']),
      health_insurance_adjustment: toNumber(mapped['health_insurance_adjustment']),
      Total_deductible:           toNumber(mapped['Total_deductible']),
      net_pay:                    toNumber(mapped['net_pay']),
    })
  }

  return results
}

// ── 클라이언트 사이드 Excel/CSV 파싱 (xlsx 동적 import) ───────
export async function parsePayrollFile(
  file: File,
): Promise<{ rows: ParsedLedgerRow[]; error: string | null; detectedHeaders: string[] }> {
  try {
    const XLSX = await import('xlsx')
    const buf  = await file.arrayBuffer()

    const workbook = XLSX.read(buf, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return { rows: [], error: '시트를 찾을 수 없습니다.', detectedHeaders: [] }
    }

    const sheet   = workbook.Sheets[sheetName]
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,   // 모든 값을 문자열로 (날짜 자동 변환 방지)
    })

    if (jsonRows.length === 0) {
      return { rows: [], error: '데이터가 없습니다. 파일을 확인해주세요.', detectedHeaders: [] }
    }

    // 첫 행에서 헤더 추출
    const allHeaders   = Object.keys(jsonRows[0])
    const mappedHeaders = allHeaders.filter(h => LEDGER_COLUMN_MAP[h.trim()])
    const unmappedHeaders = allHeaders.filter(h => !LEDGER_COLUMN_MAP[h.trim()])

    if (mappedHeaders.length === 0) {
      return {
        rows: [],
        error: `인식된 컬럼이 없습니다. 급여대장 양식인지 확인해주세요.\n감지된 헤더: ${allHeaders.slice(0, 10).join(', ')}`,
        detectedHeaders: allHeaders,
      }
    }

    // 성명 또는 사번 컬럼 필수
    const hasName   = mappedHeaders.some(h => LEDGER_COLUMN_MAP[h.trim()] === 'name')
    const hasEmpNum = mappedHeaders.some(h => LEDGER_COLUMN_MAP[h.trim()] === 'employee_number')
    if (!hasName && !hasEmpNum) {
      return {
        rows: [],
        error: '성명 또는 사번 컬럼이 필요합니다. 직원 식별이 불가합니다.',
        detectedHeaders: allHeaders,
      }
    }

    // 귀속월 컬럼 필수
    const hasMonth = mappedHeaders.some(h => LEDGER_COLUMN_MAP[h.trim()] === 'accrual_month')
    if (!hasMonth) {
      return {
        rows: [],
        error: `귀속월 컬럼(귀속월/급여월/지급월)이 필요합니다.\n인식된 컬럼: ${mappedHeaders.join(', ')}`,
        detectedHeaders: allHeaders,
      }
    }

    const rows = parseLedgerRows(jsonRows)

    console.log(`[parsePayrollFile] 인식된 컬럼: ${mappedHeaders.join(', ')}`)
    if (unmappedHeaders.length > 0) {
      console.log(`[parsePayrollFile] 무시된 컬럼: ${unmappedHeaders.join(', ')}`)
    }

    return { rows, error: null, detectedHeaders: mappedHeaders }
  } catch (e) {
    console.error('[parsePayrollFile]', e)
    return {
      rows: [],
      error: '파일을 읽을 수 없습니다. xlsx/csv 파일인지 확인해주세요.',
      detectedHeaders: [],
    }
  }
}
