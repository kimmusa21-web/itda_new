'use client'

import { CalendarDays } from 'lucide-react'
import type { EmployeeCreateInput } from './employee-form'
import type { FormErrors } from '@/lib/validation'
import { FormSection, Field, inp } from './employee-basic-section'

interface Props {
  form: EmployeeCreateInput
  errors: FormErrors<EmployeeCreateInput>
  onChange: <K extends keyof EmployeeCreateInput>(key: K, value: EmployeeCreateInput[K]) => void
}

export function EmployeeWorkSection({ form, errors, onChange }: Props) {
  const today = new Date().toISOString().slice(0, 10)

  return (
    <FormSection icon={<CalendarDays size={15} className="text-blue-500" />} title="근무 정보">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <Field label="입사일" required error={errors.joinDate}>
          <input
            type="date"
            className={inp(errors.joinDate)}
            max={today}
            value={form.joinDate}
            onChange={e => onChange('joinDate', e.target.value)}
          />
        </Field>

        {/* 계약직 여부 */}
        <Field label="고용 형태">
          <div className="flex items-center gap-3 h-[42px]">
            <button
              type="button"
              role="switch"
              aria-checked={form.isContract}
              onClick={() => {
                onChange('isContract', !form.isContract)
                if (form.isContract) onChange('contractEndDate', '')
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                form.isContract ? 'bg-blue-500' : 'bg-slate-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.isContract ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <span className="text-sm text-slate-700">
              {form.isContract ? '계약직' : '정규직'}
            </span>
          </div>
        </Field>

        {/* 계약만료일 — 계약직일 때만 표시 */}
        {form.isContract && (
          <Field label="계약만료일">
            <input
              type="date"
              className={inp(undefined)}
              value={form.contractEndDate}
              onChange={e => onChange('contractEndDate', e.target.value)}
            />
          </Field>
        )}

      </div>
    </FormSection>
  )
}
