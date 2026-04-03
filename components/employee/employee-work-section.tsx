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

        <div className="hidden sm:block" />  {/* spacer */}

      </div>
    </FormSection>
  )
}
