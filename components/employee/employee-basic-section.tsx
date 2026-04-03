'use client'

import { User } from 'lucide-react'
import type { EmployeeCreateInput } from './employee-form'
import type { FormErrors } from '@/lib/validation'
import { formatPhone } from '@/lib/validation'

interface Props {
  form: EmployeeCreateInput
  errors: FormErrors<EmployeeCreateInput>
  onChange: <K extends keyof EmployeeCreateInput>(key: K, value: EmployeeCreateInput[K]) => void
}

export function EmployeeBasicSection({ form, errors, onChange }: Props) {
  return (
    <FormSection icon={<User size={15} className="text-blue-500" />} title="기본 정보">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <Field label="이름" required error={errors.name}>
          <input
            className={inp(errors.name)}
            placeholder="홍길동"
            value={form.name}
            onChange={e => onChange('name', e.target.value)}
          />
        </Field>

        <Field label="이메일" required error={errors.email}
          hint="로그인 ID로 사용됩니다">
          <input
            type="email"
            className={inp(errors.email)}
            placeholder="hong@company.com"
            value={form.email}
            onChange={e => onChange('email', e.target.value)}
            autoComplete="off"
          />
        </Field>

        <Field label="생년월일 6자리" error={errors.birthdate}
          hint="초기 비밀번호 생성에 사용됩니다 (예: 901225)">
          <input
            className={inp(errors.birthdate)}
            placeholder="901225"
            maxLength={6}
            value={form.birthdate}
            onChange={e => onChange('birthdate', e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </Field>

        <Field label="연락처" error={errors.phone}>
          <input
            className={inp(errors.phone)}
            placeholder="010-1234-5678"
            value={form.phone}
            onChange={e => onChange('phone', formatPhone(e.target.value))}
          />
        </Field>

        <Field label="성별" error={errors.gender}>
          <div className="flex gap-4 pt-1">
            {([['male','남성'],['female','여성']] as const).map(([val, lbl]) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value={val}
                  checked={form.gender === val}
                  onChange={() => onChange('gender', val)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-slate-700">{lbl}</span>
              </label>
            ))}
          </div>
        </Field>

      </div>
    </FormSection>
  )
}

/* ── 공용 헬퍼 ────────────────────────────────────────── */
export function FormSection({
  icon, title, children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
        {icon}
        <h2 className="text-sm font-bold text-slate-700">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  )
}

export function Field({
  label, required, error, hint, children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
      {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
    </div>
  )
}

export const inp = (err?: string) =>
  `w-full border rounded-xl px-3.5 py-2.5 text-sm bg-white
   placeholder:text-slate-400 focus:outline-none transition-colors
   ${err
     ? 'border-red-300 ring-1 ring-red-200 focus:ring-red-300 focus:border-red-400'
     : 'border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`
