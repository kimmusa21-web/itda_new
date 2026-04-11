export type EarningItem = {
  key: string
  label: string
  amount: number
}

export type DeductionItem = {
  key: string
  label: string
  amount: number
}

export type PayslipDetail = {
  id: string
  accrualMonth: string       // "2026-02"
  paymentDate: string        // "2026-03-15"
  companyName: string
  employee: {
    name: string
    birthDateMasked: string  // "760***-*******"
    employeeNo: string
    department?: string
    position?: string
    joinDate?: string
    quitDate?: string
    employmentType?: string
  }
  workInfo: {
    periodStart: string
    periodEnd: string
    workDays: number
    totalDays: number
    paidLeaveDays?: number
    overtimeHours?: number
    nightHours?: number
    holidayHours?: number
    remainingLeaveHours?: number
  }
  earnings: EarningItem[]
  deductions: DeductionItem[]
  totalEarnings: number
  totalDeductions: number
  netPay: number
  calculationNotes?: string[]
  // 급여 기간 정보
  daysInMonth?: number        // 당월일수 (예: 31)
  payrollPeriodStart?: string // 정산기간 시작 (예: '2026-04-15')
  payrollPeriodEnd?: string   // 정산기간 종료 (예: '2026-05-14')
}

export const mockPayslip: PayslipDetail = {
  id: 'ps-2026-02',
  accrualMonth: '2026-02',
  paymentDate: '2026-03-15',
  companyName: '브이에이성형외과',
  employee: {
    name: '이정민',
    birthDateMasked: '920***-*******',
    employeeNo: 'VA-0012',
    department: '간호팀',
    position: '주임',
    joinDate: '2025-07-14',
    quitDate: undefined,
    employmentType: '정규직',
  },
  workInfo: {
    periodStart: '2026-02-01',
    periodEnd: '2026-02-28',
    workDays: 22,
    totalDays: 28,
    paidLeaveDays: 0,
    overtimeHours: 4.5,
    nightHours: 0,
    holidayHours: 0,
    remainingLeaveHours: 16,
  },
  earnings: [
    { key: 'base_salary',             label: '기본급',           amount: 2824574 },
    { key: 'overtime_pay_fixed',       label: '고정연장근로수당', amount: 500000 },
    { key: 'overtime_pay',             label: '연장근로수당',     amount: 0 },
    { key: 'holiday_pay',              label: '휴일근로수당',     amount: 0 },
    { key: 'night_pay',                label: '야간근로수당',     amount: 0 },
    { key: 'meal_allowance',           label: '식대',             amount: 200000 },
    { key: 'annual_leave_allowance',   label: '잔여연차수당',     amount: 0 },
    { key: 'other_allowance_1',        label: '기타수당1',        amount: 5375426 },
    { key: 'other_allowance_2',        label: '기타수당2',        amount: 0 },
    { key: 'holiday_bonus',            label: '명절상여',         amount: 100000 },
    { key: 'incentive',                label: '인센티브',         amount: 0 },
  ],
  deductions: [
    { key: 'national_pension',              label: '국민연금',          amount: 139500 },
    { key: 'health_insurance',              label: '건강보험',          amount: 115020 },
    { key: 'long_term_care',               label: '장기요양보험',       amount: 14870 },
    { key: 'employment_insurance',          label: '고용보험',          amount: 27000 },
    { key: 'income_tax',                    label: '소득세',            amount: 376480 },
    { key: 'local_income_tax',              label: '지방소득세',        amount: 37640 },
    { key: 'health_insurance_adjustment',   label: '건강보험료정산',    amount: 0 },
    { key: 'income_tax_refund',             label: '소득세환급',        amount: -51635 },
    { key: 'local_income_tax_refund',       label: '지방소득세환급',    amount: -5160 },
    { key: 'student_loan',                  label: '학자금대출',        amount: 0 },
    { key: 'other_deduction',               label: '기타공제',          amount: 0 },
  ],
  totalEarnings: 9000000,
  totalDeductions: 653715,
  netPay: 8346285,
  calculationNotes: [
    '월급제: 기본급 + 고정수당으로 산정됩니다.',
    '고정연장근로수당: 매월 정액으로 지급됩니다.',
    '국민연금: 기준소득월액 × 4.5% (2026년 기준)',
    '건강보험: 기준소득월액 × 3.545% (2026년 기준)',
    '장기요양보험: 건강보험료 × 12.95%',
    '고용보험: 과세급여 × 0.9%',
    '소득세: 간이세액표 기준 (부양가족 수 반영)',
    '지방소득세: 소득세 × 10%',
    '소득세·지방소득세 환급: 연말정산 결과 반영',
  ],
}

export const mockPayslipList: PayslipDetail[] = [
  mockPayslip,
  { ...mockPayslip, id: 'ps-2026-01', accrualMonth: '2026-01', paymentDate: '2026-02-15', netPay: 8500000, totalEarnings: 9180000, totalDeductions: 680000 },
  { ...mockPayslip, id: 'ps-2025-12', accrualMonth: '2025-12', paymentDate: '2026-01-15', netPay: 8250000, totalEarnings: 8940000, totalDeductions: 690000 },
]
