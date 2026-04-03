/* ================================================================
   itda — CSV 업로드 유틸리티 (MVP, pay_info_v2 JSON 구조)
================================================================ */

import type { CsvRow, ParsedRow, ColumnMapping } from '@/types'
import { parseCurrency, isValidDate, isValidMonth } from '@/lib/utils'

/** 표준 컬럼 매핑 (모든 회사 공통) */
export const STANDARD_MAPPINGS: ColumnMapping[] = [
  { csvColumn: 'email',                     dbKey: 'email',          label: '이메일 (매칭키)',   group: 'meta',       required: true  },
  { csvColumn: 'accrual_month',             dbKey: 'accrual_month',  label: '귀속월 (YYYY-MM)', group: 'meta',       required: true  },
  { csvColumn: 'payment_date',              dbKey: 'payment_date',   label: '지급일',           group: 'meta',       required: true  },
  { csvColumn: 'work_days',                 dbKey: 'work_days',      label: '근무일수',         group: 'meta',       required: false },
  { csvColumn: 'overtime_hours',            dbKey: 'overtime_hours', label: '연장근로시간',     group: 'meta',       required: false },
  { csvColumn: 'base_salary',               dbKey: 'base_salary',           label: '기본급',           group: 'earnings',   required: true  },
  { csvColumn: 'overtime_pay_fixed',        dbKey: 'overtime_pay_fixed',    label: '고정연장근로수당', group: 'earnings',   required: false },
  { csvColumn: 'overtime_pay',              dbKey: 'overtime_pay',          label: '연장근로수당',     group: 'earnings',   required: false },
  { csvColumn: 'holidaytime_pay',           dbKey: 'holidaytime_pay',       label: '휴일근로수당',     group: 'earnings',   required: false },
  { csvColumn: 'nighttime_pay',             dbKey: 'nighttime_pay',         label: '야간근로수당',     group: 'earnings',   required: false },
  { csvColumn: 'meal_allowance',            dbKey: 'meal_allowance',        label: '식대',             group: 'earnings',   required: false },
  { csvColumn: 'incentive',                 dbKey: 'incentive',             label: '인센티브',         group: 'earnings',   required: false },
  { csvColumn: 'Other_allowances',          dbKey: 'Other_allowances',      label: '기타수당1',        group: 'earnings',   required: false },
  { csvColumn: 'Other_allowances2',         dbKey: 'Other_allowances2',     label: '기타수당2',        group: 'earnings',   required: false },
  { csvColumn: 'Holiday_bonus',             dbKey: 'Holiday_bonus',         label: '명절상여',         group: 'earnings',   required: false },
  { csvColumn: 'national_pension',          dbKey: 'national_pension',      label: '국민연금',         group: 'deductions', required: false },
  { csvColumn: 'health_insurance',          dbKey: 'health_insurance',      label: '건강보험',         group: 'deductions', required: false },
  { csvColumn: 'longterm_care',             dbKey: 'longterm_care',         label: '장기요양보험료',   group: 'deductions', required: false },
  { csvColumn: 'employment_insurance',      dbKey: 'employment_insurance',  label: '고용보험',         group: 'deductions', required: false },
  { csvColumn: 'income_tax',                dbKey: 'income_tax',            label: '소득세',           group: 'deductions', required: false },
  { csvColumn: 'resident_tax',              dbKey: 'resident_tax',          label: '지방소득세',       group: 'deductions', required: false },
  { csvColumn: 'income_tax_refund',         dbKey: 'income_tax_refund',     label: '소득세환급',       group: 'deductions', required: false },
  { csvColumn: 'Total_payment',             dbKey: 'Total_payment',         label: '지급합계',         group: 'meta',       required: false },
  { csvColumn: 'Total_deductible',          dbKey: 'Total_deductible',      label: '공제합계',         group: 'meta',       required: false },
  { csvColumn: 'net_pay',                   dbKey: 'net_pay',               label: '최종실수령액',     group: 'meta',       required: true  },
]

interface Employee { id: number; email: string; companyId: number }

