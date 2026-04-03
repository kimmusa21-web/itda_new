'use client'

import { Building2 } from 'lucide-react'
import type { EmployeeCreateInput } from './employee-form'
import type { FormErrors } from '@/lib/validation'
import { FormSection, Field, inp } from './employee-basic-section'

interface Props {
  form: EmployeeCreateInput
  errors: FormErrors<EmployeeCreateInput>
  onChange: <K extends keyof EmployeeCreateInput>(key: K, value: EmployeeCreateInput[K]) => void
}

const DEPARTMENTS = ['', '원무팀','간호팀','원장실','행정팀','마케팅팀','운영팀','CS팀','기획팀']

export function EmployeeOrgSection({ form, errors, onChange }: Props) {
  return (
    <FormSection icon={<Building2 size={15} className="text-blue-500" />} title="조직 정보">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <Field label="부서">
          <div className="relative">
            <input
              className={inp(errors.department)}
              placeholder="예: 간호팀"
              list="dept-list"
              value={form.department}
              onChange={e => onChange('department', e.target.value)}
            />
            <datalist id="dept-list">
              {DEPARTMENTS.filter(Boolean).map(d => <option key={d} value={d} />)}
            </datalist>
          </div>
        </Field>

        <Field label="직위">
          <input
            className={inp(errors.position)}
            placeholder="예: 팀장, 주임, 사원"
            value={form.position}
            onChange={e => onChange('position', e.target.value)}
          />
        </Field>

        <Field label="직무">
          <input
            className={inp(errors.job)}
            placeholder="예: 간호 업무"
            value={form.job}
            onChange={e => onChange('job', e.target.value)}
          />
        </Field>

        <Field label="직급">
          <input
            className={inp(errors.grade)}
            placeholder="예: 3급"
            value={form.grade}
            onChange={e => onChange('grade', e.target.value)}
          />
        </Field>

        <Field label="직책">
          <input
            className={inp(errors.jobTitle)}
            placeholder="예: 팀장"
            value={form.jobTitle}
            onChange={e => onChange('jobTitle', e.target.value)}
          />
        </Field>

        <Field label="근무지">
          <input
            className={inp(errors.workLocation)}
            placeholder="예: 서울 강남 본점"
            value={form.workLocation}
            onChange={e => onChange('workLocation', e.target.value)}
          />
        </Field>

        <Field label="업무 상세" className="sm:col-span-2">
          <textarea
            className={`${inp()} resize-none h-20`}
            placeholder="담당 업무를 간략히 기재해주세요"
            value={form.jobDescription}
            onChange={e => onChange('jobDescription', e.target.value)}
          />
        </Field>

      </div>
    </FormSection>
  )
}
