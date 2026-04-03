'use client'

import { Banknote } from 'lucide-react'
import type { EmployeeCreateInput } from './employee-form'
import type { FormErrors } from '@/lib/validation'
import { FormSection, Field, inp } from './employee-basic-section'
import { formatSalaryDisplay, parseSalaryInput } from '@/lib/validation'

interface Props {
  form: EmployeeCreateInput
  errors: FormErrors<EmployeeCreateInput>
  onChange: <K extends keyof EmployeeCreateInput>(key: K, value: EmployeeCreateInput[K]) => void
}

const salaryTypeLabel = { annual: '연봉', monthly: '월급' }
const salaryBasisLabel = { gross: '세전', net: '세후' }

export function EmployeeSalarySection({ form, errors, onChange }: Props) {
  return (
    <FormSection icon={<Banknote size={15} className="text-blue-500" />} title="급여 정보">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Salary type */}
        <Field label="급여 유형" required error={errors.salaryType}>
          <div className="flex gap-4 pt-1">
            {(['annual','monthly'] as const).map(v => (
              <label key={v} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="salaryType"
                  checked={form.salaryType === v}
                  onChange={() => onChange('salaryType', v)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-slate-700">{salaryTypeLabel[v]}</span>
              </label>
            ))}
          </div>
        </Field>

        {/* Salary basis */}
        <Field label="기준" required error={errors.salaryBasis}>
          <div className="flex gap-4 pt-1">
            {(['gross','net'] as const).map(v => (
              <label key={v} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="salaryBasis"
                  checked={form.salaryBasis === v}
                  onChange={() => onChange('salaryBasis', v)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-slate-700">{salaryBasisLabel[v]}</span>
              </label>
            ))}
          </div>
        </Field>

        {/* Amount */}
        <Field label={`${salaryTypeLabel[form.salaryType]} 금액`} required
          error={errors.salaryAmount}
          hint={form.salaryAmount ? `${formatSalaryDisplay(form.salaryAmount)}원` : '숫자만 입력하세요'}
        >
          <div className="relative">
            <input
              className={`${inp(errors.salaryAmount)} pr-6`}
              placeholder={form.salaryType === 'annual' ? '40,000,000' : '3,000,000'}
              inputMode="numeric"
              value={form.salaryAmount === '' ? '' : formatSalaryDisplay(form.salaryAmount)}
              onChange={e => onChange('salaryAmount', parseSalaryInput(e.target.value))}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
          </div>
        </Field>

      </div>
    </FormSection>
  )
}