/** CSV 행 검증 + JSON 구조로 변환 */
export function parseAndValidateRows(
  rows: CsvRow[],
  companyId: number,
  allEmployees: Employee[],
): ParsedRow[] {
  const allEmails   = new Set(allEmployees.map(e => e.email.toLowerCase()))
  const compEmails  = new Map(
    allEmployees.filter(e => e.companyId === companyId).map(e => [e.email.toLowerCase(), e])
  )

  const earningsKeys   = STANDARD_MAPPINGS.filter(m => m.group === 'earnings').map(m => m.dbKey)
  const deductionsKeys = STANDARD_MAPPINGS.filter(m => m.group === 'deductions').map(m => m.dbKey)

  return rows.map((row, i) => {
    const rIdx = i + 2
    const email = (row['email'] ?? '').trim().toLowerCase()

    // 이메일 없음
    if (!email) {
      return { rowIndex: rIdx, email: '', employeeName: '—', accrualMonth: '', paymentDate: '',
        earnings: {}, deductions: {}, totalEarnings: 0, totalDeductions: 0, netPay: 0,
        status: 'error', errorReason: '이메일 값이 비어 있습니다' }
    }
    // 시스템에 없는 직원 → 업로드 중단
    if (!allEmails.has(email)) {
      return { rowIndex: rIdx, email, employeeName: '—', accrualMonth: '', paymentDate: '',
        earnings: {}, deductions: {}, totalEarnings: 0, totalDeductions: 0, netPay: 0,
        status: 'error', errorReason: '시스템에 등록되지 않은 직원 이메일입니다' }
    }
    // 다른 회사 직원 → 무시
    if (!compEmails.has(email)) {
      return { rowIndex: rIdx, email, employeeName: '—', accrualMonth: '', paymentDate: '',
        earnings: {}, deductions: {}, totalEarnings: 0, totalDeductions: 0, netPay: 0,
        status: 'ignored', errorReason: '선택한 회사 소속이 아닌 직원입니다 (무시)' }
    }

    const emp = compEmails.get(email)!
    const accrualMonth = (row['accrual_month'] ?? '').trim()
    const paymentDate  = (row['payment_date']  ?? '').trim()

    // 귀속월 형식
    if (accrualMonth && !isValidMonth(accrualMonth)) {
      return { rowIndex: rIdx, email, employeeName: '—', accrualMonth, paymentDate: '',
        earnings: {}, deductions: {}, totalEarnings: 0, totalDeductions: 0, netPay: 0,
        status: 'error', errorReason: `귀속월 형식 오류: "${accrualMonth}"` }
    }
    // 지급일 형식
    if (paymentDate && !isValidDate(paymentDate)) {
      return { rowIndex: rIdx, email, employeeName: '—', accrualMonth, paymentDate,
        earnings: {}, deductions: {}, totalEarnings: 0, totalDeductions: 0, netPay: 0,
        status: 'error', errorReason: `지급일 형식 오류: "${paymentDate}"` }
    }

    // earnings / deductions JSON 빌드
    const earnings: Record<string, number> = {}
    const deductions: Record<string, number> = {}

    earningsKeys.forEach(key => {
      const v = parseCurrency(row[key] ?? '')
      if (v !== 0) earnings[key] = v
    })
    deductionsKeys.forEach(key => {
      const v = parseCurrency(row[key] ?? '')
      if (v !== 0) deductions[key] = v
    })

    const totalEarnings   = parseCurrency(row['Total_payment']  ?? '') || Object.values(earnings).reduce((s,v)=>s+v,0)
    const totalDeductions = parseCurrency(row['Total_deductible']?? '') || Object.values(deductions).reduce((s,v)=>s+v,0)
    const netPay          = parseCurrency(row['net_pay']         ?? '') || totalEarnings - totalDeductions

    return {
      rowIndex: rIdx, email,
      employeeName: '',  // employee name 조회는 UI 레이어에서
      accrualMonth, paymentDate,
      earnings, deductions, totalEarnings, totalDeductions, netPay,
      status: 'valid',
    }
  })
}

/** 검증 결과 요약 */
export function summarize(rows: ParsedRow[]) {
  const valid   = rows.filter(r => r.status === 'valid').length
  const errors  = rows.filter(r => r.status === 'error')
  const ignored = rows.filter(r => r.status === 'ignored').length
  return {
    totalRows:   rows.length,
    validRows:   valid,
    ignoredRows: ignored,
    errorRows:   errors.length,
    canUpload:   errors.length === 0,
    errors,
  }
}
