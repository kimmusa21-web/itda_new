/* ================================================================
   itda — 급여 표준 CSV 템플릿 정의 (pay_info_v2 전체 컬럼 기반)
================================================================ */

/** CSV 컬럼 메타정보 */
export interface CsvColumnDef {
  key:      string
  label:    string        // 한글 레이블
  required: boolean
  group:    'identity' | 'period' | 'earnings' | 'workhours' | 'deductions' | 'totals'
  note?:    string        // 설명
}

/** 표준 CSV 전체 컬럼 정의 (순서 = CSV 열 순서) */
export const STANDARD_CSV_COLUMNS: CsvColumnDef[] = [
  // ── 식별 ────────────────────────────────────────────
  { key: 'email',           label: '이메일',        required: true,  group: 'identity', note: '직원 매칭 기준 (필수)' },
  { key: 'employee_name',   label: '성명',          required: false, group: 'identity', note: '참고용' },
  { key: 'employee_number', label: '사번',          required: false, group: 'identity', note: '이메일 없을 때 보조 매칭' },
  // ── 급여 기준 ────────────────────────────────────────
  { key: 'pay_month',       label: '귀속월',        required: true,  group: 'period',   note: 'YYYY-MM 형식' },
  { key: 'payment_date',    label: '급여지급일',     required: false, group: 'period',   note: 'YYYY-MM-DD 형식' },
  { key: 'start_date',      label: '정산시작일',     required: false, group: 'period',   note: 'YYYY-MM-DD 형식' },
  { key: 'end_date',        label: '정산종료일',     required: false, group: 'period',   note: 'YYYY-MM-DD 형식' },
  { key: 'work_days',       label: '급여일수',       required: false, group: 'period',   note: '숫자 (일)' },
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
  // ── 근로시간 (분단위) ─────────────────────────────────
  { key: 'Over_time',                    label: '연장근로시간(분)',     required: false, group: 'workhours' },
  { key: 'Holiday_working_hours',        label: '휴일근로시간(분)',     required: false, group: 'workhours' },
  { key: 'night_work_hours',             label: '야간근로시간(분)',     required: false, group: 'workhours' },
  { key: 'Remaining_annual_leave_hours', label: '잔여연차시간(분)',     required: false, group: 'workhours' },
  // ── 공제 항목 ────────────────────────────────────────
  { key: 'national_pension',            label: '국민연금',          required: false, group: 'deductions' },
  { key: 'health_insurance',            label: '건강보험',          required: false, group: 'deductions' },
  { key: 'longterm_care',               label: '장기요양보험료',     required: false, group: 'deductions' },
  { key: 'employment_insurance',        label: '고용보험',          required: false, group: 'deductions' },
  { key: 'income_tax',                  label: '소득세',            required: false, group: 'deductions', note: '환급이면 음수' },
  { key: 'resident_tax',                label: '지방소득세',        required: false, group: 'deductions', note: '환급이면 음수' },
  { key: 'student_loan',                label: '학자금대출',        required: false, group: 'deductions' },
  { key: 'income_tax_refund',           label: '소득세환급',        required: false, group: 'deductions', note: '음수로 입력' },
  { key: 'resident_tax_refund',         label: '지방소득세환급',    required: false, group: 'deductions', note: '음수로 입력' },
  { key: 'health_insurance_adjustment', label: '건강보험료정산',    required: false, group: 'deductions', note: '음수 가능' },
  { key: 'Other_deductions',            label: '기타공제',          required: false, group: 'deductions' },
  // ── 합계 ────────────────────────────────────────────
  { key: 'Total_payment',   label: '지급합계',    required: false, group: 'totals', note: '미입력 시 지급항목 합산' },
  { key: 'Total_deductible',label: '공제합계',    required: false, group: 'totals', note: '미입력 시 공제항목 합산' },
  { key: 'net_pay',         label: '차인지급액',  required: false, group: 'totals', note: '미입력 시 지급합계-공제합계' },
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
    'hong@example.com', '홍길동', 'EMP-001',
    '2026-04', '2026-04-25', '2026-03-16', '2026-04-15', '28',
    '3000000', '300000', '150000', '', '', '200000', '', '', '', '', '',
    '', '', '', '',
    '148500', '116920', '15130', '27440', '52940', '5290', '', '', '', '', '',
    '3650000', '-365720', '3284280',
  ].join(',')

  const example2 = [
    'kim@example.com', '김철수', 'EMP-002',
    '2026-04', '2026-04-25', '2026-03-16', '2026-04-15', '28',
    '2800000', '', '', '', '', '200000', '', '', '', '', '',
    '', '', '', '',
    '135900', '106940', '13830', '25100', '19800', '1980', '', '', '', '', '',
    '3000000', '-302550', '2697450',
  ].join(',')

  return '\uFEFF' + [header, example1, example2].join('\n')
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
