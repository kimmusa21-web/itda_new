/* ================================================================
   itda — 급여대장 자동 인식 파서 (한국어 컬럼명 → pay_info_v2 키 매핑)

   지원 형식:
     A) 표준 CSV — email + pay_month 헤더 존재
     B) 한국어 급여대장 — 성명/사번/귀속월 등 한국어 헤더
     C) 미인식 — 최소 조건 불충족

   매핑 전략:
     1. 헤더 행 탐지 (다층 헤더는 마지막 유효 행 사용)
     2. 한국어 → 영어 키 매핑 (KOREAN_COLUMN_MAP)
     3. 직원 매칭: email → employee_number → name 순
================================================================ */

import Papa from 'papaparse'
import type { PayslipCsvRow } from '@/types/payslip-csv-upload'

/* ── 포맷 판별 결과 ──────────────────────────────────────── */
export type CsvFormat = 'standard' | 'korean' | 'unknown'

export interface FormatDetectResult {
  format:  CsvFormat
  headers: string[]       // 감지된 헤더 행
  reason:  string         // 진단 메시지
}

/* ── 한국어 컬럼명 → pay_info_v2 키 매핑 ────────────────── */
const KOREAN_COLUMN_MAP: Record<string, string> = {
  // 식별
  '이메일':        'email',
  '메일':          'email',
  'email':         'email',
  'EMAIL':         'email',
  '성명':          'employee_name',
  '이름':          'employee_name',
  '직원명':        'employee_name',
  '사번':          'employee_number',
  '직원번호':      'employee_number',
  '사원번호':      'employee_number',
  // 급여 기준
  '귀속월':        'pay_month',
  '급여월':        'pay_month',
  '지급월':        'pay_month',
  '급여귀속월':    'pay_month',
  '지급일':        'payment_date',
  '급여지급일':    'payment_date',
  '급여일':        'payment_date',
  '정산시작일':    'start_date',
  '시작일':        'start_date',
  '정산종료일':    'end_date',
  '종료일':        'end_date',
  '급여일수':      'work_days',
  '근무일수':      'work_days',
  '부서':          'department',
  '직급':          'position',
  '직위':          'position',
  // 지급 항목
  '기본급':              'base_salary',
  '기본급여':            'base_salary',
  '고정연장수당':        'overtime_pay_fixed',
  '정연장수당':          'overtime_pay_fixed',
  '고정OT':             'overtime_pay_fixed',
  '연장근로수당':        'overtime_pay',
  '연장수당':            'overtime_pay',
  'OT수당':             'overtime_pay',
  '시간외수당':          'overtime_pay',
  '휴일근로수당':        'holidaytime_pay',
  '휴일수당':            'holidaytime_pay',
  '야간근로수당':        'nighttime_pay',
  '야간수당':            'nighttime_pay',
  '식대':               'meal_allowance',
  '식비':               'meal_allowance',
  '식사대':              'meal_allowance',
  '인센티브':            'incentive',
  '성과급':              'incentive',
  '인센':               'incentive',
  '연차수당':            'annual_leave_allowance',
  '연차미사용수당':       'annual_leave_allowance',
  '잔여연차수당':         'annual_leave_allowance',
  '기타수당1':            'Other_allowances',
  '기타수당':             'Other_allowances',
  '기타수당2':            'Other_allowances2',
  '명절상여':             'Holiday_bonus',
  '상여금':              'Holiday_bonus',
  '지급합계':            'Total_payment',
  '총지급액':            'Total_payment',
  '급여합계':            'Total_payment',
  // 근로시간
  '연장근로시간':         'Over_time',
  '연장근로시간(분)':     'Over_time',
  'OT시간':             'Over_time',
  '휴일근로시간':         'Holiday_working_hours',
  '휴일근로시간(분)':     'Holiday_working_hours',
  '야간근로시간':         'night_work_hours',
  '야간근로시간(분)':     'night_work_hours',
  '잔여연차시간':         'Remaining_annual_leave_hours',
  '잔여연차시간(분)':     'Remaining_annual_leave_hours',
  '잔여연차':            'Remaining_annual_leave_hours',
  // 공제 항목
  '국민연금':            'national_pension',
  '건강보험':            'health_insurance',
  '건강보험료':           'health_insurance',
  '장기요양보험':         'longterm_care',
  '장기요양보험료':       'longterm_care',
  '장기요양':            'longterm_care',
  '고용보험':            'employment_insurance',
  '소득세':              'income_tax',
  '주민세':              'resident_tax',
  '지방소득세':           'resident_tax',
  '학자금대출':           'student_loan',
  '학자금':              'student_loan',
  '소득세환급':           'income_tax_refund',
  '지방소득세환급':       'resident_tax_refund',
  '주민세환급':           'resident_tax_refund',
  '건강보험정산':         'health_insurance_adjustment',
  '건강보험료정산':       'health_insurance_adjustment',
  '기타공제1':            'Other_deductions',
  '기타공제':             'Other_deductions',
  '공제합계':            'Total_deductible',
  '총공제액':            'Total_deductible',
  '차인지급액':           'net_pay',
  '실지급액':            'net_pay',
  '실수령액':            'net_pay',
  '실수령금액':           'net_pay',
}

