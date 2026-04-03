export type MappingGroup = 'meta' | 'earnings' | 'deductions'

export interface ColumnMapping {
  csvColumn: string   // CSV 헤더명
  dbKey: string       // 내부 DB 키
  label: string       // 한글 레이블
  group: MappingGroup
  required: boolean
}

/** 공통 표준 컬럼 매핑 (모든 회사 동일) */
export const standardColumnMappings: ColumnMapping[] = [
  // meta
  { csvColumn: 'email',          dbKey: 'email',          label: '이메일',       group: 'meta', required: true  },
  { csvColumn: 'accrual_month',  dbKey: 'accrual_month',  label: '귀속월',       group: 'meta', required: true  },
  { csvColumn: 'payment_date',   dbKey: 'payment_date',   label: '지급일',       group: 'meta', required: true  },
  { csvColumn: 'Start_date',     dbKey: 'Start_date',     label: '기산시작일',   group: 'meta', required: false },
  { csvColumn: 'End_date',       dbKey: 'End_date',       label: '정산종료일',   group: 'meta', required: false },
  { csvColumn: 'working_days',   dbKey: 'working_days',   label: '근무일수',     group: 'meta', required: false },
  { csvColumn: 'Overtime',       dbKey: 'Overtime',       label: '연장근로시간', group: 'meta', required: false },
  // earnings
  { csvColumn: 'base_salary',           dbKey: 'base_salary',           label: '기본급',           group: 'earnings', required: true  },
  { csvColumn: 'overtime_pay_fixed',    dbKey: 'overtime_pay_fixed',    label: '고정연장근로수당', group: 'earnings', required: false },
  { csvColumn: 'overtime_pay',          dbKey: 'overtime_pay',          label: '연장근로수당',     group: 'earnings', required: false },
  { csvColumn: 'meal_allowance',        dbKey: 'meal_allowance',        label: '식대',             group: 'earnings', required: false },
  { csvColumn: 'Other_allowances',      dbKey: 'Other_allowances',      label: '기타수당1',        group: 'earnings', required: false },
  { csvColumn: 'Other_allowances2',     dbKey: 'Other_allowances2',     label: '기타수당2',        group: 'earnings', required: false },
  { csvColumn: 'Holiday_bonus',         dbKey: 'Holiday_bonus',         label: '명절상여',         group: 'earnings', required: false },
  { csvColumn: 'incentive',             dbKey: 'incentive',             label: '인센티브',         group: 'earnings', required: false },
  { csvColumn: 'Total_payment',         dbKey: 'Total_payment',         label: '지급합계',         group: 'earnings', required: false },
  // deductions
  { csvColumn: 'national_pension',      dbKey: 'national_pension',      label: '국민연금',         group: 'deductions', required: false },
  { csvColumn: 'health_insurance',      dbKey: 'health_insurance',      label: '건강보험',         group: 'deductions', required: false },
  { csvColumn: 'longterm_care',         dbKey: 'longterm_care',         label: '장기요양보험료',   group: 'deductions', required: false },
  { csvColumn: 'employment_insurance',  dbKey: 'employment_insurance',  label: '고용보험',         group: 'deductions', required: false },
  { csvColumn: 'income_tax',            dbKey: 'income_tax',            label: '소득세',           group: 'deductions', required: false },
  { csvColumn: 'resident_tax',          dbKey: 'resident_tax',          label: '주민세',           group: 'deductions', required: false },
  { csvColumn: 'income_tax_refund',     dbKey: 'income_tax_refund',     label: '소득세환급',       group: 'deductions', required: false },
  { csvColumn: 'Total_deductible',      dbKey: 'Total_deductible',      label: '공제합계',         group: 'deductions', required: false },
  { csvColumn: 'net_pay',               dbKey: 'net_pay',               label: '최종실수령액',     group: 'deductions', required: true  },
]
