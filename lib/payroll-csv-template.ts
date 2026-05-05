/* ================================================================
   itda — 급여 표준 CSV 템플릿 정의 (pay_info_v2 전체 컬럼 기반)
================================================================ */

/** CSV 컬럼 메타정보 */
export interface CsvColumnDef {
  key:      string
  label:    string        // 한글 레이블
  required: boolean
  group:    'identity' | 'period' | 'workhours' | 'earnings' | 'deductions' | 'totals'
  note?:    string        // 설명
}

/** 표준 CSV 전체 컬럼 정의 (순서 = CSV 열 순서) */
export const STANDARD_CSV_COLUMNS: CsvColumnDef[] = [
  // ── 식별 ────────────────────────────────────────────
  { key: 'employee_number', label: '사번',       required: true,  group: 'identity', note: '직원 매칭 기준 (필수)' },
  { key: 'employee_name',   label: '성명',       required: false, group: 'identity', note: '참고용 (사번 없을 때 단독 이름 매칭)' },
  { key: 'email',           label: '이메일',     required: false, group: 'identity', note: '선택 (레거시)' },
  // ── 급여 기준 ────────────────────────────────────────
  { key: 'payment_date',   label: '급여지급일',   required: false, group: 'period',   note: 'YYYY-MM-DD 형식' },
  { key: 'accrual_month',  label: '귀속월',       required: true,  group: 'period',   note: 'YYYY-MM-DD 형식 (예: 2026-04-01)' },
  { key: 'Start_date',     label: '정산시작일',   required: false, group: 'period',   note: 'YYYY-MM-DD 형식' },
  { key: 'End_date',       label: '정산종료일',   required: false, group: 'period',   note: 'YYYY-MM-DD 형식' },
  { key: 'working_days',   label: '근무일수',     required: false, group: 'period',   note: '숫자 (일)' },
  // ── 근로시간 (분단위) ─────────────────────────────────
  { key: 'basic_work_time',              label: '기본근로시간(h)',    required: false, group: 'workhours', note: '미입력 시 근무일수 기반 자동 계산' },
  { key: 'Overtime',                     label: '연장근로시간(분)',   required: false, group: 'workhours' },
  { key: 'Holiday_working_hours',        label: '휴일근로시간(분)',   required: false, group: 'workhours' },
  { key: 'night_work_hours',             label: '야간근로시간(분)',   required: false, group: 'workhours' },
  { key: 'Remaining_annual_leave_hours', label: '잔여연차시간(분)',   required: false, group: 'workhours' },
  // ── 지급 항목 ────────────────────────────────────────
  { key: 'base_salary',             label: '기본급',          required: true,  group: 'earnings' },
  { key: 'overtime_pay_fixed',      label: '고정연장수당',     required: false, group: 'earnings' },
  { key: 'overtime_pay',            label: '연장근로수당',     required: false, group: 'earnings' },
  { key: 'holidaytime_pay',         label: '휴일근로수당',     required: false, group: 'earnings' },
  { key: 'nighttime_pay',           label: '야간근로수당',     required: false, group: 'earnings' },
  { key: 'meal_allowance',          label: '식대',            required: false, group: 'earnings' },
  { key: 'incentive',               label: '인센티브',         required: false, group: 'earnings' },
  { key: 'annual_leave_allowance',  label: '연차수당',         required: false, group: 'earnings' },
  { key: 'Other_allowances',        label: '기타수당1',        required: false, group: 'earnings' },
  { key: 'Other_allowances2',       label: '기타수당2',        required: false, group: 'earnings' },
  { key: 'Holiday_bonus',           label: '명절상여',         required: false, group: 'earnings' },
  // ── 합계 (지급) ──────────────────────────────────────
  { key: 'Total_tax_salary', label: '과세급여합계', required: false, group: 'totals', note: '비과세 항목 제외 과세소득 합계' },
  { key: 'Total_payment',    label: '지급합계',    required: false, group: 'totals', note: '미입력 시 지급항목 합산' },
  // ── 공제 항목 ────────────────────────────────────────
  { key: 'national_pension',            label: '국민연금',          required: false, group: 'deductions' },
  { key: 'health_insurance',            label: '건강보험',          required: false, group: 'deductions' },
  { key: 'employment_insurance',        label: '고용보험',          required: false, group: 'deductions' },
  { key: 'income_tax',                  label: '소득세',            required: false, group: 'deductions', note: '환급이면 음수' },
  { key: 'resident_tax',                label: '지방소득세',        required: false, group: 'deductions', note: '환급이면 음수' },
  { key: 'health_insurance_adjustment', label: '건강보험료정산',    required: false, group: 'deductions', note: '음수 가능' },
  { key: 'longterm_care',               label: '장기요양보험료',    required: false, group: 'deductions' },
  { key: 'student_loan',                label: '학자금대출',        required: false, group: 'deductions' },
  { key: 'income_tax_refund',           label: '소득세환급',        required: false, group: 'deductions', note: '음수로 입력' },
  { key: 'resident_tax_refund',         label: '지방소득세환급',    required: false, group: 'deductions', note: '음수로 입력' },
  { key: 'Other_deductions',            label: '기타공제',          required: false, group: 'deductions' },
  // ── 합계 (공제) + 차인지급액 ──────────────────────────
  { key: 'Total_deductible', label: '공제합계',   required: false, group: 'totals', note: '미입력 시 공제항목 합산' },
  { key: 'net_pay',          label: '차인지급액', required: false, group: 'totals', note: '미입력 시 지급합계-공제합계' },
]

export const STANDARD_CSV_REQUIRED_KEYS = STANDARD_CSV_COLUMNS
  .filter(c => c.required)
  .map(c => c.key)

export const STANDARD_CSV_HEADER_KEYS = STANDARD_CSV_COLUMNS.map(c => c.key)

/** key → 한글 레이블 맵 */
export const STANDARD_CSV_LABEL_MAP: Record<string, string> = Object.fromEntries(
  STANDARD_CSV_COLUMNS.map(c => [c.key, c.label])
)

/* ── 템플릿 CSV 생성 ──────────────────────────────────────── */
export function generateStandardCsvTemplate(): string {
  const header = STANDARD_CSV_HEADER_KEYS.join(',')

  const example1 = [
    'A001', '홍길동', 'hong@example.com',
    '2026-04-25', '2026-04-01', '2026-03-16', '2026-04-15', '28',
    '209', '60', '', '', '8',
    '3000000', '300000', '150000', '', '', '200000', '', '', '', '', '',
    '3450000', '3650000',
    '148500', '116920', '27440', '52940', '5290', '', '15130', '', '', '', '',
    '366220', '3283780',
  ].join(',')

  const example2 = [
    'A002', '김철수', 'kim@example.com',
    '2026-04-25', '2026-04-01', '2026-03-16', '2026-04-15', '28',
    '209', '', '', '', '',
    '2800000', '', '', '', '', '200000', '', '', '', '', '',
    '2800000', '3000000',
    '135900', '106940', '25100', '19800', '1980', '', '13830', '', '', '', '',
    '303550', '2696450',
  ].join(',')

  return '﻿' + [header, example1, example2].join('\n')
}

/** 브라우저에서 CSV 파일 다운로드 */
export function downloadStandardCsvTemplate(): void {
  const csv  = generateStandardCsvTemplate()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = '급여업로드_표준양식.csv'
  a.click()
  URL.revokeObjectURL(url)
}