/* ── 표준 CSV 판별 기준 ──────────────────────────────────── */
const STANDARD_REQUIRED_HEADERS = ['email', 'pay_month']
const KOREAN_REQUIRED_HEADERS   = ['귀속월', '급여월', '지급월', '급여귀속월']
const KOREAN_IDENTITY_HEADERS   = ['성명', '이름', '직원명', '사번', '사원번호', '직원번호']

/* ── 포맷 감지 ───────────────────────────────────────────── */
export function detectCsvFormat(headers: string[]): FormatDetectResult {
  const normalized = headers.map(h => h.trim())

  // 표준 CSV
  const hasStdHeaders = STANDARD_REQUIRED_HEADERS.every(h => normalized.includes(h))
  if (hasStdHeaders) {
    return { format: 'standard', headers: normalized, reason: '표준 CSV 형식 (email + pay_month 헤더 감지)' }
  }

  // 한국어 급여대장
  const hasKoreanMonth    = KOREAN_REQUIRED_HEADERS.some(h => normalized.includes(h))
  const hasKoreanIdentity = KOREAN_IDENTITY_HEADERS.some(h => normalized.includes(h))
  if (hasKoreanMonth && hasKoreanIdentity) {
    return { format: 'korean', headers: normalized, reason: '한국어 급여대장 형식 감지 (귀속월 + 성명/사번 헤더)' }
  }

  return {
    format:  'unknown',
    headers: normalized,
    reason:  `미인식 형식 — 표준(email+pay_month) 또는 한국어(귀속월+성명/사번) 헤더가 필요합니다.\n감지된 헤더: ${normalized.slice(0, 8).join(', ')}`,
  }
}

/* ── 다층 헤더 평탄화 ────────────────────────────────────── */
/**
 * 일부 급여대장은 헤더가 2행 이상임 (병합 셀 해제 등).
 * 첫 10행 중 한국어 헤더 패턴 또는 표준 헤더 패턴이 가장 많이 포함된 행을 선택.
 */
export function findHeaderRow(rows: Record<string, string>[], maxScan = 10): number {
  const scanRows = rows.slice(0, maxScan)

  let bestRow = 0
  let bestScore = -1

  for (let i = 0; i < scanRows.length; i++) {
    const values = Object.values(scanRows[i]).map(v => (v ?? '').trim())
    const score =
      values.filter(v =>
        Object.keys(KOREAN_COLUMN_MAP).includes(v) ||
        STANDARD_REQUIRED_HEADERS.includes(v)
      ).length
    if (score > bestScore) {
      bestScore = score
      bestRow = i
    }
  }
  return bestRow
}

