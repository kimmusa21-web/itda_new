'use client'

import { Banknote, Plus, X } from 'lucide-react'
import type { EmployeeCreateInput, NonTaxableItem } from './employee-form'
import type { FormErrors } from '@/lib/validation'
import { FormSection, Field, inp } from './employee-basic-section'
import { formatSalaryDisplay, parseSalaryInput } from '@/lib/validation'

interface Props {
  form: EmployeeCreateInput
  errors: FormErrors<EmployeeCreateInput>
  onChange: <K extends keyof EmployeeCreateInput>(key: K, value: EmployeeCreateInput[K]) => void
}

const salaryTypeLabel = { annual: '연봉', monthly: '월급', hourly: '시급' }
const salaryBasisLabel = { gross: '세전', net: '세후' }

const PRESETS = ['식대', '자가운전보조금', '출산·보육수당', '연구활동비']

export function EmployeeSalarySection({ form, errors, onChange }: Props) {
  const items = form.nonTaxableItems
  const baseNum = typeof form.salaryAmount === 'number' ? form.salaryAmount : 0
  const nonTaxTotal = items.reduce(
    (sum, i) => sum + (typeof i.amount === 'number' ? i.amount : 0), 0
  )
  const taxableTotal = baseNum > 0 ? Math.max(0, baseNum - nonTaxTotal) : 0

  function addItem(name = '') {
    onChange('nonTaxableItems', [...items, { name, amount: '' }])
  }

  function updateItem(idx: number, patch: Partial<NonTaxableItem>) {
    onChange('nonTaxableItems', items.map((item, i) => i === idx ? { ...item, ...patch } : item))
  }

  function removeItem(idx: number) {
    onChange('nonTaxableItems', items.filter((_, i) => i !== idx))
  }

  return (
    <FormSection icon={<Banknote size={15} className="text-blue-500" />} title="급여 정보">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* 급여 유형 */}
        <Field label="급여 유형" required error={errors.salaryType}>
          <div className="flex gap-4 pt-1">
            {(['annual', 'monthly', 'hourly'] as const).map(v => (
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

        {/* 기준 */}
        <Field label="기준" required error={errors.salaryBasis}>
          <div className="flex gap-4 pt-1">
            {(['gross', 'net'] as const).map(v => (
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

        {/* 금액 */}
        <Field
          label={`${salaryTypeLabel[form.salaryType]} 금액`}
          required
          error={errors.salaryAmount}
          hint={form.salaryAmount ? `${formatSalaryDisplay(form.salaryAmount)}원` : '숫자만 입력하세요'}
        >
          <div className="relative">
            <input
              className={`${inp(errors.salaryAmount)} pr-6`}
              placeholder={
                form.salaryType === 'annual' ? '40,000,000'
                : form.salaryType === 'hourly' ? '10,030'
                : '3,000,000'
              }
              inputMode="numeric"
              value={form.salaryAmount === '' ? '' : formatSalaryDisplay(form.salaryAmount)}
              onChange={e => onChange('salaryAmount', parseSalaryInput(e.target.value))}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
          </div>
        </Field>

        {/* 비과세 항목 */}
        <div className="col-span-1 sm:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-slate-700">비과세 항목</span>
              <span className="text-xs text-slate-400 ml-2">4대보험 신고 기준액 산정용</span>
            </div>
            <button
              type="button"
              onClick={() => addItem()}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={13} />항목 추가
            </button>
          </div>

          {/* 빠른 추가 프리셋 (항목이 없을 때만 표시) */}
          {items.length === 0 && (
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => addItem(name)}
                  className="text-xs px-2.5 py-1 rounded-full border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 bg-white transition-colors"
                >
                  + {name}
                </button>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="항목명 (예: 식대)"
                    value={item.name}
                    onChange={e => updateItem(idx, { name: e.target.value })}
                  />
                  <div className="relative w-36 flex-shrink-0">
                    <input
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 pr-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="200,000"
                      inputMode="numeric"
                      value={item.amount === '' ? '' : formatSalaryDisplay(item.amount)}
                      onChange={e => updateItem(idx, { amount: parseSalaryInput(e.target.value) })}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {items.length === 0 && (
            <p className="text-xs text-slate-400">비과세 항목이 없으면 급여 전액이 과세됩니다</p>
          )}
        </div>

        {/* 과세총액합계 (금액이 입력된 경우에만 표시) */}
        {baseNum > 0 && (
          <div className="col-span-1 sm:col-span-2">
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <div>
                <span className="text-sm font-semibold text-blue-800">과세총액합계</span>
                {nonTaxTotal > 0 && (
                  <span className="text-xs text-blue-500 ml-2">
                    {formatSalaryDisplay(baseNum)}원 − 비과세 {formatSalaryDisplay(nonTaxTotal)}원
                  </span>
                )}
              </div>
              <span className="text-base font-bold text-blue-900">
                {formatSalaryDisplay(taxableTotal)}원
              </span>
            </div>
          </div>
        )}

      </div>
    </FormSection>
  )
}
