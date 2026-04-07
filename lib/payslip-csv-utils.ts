/* ================================================================
   itda — 급여 간편 CSV 유틸 (클라이언트에서 호출)
   parse / validate / template download
   ※ 브라우저 전용 함수(downloadPayslipCsvTemplate)는
     반드시 Client Component에서만 호출할 것.
================================================================ */

import Papa from 'papaparse'
import {
  PAYSLIP_CSV_HEADERS,
  REQUIRED_PAYSLIP_HEADERS,
  PAYSLIP_HEADER_LABELS,
  type PayslipCsvRow,
  type PayslipCsvFailure,
} from '@/types/payslip-csv-upload'

/* ── CSV 템플릿 생성 ────────────────────────────────────────── */
export function generatePayslipCsvTemplate(): string {
  const headers = PAYSLIP_CSV_HEADERS.join(',')
  const example1 = [
    'hong@example.com', '2026-04', '3000000', '200000', '100000', '50000', '2026-04-25',
  ].join(',')
  const example2 = [
    'kim@example.com', '2026-04', '2800000', '0', '50000', '40000', '2026-04-25',
  ].join(',')
  return '\uFEFF' + [headers, example1, example2].join('\n')
}

/** 브라우저에서 CSV 파일 다운로드 트리거 */
export function downloadPayslipCsvTemplate(): void {
  const csv  = generatePayslipCsvTemplate()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = '급여_업로드_템플릿.csv'
  a.click()
  URL.revokeObjectURL(url)
}

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

        // 필수 헤더 존재 여부 체크
        const missing = REQUIRED_PAYSLIP_HEADERS.filter(h => !fields.includes(h))
        if (missing.length > 0) {
          resolve({
            rows: [],
            headerError: `필수 컬럼 누락: ${missing.map(h => PAYSLIP_HEADER_LABELS[h]).join(', ')}`,
          })
          return
        }

        // 행 데이터 정규화
        const rows: PayslipCsvRow[] = result.data.map(raw => ({
          email:        (raw['email']        ?? '').trim(),
          pay_month:    (raw['pay_month']    ?? '').trim(),
          base_salary:  (raw['base_salary']  ?? '').trim(),
          bonus:        (raw['bonus']        ?? '').trim(),
          allowance:    (raw['allowance']    ?? '').trim(),
          deduction:    (raw['deduction']    ?? '').trim(),
          payment_date: (raw['payment_date'] ?? '').trim(),
        }))

        resolve({ rows, headerError: null })
      },
      error: () => resolve({ rows: [], headerError: 'CSV 파일을 읽을 수 없습니다. UTF-8 인코딩인지 확인해주세요.' }),
    })
  })
}

/* ── 행 검증 ────────────────────────────────────────────────── */
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MONTH_RE    = /^\d{4}-(0[1-9]|1[0-2])$/
const DATE_RE     = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

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
  else if (!MONTH_RE.test(row.pay_month)) addFail(`귀속월 형식 오류: ${row.pay_month} (YYYY-MM 필요)`)

  // 기본급
  if (!row.base_salary) addFail('기본급 필수값')
  else if (isNaN(Number(row.base_salary)) || Number(row.base_salary) < 0)
    addFail(`기본급 숫자 오류: ${row.base_salary}`)

  // 숫자 필드 (선택)
  const numFields: [keyof PayslipCsvRow, string][] = [
    ['bonus',     '상여금'],
    ['allowance', '수당'],
    ['deduction', '공제액'],
  ]
  for (const [key, label] of numFields) {
    const val = row[key]
    if (val && (isNaN(Number(val)) || Number(val) < 0)) {
      addFail(`${label} 숫자 오류: ${val}`)
    }
  }

  // 지급일 (선택)
  if (row.payment_date && !DATE_RE.test(row.payment_date)) {
    addFail(`지급일 형식 오류: ${row.payment_date} (YYYY-MM-DD 필요)`)
  }

  return failures
}

/* ── 파일 내 중복 검사 ─────────────────────────────────────── */
export function checkPayslipInternalDuplicates(rows: PayslipCsvRow[]): {
  duplicates: Map<string, number[]>   // key: "email|pay_month" → 중복 행 번호들
} {
  const seen    = new Map<string, number>()   // key → first row number
  const duplicates = new Map<string, number[]>()

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2   // 헤더 = 1행
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