/* ── 한국어 행 → PayslipCsvRow 변환 ─────────────────────── */
export function mapKoreanRowToStandard(
  row: Record<string, string>,
  originalHeaders: string[],
): Partial<PayslipCsvRow> & { _unmapped: string[] } {
  const mapped: Record<string, string> = {}
  const unmapped: string[] = []

  for (const header of originalHeaders) {
    const trimmed = header.trim()
    const destKey = KOREAN_COLUMN_MAP[trimmed]
    const value   = (row[header] ?? '').trim()

    if (!value || value === '-') continue   // 빈값 skip

    if (destKey) {
      // 이미 같은 키로 매핑된 값이 있으면 첫 번째 우선
      if (!mapped[destKey]) {
        mapped[destKey] = value
      }
    } else if (trimmed && !['#', 'No', 'no', '순번', '번호'].includes(trimmed)) {
      unmapped.push(trimmed)
    }
  }

  return { ...mapped, _unmapped: unmapped } as Partial<PayslipCsvRow> & { _unmapped: string[] }
}

/* ── 귀속월 포맷 정규화 ────────────────────────────────────
   한국어 급여대장은 "2026년 04월", "2026.04", "202604" 등 다양
──────────────────────────────────────────────────────────── */
export function normalizePayMonth(raw: string): string {
  if (!raw) return ''
  const trimmed = raw.trim()

  // 이미 YYYY-MM-DD → 01로 고정
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed.slice(0, 7) + '-01'

  // 이미 YYYY-MM → YYYY-MM-01
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`

  // 2026년 04월 → 2026-04-01
  const kr = trimmed.match(/(\d{4})년\s*(\d{1,2})월/)
  if (kr) return `${kr[1]}-${kr[2].padStart(2, '0')}-01`

  // 2026.04 또는 2026/04 → 2026-04-01
  const dot = trimmed.match(/(\d{4})[./](\d{1,2})/)
  if (dot) return `${dot[1]}-${dot[2].padStart(2, '0')}-01`

  // 202604 → 2026-04-01
  const compact = trimmed.match(/^(\d{4})(\d{2})$/)
  if (compact) return `${compact[1]}-${compact[2]}-01`

  return trimmed
}

/* ── 날짜 포맷 정규화 ──────────────────────────────────────
   "2026.04.25", "2026년 4월 25일", "20260425" → "2026-04-25"
──────────────────────────────────────────────────────────── */
export function normalizeDate(raw: string): string {
  if (!raw) return ''
  const trimmed = raw.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  // 2026년 4월 25일
  const kr = trimmed.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
  if (kr) return `${kr[1]}-${kr[2].padStart(2,'0')}-${kr[3].padStart(2,'0')}`

  // 2026.04.25 or 2026/04/25
  const dot = trimmed.match(/(\d{4})[./](\d{1,2})[./](\d{1,2})/)
  if (dot) return `${dot[1]}-${dot[2].padStart(2,'0')}-${dot[3].padStart(2,'0')}`

  // 20260425
  const compact = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`

  return trimmed
}

/* ── 숫자 문자열 정규화 ────────────────────────────────────
   "3,000,000", "3000000원", "-1,562,760" → 순수 숫자 문자열
──────────────────────────────────────────────────────────── */
export function normalizeNumber(raw: string): string {
  if (!raw) return ''
  const cleaned = raw.trim().replace(/[,원\s₩]/g, '')
  if (cleaned === '' || cleaned === '-') return ''
  return cleaned
}

/* ── 전체 파일 자동 파싱 ─────────────────────────────────── */
export interface AutoDetectResult {
  format:   CsvFormat
  reason:   string
  rows:     PayslipCsvRow[]
  unmappedHeaders: string[]   // 매핑 안 된 헤더들
  headerError: string | null
}

