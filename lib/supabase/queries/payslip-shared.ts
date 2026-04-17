import type { PayslipDetail, EarningItem, DeductionItem } from '@/lib/mock-payslip'
import { parsePayslipNote } from '@/lib/payslip-defaults'
import { getDaysInMonth, getPayrollPeriod } from '@/lib/payslip-utils'

export interface PayInfoRow {
  id: number
  accrual_month: string
  payment_date: string | null
  employee_id: number
  company_id: number
  batch_id: number | null
  Start_date: string | null
  End_date: string | null
  Number_of_days: number | null
  working_days: number | null
  Overtime: number | null
  Holiday_working_hours: number | null
  night_work_hours: number | null
  Remaining_annual_leave_hours: number | null
  base_salary: string | null
  overtime_pay_fixed: string | null
  overtime_pay: string | null
  holidaytime_pay: string | null
  nighttime_pay: string | null
  meal_allowance: string | null
  incentive: string | null
  annual_leave_allowance: string | null
  Other_allowances: string | null
  Other_allowances2: string | null
  Holiday_bonus: string | null
  Total_payment: string | null
  national_pension: string | null
  health_insurance: string | null
  longterm_care: string | null
  employment_insurance: string | null
  income_tax: string | null
  resident_tax: string | null
  student_loan: string | null
  income_tax_refund: string | null
  resident_tax_refund: string | null
  health_insurance_adjustment: string | null
  Total_deductible: string | null
  Other_deductions: string | null
  net_pay: string | null
  employees?: {
    name: string
    email: string
    birthdate: string | null
    employee_number: string | null
    Date_of_joining: string | null
    quit_date: string | null
    department: string | null
    position: string | null
    company_id: number
    companies?: { name: string; payslip_note?: string | null } | null
  } | null
}

function parseAmt(val: string | null | undefined): number {
  if (!val) return 0
  const n = parseInt(val.replace(/[,\s]/g, ''), 10)
  return isNaN(n) ? 0 : n
}

/** DB row → PayslipDetail 변환 */
export function mapRowToPayslip(row: PayInfoRow): PayslipDetail {
  const emp = row.employees

  const earnings: EarningItem[] = [
    { key: 'base_salary',           label: '기본급',           amount: parseAmt(row.base_salary) },
    { key: 'overtime_pay_fixed',    label: '고정연장근로수당', amount: parseAmt(row.overtime_pay_fixed) },
    { key: 'overtime_pay',          label: '연장근로수당',     amount: parseAmt(row.overtime_pay) },
    { key: 'holidaytime_pay',       label: '휴일근로수당',     amount: parseAmt(row.holidaytime_pay) },
    { key: 'nighttime_pay',         label: '야간근로수당',     amount: parseAmt(row.nighttime_pay) },
    { key: 'meal_allowance',        label: '식대',             amount: parseAmt(row.meal_allowance) },
    { key: 'annual_leave_allowance',label: '잔여연차수당',     amount: parseAmt(row.annual_leave_allowance) },
    { key: 'Other_allowances',      label: '기타수당1',        amount: parseAmt(row.Other_allowances) },
    { key: 'Other_allowances2',     label: '기타수당2',        amount: parseAmt(row.Other_allowances2) },
    { key: 'Holiday_bonus',         label: '명절상여',         amount: parseAmt(row.Holiday_bonus) },
    { key: 'incentive',             label: '인센티브',         amount: parseAmt(row.incentive) },
  ]

  const deductions: DeductionItem[] = [
    { key: 'national_pension',             label: '국민연금',        amount: parseAmt(row.national_pension) },
    { key: 'health_insurance',             label: '건강보험',        amount: parseAmt(row.health_insurance) },
    { key: 'longterm_care',                label: '장기요양보험',    amount: parseAmt(row.longterm_care) },
    { key: 'employment_insurance',         label: '고용보험',        amount: parseAmt(row.employment_insurance) },
    { key: 'income_tax',                   label: '소득세',          amount: parseAmt(row.income_tax) },
    { key: 'resident_tax',                 label: '지방소득세',      amount: parseAmt(row.resident_tax) },
    { key: 'health_insurance_adjustment',  label: '건강보험료정산',  amount: parseAmt(row.health_insurance_adjustment) },
    { key: 'income_tax_refund',            label: '소득세환급',      amount: -parseAmt(row.income_tax_refund) },
    { key: 'resident_tax_refund',          label: '지방소득세환급',  amount: -parseAmt(row.resident_tax_refund) },
    { key: 'student_loan',                 label: '학자금대출',      amount: parseAmt(row.student_loan) },
    { key: 'Other_deductions',             label: '기타공제',        amount: parseAmt(row.Other_deductions) },
  ]

  const totalEarnings    = parseAmt(row.Total_payment) || earnings.reduce((s,e)=>s+e.amount,0)
  const totalDeductions  = parseAmt(row.Total_deductible) || deductions.reduce((s,d)=>s+d.amount,0)
  const netPay           = parseAmt(row.net_pay) || (totalEarnings - totalDeductions)

  const birthdate = emp?.birthdate
  const birthMasked = birthdate
    ? `${birthdate.slice(0,2)}****-*******`
    : '***-*****'

  // ── 당월일수 + 정산기간 ──
  const payrollStartDay = ((emp?.companies as any)?.payroll_start_day ?? null) as number | null
  const daysInMonth     = getDaysInMonth(row.accrual_month)
  const { start: payrollPeriodStart, end: payrollPeriodEnd } =
    getPayrollPeriod(row.accrual_month, payrollStartDay)

  return {
    id: `ps-${row.id}`,
    accrualMonth: row.accrual_month,
    paymentDate: row.payment_date ?? '',
    companyName: (emp?.companies as any)?.name ?? '',
    employee: {
      name: emp?.name ?? '',
      birthDateMasked: birthMasked,
      employeeNo: emp?.employee_number ?? `EMP-${String(row.employee_id).padStart(4,'0')}`,
      department: emp?.department ?? undefined,
      position: emp?.position ?? undefined,
      joinDate: emp?.Date_of_joining ?? undefined,
      quitDate: emp?.quit_date ?? undefined,
      employmentType: '정규직',
    },
    workInfo: {
      periodStart: row.Start_date ?? row.accrual_month + '-01',
      periodEnd:   row.End_date   ?? row.accrual_month + '-28',
      workDays:   row.working_days ?? 0,
      totalDays:  row.Number_of_days ?? 0,
      paidLeaveDays: 0,
      overtimeHours: row.Overtime ?? 0,
      nightHours:    row.night_work_hours ?? 0,
      holidayHours:  row.Holiday_working_hours ?? 0,
      remainingLeaveHours: row.Remaining_annual_leave_hours ?? 0,
    },
    earnings,
    deductions,
    totalEarnings,
    totalDeductions: Math.abs(totalDeductions),
    netPay,
    calculationNotes: parsePayslipNote(
      (emp?.companies as any)?.payslip_note ?? null
    ),
    daysInMonth,
    payrollPeriodStart,
    payrollPeriodEnd,
  }
}
