/* ================================================================
   itda — 급여 표준 CSV 유틸 (클라이언트에서 호출)
   parse / validate / template download
   ※ 브라우저 전용 함수(downloadPayslipCsvTemplate)는
     반드시 Client Component에서만 호출할 것.
================================================================ */

import Papa from 'papaparse'
import {
  STANDARD_CSV_COLUMNS,
  downloadStandardCsvTemplate,
} from '@/lib/payroll-csv-template'
import {
  REQUIRED_PAYSLIP_KEYS,
  REQUIRED_PAYSLIP_LABELS,
  type PayslipCsvRow,
  type PayslipCsvFailure,
} from '@/types/payslip-csv-upload'

/* ── 템플릿 다운로드 (re-export) ──────────────────────────── */
/** @alias downloadStandardCsvTemplate */
export const downloadPayslipCsvTemplate = downloadStandardCsvTemplate

/* ── CSV 파싱 ───────────────────────────────────────────────── */
export interface PayslipParseResult {
  rows:        PayslipCsvRow[]
  headerError: string | null
}

export async function parsePayslipCsv(file: File): Promise<PayslipParseResult> {
  return new Promise(resolve => {
    Papa.parse<Record<string, string>>(file, {
      header:         true,
      skipEmptyLines: true,
      encoding:       'UTF-8',
      complete: result => {
        const fields = (result.meta.fields ?? []).map(f => f.trim())

        // 필수 헤더 체크
        const missing = REQUIRED_PAYSLIP_KEYS.filter(k => !fields.includes(k))
        if (missing.length > 0) {
          resolve({
            rows: [],
            headerError: `필수 컬럼 누락: ${missing.map(k => REQUIRED_PAYSLIP_LABELS[k]).join(', ')}`,
          })
          return
        }

        // 알려진 키 목록 (타입-세이프 파싱용)
        const knownKeys = new Set(STANDARD_CSV_COLUMNS.map(c => c.key))

        const rows: PayslipCsvRow[] = result.data.map(raw => {
          const row: Record<string, string> = {}
          for (const key of knownKeys) {
            const v = (raw[key] ?? '').trim()
            if (v) row[key] = v
          }
          // 필수 키는 빈 문자열이라도 포함
          row.email       = (raw['email']       ?? '').trim()
          row.pay_month   = (raw['pay_month']   ?? '').trim()
          row.base_salary = (raw['base_salary'] ?? '').trim()
          return row as unknown as PayslipCsvRow
        })

        resolve({ rows, headerError: null })
      },
      error: () => resolve({
        rows: [],
        headerError: 'CSV 파일을 읽을 수 없습니다. UTF-8 인코딩인지 확인해주세요.',
      }),
    })
  })
}

/* ── 행 검증 ────────────────────────────────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])(-\d{2})?$/
const DATE_RE  = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

/** 숫자 파싱 (음수 허용 여부 선택) */
function parseNum(v: string, allowNegative = false): { valid: boolean; value: number } {
  if (!v) return { valid: true, value: 0 }
  const n = Number(v.replace(/,/g, ''))
  if (isNaN(n)) return { valid: false, value: 0 }
  if (!allowNegative && n < 0) return { valid: false, value: n }
  return { valid: true, value: n }
}

export function validatePayslipRow(
  row: PayslipCsvRow,
  rowNumber: number,
): PayslipCsvFailure[] {
  const failures: PayslipCsvFailure[] = []
  const addFail = (reason: string) =>
    failures.push({ rowNumber, email: row.email, reason })

  // 이메일
  if (!row.email) addFail('이메일 필수값')
  else if (!EMAIL_RE.test(row.email)) addFail(`이메일 형식 오류: ${row.email}`)

  // 귀속월
  if (!row.pay_month) addFail('귀속월 필수값 (YYYY-MM)')
  else if (!MONTH_RE.test(row.pay_month)) addFail(`귀속월 형식 오류: ${row.pay_month}`)

  // 기본급
  if (!row.base_salary) addFail('기본급 필수값')
  else {
    const { valid } = parseNum(row.base_salary)
    if (!valid) addFail(`기본급 숫자 오류: ${row.base_salary}`)
  }

  // 지급 항목 (선택, 비음수)
  const earningsFields: [keyof PayslipCsvRow, string][] = [
    ['overtime_pay_fixed',     '고정연장수당'],
    ['overtime_pay',           '연장근로수당'],
    ['holidaytime_pay',        '휴일근로수당'],
    ['nighttime_pay',          '야간근로수당'],
    ['meal_allowance',         '식대'],
    ['incentive',              '인센티브'],
    ['annual_leave_allowance', '연차수당'],
    ['Other_allowances',       '기타수당1'],
    ['Other_allowances2',      '기타수당2'],
    ['Holiday_bonus',          '명절상여'],
    ['Total_payment',          '지급합계'],
  ]
  for (const [key, label] of earningsFields) {
    const val = row[key]
    if (val) {
      const { valid } = parseNum(val)
      if (!valid) addFail(`${label} 숫자 오류: ${val}`)
    }
  }

  // 공제 항목 + 합계 (선택, 음수 허용 — 환급)
  const deductionFields: [keyof PayslipCsvRow, string][] = [
    ['Total_deductible',            '공제합계'],
    ['national_pension',            '국민연금'],
    ['health_insurance',            '건강보험'],
    ['longterm_care',               '장기요양보험료'],
    ['employment_insurance',        '고용보험'],
    ['income_tax',                  '소득세'],
    ['resident_tax',                '지방소득세'],
    ['student_loan',                '학자금대출'],
    ['income_tax_refund',           '소득세환급'],
    ['resident_tax_refund',         '지방소득세환급'],
    ['health_insurance_adjustment', '건강보험료정산'],
    ['Other_deductions',            '기타공제'],
    ['net_pay',                     '차인지급액'],
  ]
  for (const [key, label] of deductionFields) {
    const val = row[key]
    if (val) {
      const { valid } = parseNum(val, true)
      if (!valid) addFail(`${label} 숫자 오류: ${val}`)
    }
  }

  // 날짜 필드 (선택)
  if (row.payment_date && !DATE_RE.test(row.payment_date))
    addFail(`급여지급일 형식 오류: ${row.payment_date} (YYYY-MM-DD 필요)`)
  if (row.start_date && !DATE_RE.test(row.start_date))
    addFail(`정산시작일 형식 오류: ${row.start_date} (YYYY-MM-DD 필요)`)
  if (row.end_date && !DATE_RE.test(row.end_date))
    addFail(`정산종료일 형식 오류: ${row.end_date} (YYYY-MM-DD 필요)`)

  return failures
}

/* ── 파일 내 중복 검사 ─────────────────────────────────────── */
export function checkPayslipInternalDuplicates(rows: PayslipCsvRow[]): {
  duplicates: Map<string, number[]>
} {
  const seen       = new Map<string, number>()
  const duplicates = new Map<string, number[]>()

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2
    const key = `${row.email.toLowerCase()}|${row.pay_month}`

    if (seen.has(key)) {
      const existing = duplicates.get(key) ?? [seen.get(key)!]
      duplicates.set(key, [...existing, rowNumber])
    } else {
      seen.set(key, rowNumber)
    }
  })

  return { duplicates }
}
