'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { EmployeeBasicSection } from './employee-basic-section'
import { EmployeeOrgSection }   from './employee-org-section'
import { EmployeeWorkSection }  from './employee-work-section'
import { EmployeeSalarySection } from './employee-salary-section'
import { createClient } from '@/lib/supabase/client'
import {
  validateRequired, validateEmail, validatePhone,
  validateBirthdate, validateDate, validateSalaryAmount,
  type FormErrors,
} from '@/lib/validation'

/* ── 타입 ──────────────────────────────────────────────── */
export type EmployeeCreateInput = {
  name: string
  email: string
  birthdate: string
  gender: 'male' | 'female'
  phone: string
  department: string
  position: string
  jobTitle: string
  grade: string
  job: string
  jobDescription: string
  workLocation: string
  joinDate: string
  salaryType: 'annual' | 'monthly'
  salaryAmount: number | ''
  salaryBasis: 'gross' | 'net'
}

const INITIAL: EmployeeCreateInput = {
  name: '', email: '', birthdate: '', gender: 'male', phone: '',
  department: '', position: '', jobTitle: '', grade: '',
  job: '', jobDescription: '', workLocation: '',
  joinDate: new Date().toISOString().slice(0, 10),
  salaryType: 'monthly', salaryAmount: '', salaryBasis: 'gross',
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

/* ── Mock API (실제 Supabase 연동 전) ─────────────────── */
async function mockCreateEmployeeRequest(_data: EmployeeCreateInput): Promise<{ success: boolean; error?: string }> {
  await new Promise(r => setTimeout(r, 1200))
  // 테스트: 이미 등록된 이메일 시뮬레이션
  if (_data.email.includes('duplicate')) return { success: false, error: '이미 등록된 이메일입니다' }
  return { success: true }
}

/* ── 실제 Supabase 연동 함수 (추후 교체) ───────────────── */
async function realCreateEmployeeRequest(
  data: EmployeeCreateInput,
  companyId: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('employee_requests').insert({
    name:         data.name,
    email:        data.email,
    birthdate:    data.birthdate || null,
    gender:       data.gender,
    phone:        data.phone || null,
    department:   data.department || null,
    position:     data.position || null,
    job:          data.job || null,
    grade:        data.grade || null,
    role_title:   data.jobTitle || null,
    work_details: data.jobDescription || null,
    work_location:data.workLocation || null,
    join_date:    data.joinDate || null,
    salary_type:  data.salaryType,
    salary_amount:data.salaryAmount || null,
    salary_basis: data.salaryBasis,
    company_id:   companyId,
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

/* ── 메인 폼 컴포넌트 ─────────────────────────────────── */
interface Props {
  companyId: number
  companyName: string
  useMock?: boolean  // true면 mock API, false면 실제 Supabase
}

export function EmployeeForm({ companyId, companyName, useMock = true }: Props) {
  const router = useRouter()
  const [form, setForm]     = useState<EmployeeCreateInput>(INITIAL)
  const [errors, setErrors] = useState<FormErrors<EmployeeCreateInput>>({})
  const [submit, setSubmit] = useState<SubmitState>('idle')
  const [apiErr, setApiErr] = useState('')

  function onChange<K extends keyof EmployeeCreateInput>(key: K, value: EmployeeCreateInput[K]) {
    setForm(p => ({ ...p, [key]: value }))
    // 타이핑 시 해당 필드 에러 즉시 제거
    if (errors[key]) setErrors(p => ({ ...p, [key]: undefined }))
  }

  function validate(): boolean {
    const e: FormErrors<EmployeeCreateInput> = {}
    e.name       = validateRequired(form.name, '이름')
    e.email      = validateEmail(form.email)
    e.birthdate  = validateBirthdate(form.birthdate)
    e.phone      = validatePhone(form.phone)
    e.joinDate   = validateDate(form.joinDate, '입사일')
    e.salaryAmount = validateSalaryAmount(form.salaryAmount)
    setErrors(e)
    return !Object.values(e).some(Boolean)
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) {
      // 첫 번째 오류 필드로 스크롤
      const firstErr = document.querySelector('[data-error]')
      firstErr?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmit('loading')
    setApiErr('')

    const result = useMock
      ? await mockCreateEmployeeRequest(form)
      : await realCreateEmployeeRequest(form, companyId)

    if (result.success) {
      setSubmit('success')
    } else {
      setApiErr(result.error ?? '오류가 발생했습니다')
      setSubmit('error')
    }
  }

  function handleReset() {
    setForm(INITIAL)
    setErrors({})
    setSubmit('idle')
    setApiErr('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ── 성공 화면 ── */
  if (submit === 'success') {
    return (
      <div className="card p-10 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">가입신청이 등록되었습니다</h2>
        <p className="text-sm text-slate-500 mb-1">
          <span className="font-semibold text-slate-700">{form.name}</span> ({form.email})
        </p>
        <p className="text-sm text-slate-500 mb-6">
          어드민 승인 후 초대 이메일이 발송됩니다
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={handleReset} className="btn-secondary">
            추가 등록
          </button>
          <button onClick={() => router.push('/manager/employees')} className="btn-primary">
            직원 목록으로
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">

      {/* Page header */}
      <div>
        <p className="text-xs text-slate-400 mb-1">{companyName} · 직원 관리</p>
        <h1 className="text-2xl font-bold text-slate-900">직원 등록</h1>
        <p className="text-sm text-slate-500 mt-1">
          직원 정보를 입력하면 가입신청이 생성되며, 승인 후 계정이 생성됩니다
        </p>
      </div>

      {/* Policy notice */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          <span className="font-semibold">가입신청 → 어드민 승인 → 초대 이메일 발송</span> 순서로 진행됩니다.
          직원은 초대 이메일의 링크를 통해 비밀번호를 직접 설정합니다.
        </p>
      </div>

      {/* Form sections */}
      <EmployeeBasicSection   form={form} errors={errors} onChange={onChange} />
      <EmployeeOrgSection     form={form} errors={errors} onChange={onChange} />
      <EmployeeWorkSection    form={form} errors={errors} onChange={onChange} />
      <EmployeeSalarySection  form={form} errors={errors} onChange={onChange} />

      {/* API Error */}
      {submit === 'error' && apiErr && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{apiErr}</p>
        </div>
      )}

      {/* Validation summary */}
      {Object.values(errors).some(Boolean) && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">
            필수 항목을 모두 입력하고 오류를 수정한 후 다시 시도해주세요
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="card p-4 flex gap-3 items-center">
        <button
          type="button"
          onClick={handleReset}
          className="btn-secondary"
        >
          초기화
        </button>
        <button
          type="submit"
          disabled={submit === 'loading'}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {submit === 'loading' ? (
            <><Loader2 size={16} className="animate-spin" />처리 중...</>
          ) : (
            '가입신청 등록'
          )}
        </button>
      </div>

    </form>
  )
}