export async function autoDetectAndParseCsv(file: File): Promise<AutoDetectResult> {
  return new Promise(resolve => {
    Papa.parse<Record<string, string>>(file, {
      header:         true,
      skipEmptyLines: true,
      encoding:       'UTF-8',
      complete: result => {
        const rawHeaders = result.meta.fields ?? []
        const detected   = detectCsvFormat(rawHeaders)

        if (detected.format === 'unknown') {
          resolve({
            format: 'unknown',
            reason: detected.reason,
            rows:   [],
            unmappedHeaders: [],
            headerError: detected.reason,
          })
          return
        }

        if (detected.format === 'standard') {
          // 표준 CSV — 직접 매핑
          const rows: PayslipCsvRow[] = result.data.map(raw =>
            Object.fromEntries(
              rawHeaders.map(h => [h.trim(), (raw[h] ?? '').trim()])
            ) as unknown as PayslipCsvRow
          )
          resolve({ format: 'standard', reason: detected.reason, rows, unmappedHeaders: [], headerError: null })
          return
        }

        // 한국어 급여대장 — 컬럼 매핑
        const allUnmapped = new Set<string>()
        const rows: PayslipCsvRow[] = result.data.map(raw => {
          const { _unmapped, ...mapped } = mapKoreanRowToStandard(raw, rawHeaders)
          _unmapped.forEach(u => allUnmapped.add(u))

          // 날짜/월 정규화
          const payMonth    = normalizePayMonth((mapped as Record<string,string>).pay_month ?? '')
          const paymentDate = normalizeDate((mapped as Record<string,string>).payment_date ?? '')
          const startDate   = normalizeDate((mapped as Record<string,string>).start_date ?? '')
          const endDate     = normalizeDate((mapped as Record<string,string>).end_date ?? '')

          // 숫자 필드 정규화
          const numFields = [
            'base_salary', 'overtime_pay_fixed', 'overtime_pay', 'holidaytime_pay',
            'nighttime_pay', 'meal_allowance', 'incentive', 'annual_leave_allowance',
            'Other_allowances', 'Other_allowances2', 'Holiday_bonus',
            'Over_time', 'Holiday_working_hours', 'night_work_hours', 'Remaining_annual_leave_hours',
            'national_pension', 'health_insurance', 'longterm_care', 'employment_insurance',
            'income_tax', 'resident_tax', 'student_loan',
            'income_tax_refund', 'resident_tax_refund', 'health_insurance_adjustment',
            'Other_deductions', 'Total_payment', 'Total_deductible', 'net_pay', 'work_days',
          ]

          const result: Record<string, string> = { ...mapped }
          for (const f of numFields) {
            if (result[f]) result[f] = normalizeNumber(result[f])
          }

          return {
            ...result,
            pay_month:    payMonth,
            payment_date: paymentDate,
            start_date:   startDate,
            end_date:     endDate,
          } as PayslipCsvRow
        }).filter(r => r.pay_month || r.employee_name || r.email)   // 완전 빈 행 제거

        resolve({
          format:          'korean',
          reason:          detected.reason,
          rows,
          unmappedHeaders: [...allUnmapped],
          headerError:     null,
        })
      },
      error: () => resolve({
        format: 'unknown', reason: 'CSV 파일을 읽을 수 없습니다.', rows: [], unmappedHeaders: [], headerError: 'CSV 파일을 읽을 수 없습니다.',
      }),
    })
  })
}

/** 매핑 결과 요약 (사용자에게 보여줄 정보) */
export function buildMappingSummary(
  koreanHeaders: string[],
): { mapped: { from: string; to: string; label: string }[]; unmapped: string[] } {
  const mapped: { from: string; to: string; label: string }[] = []
  const unmapped: string[] = []

  for (const h of koreanHeaders) {
    const dest = KOREAN_COLUMN_MAP[h.trim()]
    if (dest) {
      // label lookup는 lazy import 방지를 위해 간단히 처리
      mapped.push({ from: h.trim(), to: dest, label: dest })
    } else if (h.trim() && !['#', 'No', 'no', '순번', '번호'].includes(h.trim())) {
      unmapped.push(h.trim())
    }
  }

  return { mapped, unmapped }
}
