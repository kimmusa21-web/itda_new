'use client'
/* ================================================================
   CompanyForm — 회사 등록/수정 폼
   createCompany / updateCompany 서버 액션 호출
================================================================ */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { createCompany, updateCompany, type CompanyInput } from '@/lib/actions/company-actions'

/* ── 타입 ─────────────────────────────────────────────────── */
interface CompanyFormProps {
  mode: 'create' | 'edit'
  initialData?: Partial<CompanyInput> & { id?: number }
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

/* ── 기본값 ────────────────────────────────────────────────── */
const EMPTY: CompanyInput = {
  name:                '',
  biz_number:          '',
  representative:      '',
  contact_name:        '',
  contact_email:       '',
  'Business type':     '',
  Industry:            '',
  Telephone:           '',
  address:             '',
  'tax invoice email': '',
  status:              'active',
}

/* ── 메인 컴포넌트 ─────────────────────────────────────────── */
export function CompanyForm({ mode, initialData }: CompanyFormProps) {
  const router = useRouter()
  const [form, setForm]             = useState<CompanyInput>({ ...EMPTY, ...initialData })
  const [errors, setErrors]         = useState<Partial<Record<keyof CompanyInput, string>>>({})
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [apiError, setApiError]     = useState('')

  /* ── 필드 변경 ─────────────────────────────────────────── */
  function onChange(key: keyof CompanyInput) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm(p => ({ ...p, [key]: e.target.value }))
      if (errors[key]) setErrors(p => ({ ...p, [key]: '' }))
    }
  }

  /* ── 유효성 검사 ────────────────────────────────────────── */
  function validate(): boolean {
    const e: Partial<Record<keyof CompanyInput, string>> = {}
    if (!form.name.trim()) e.name = '회사명은 필수입니다'
    if (form.biz_number && !/^\d{3}-?\d{2}-?\d{5}$/.test(form.biz_number.replace(/-/g, ''))) {
      e.biz_number = '사업자번호 형식이 올바르지 않습니다 (예: 123-45-67890)'
    }
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
      e.contact_email = '이메일 형식이 올바르지 않습니다'
    }
    if (form['tax invoice email'] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form['tax invoice email']!)) {
      e['tax invoice email'] = '이메일 형식이 올바르지 않습니다'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  /* ── 제출 ───────────────────────────────────────────────── */
  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) {
      document.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmitState('loading')
    setApiError('')

    const result =
      mode === 'create'
        ? await createCompany(form)
        : await updateCompany(initialData!.id!, form)

    if (!result.success) {
      setApiError(result.error ?? '오류가 발생했습니다')
      setSubmitState('error')
      return
    }

    setSubmitState('success')
    setTimeout(() => router.push('/admin/companies'), 1200)
  }

  /* ── 성공 ──────────────────────────────────────────────── */
  if (submitState === 'success') {
    return (
      <div className="card p-10 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          {mode === 'create' ? '회사가 등록되었습니다' : '수정이 완료되었습니다'}
        </h2>
        <p className="text-sm text-slate-500">기업관리 목록으로 이동합니다...</p>
      </div>
    )
  }

  /* ── 폼 ────────────────────────────────────────────────── */
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 max-w-2xl">

      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {mode === 'create' ? '회사 등록' : '회사 정보 수정'}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {mode === 'create' ? '새 회사를 등록합니다' : '회사 정보를 수정합니다'}
        </p>
      </div>

      {/* 기본 정보 */}
      <Section title="기본 정보">
        <Row2>
          <FieldWrap label="회사명" error={errors.name} required>
            <input className={cls(!!errors.name)} placeholder="(주)예시회사" value={form.name} onChange={onChange('name')} />
          </FieldWrap>
          <FieldWrap label="사업자번호" error={errors.biz_number}>
            <input className={cls(!!errors.biz_number)} placeholder="123-45-67890" value={form.biz_number ?? ''} onChange={onChange('biz_number')} />
          </FieldWrap>
        </Row2>
        <Row2>
          <FieldWrap label="대표자">
            <input className={cls(false)} placeholder="홍길동" value={form.representative ?? ''} onChange={onChange('representative')} />
          </FieldWrap>
          <FieldWrap label="상태">
            <select className={cls(false)} value={form.status} onChange={onChange('status')}>
              <option value="active">운영중</option>
              <option value="inactive">비활성</option>
            </select>
          </FieldWrap>
        </Row2>
        <Row2>
          <FieldWrap label="업태">
            <input className={cls(false)} placeholder="서비스업" value={form['Business type'] ?? ''} onChange={onChange('Business type')} />
          </FieldWrap>
          <FieldWrap label="종목">
            <input className={cls(false)} placeholder="소프트웨어 개발" value={form.Industry ?? ''} onChange={onChange('Industry')} />
          </FieldWrap>
        </Row2>
      </Section>

      {/* 연락처 정보 */}
      <Section title="연락처">
        <Row2>
          <FieldWrap label="담당자 이름">
            <input className={cls(false)} placeholder="김담당" value={form.contact_name ?? ''} onChange={onChange('contact_name')} />
          </FieldWrap>
          <FieldWrap label="담당자 이메일" error={errors.contact_email}>
            <input type="email" className={cls(!!errors.contact_email)} placeholder="manager@example.com" value={form.contact_email ?? ''} onChange={onChange('contact_email')} />
          </FieldWrap>
        </Row2>
        <Row2>
          <FieldWrap label="대표 전화">
            <input className={cls(false)} placeholder="02-1234-5678" value={form.Telephone ?? ''} onChange={onChange('Telephone')} />
          </FieldWrap>
          <FieldWrap label="세금계산서 이메일" error={errors['tax invoice email']}>
            <input type="email" className={cls(!!errors['tax invoice email'])} placeholder="tax@example.com" value={form['tax invoice email'] ?? ''} onChange={onChange('tax invoice email')} />
          </FieldWrap>
        </Row2>
        <FieldWrap label="주소">
          <input className={cls(false)} placeholder="서울시 강남구..." value={form.address ?? ''} onChange={onChange('address')} />
        </FieldWrap>
      </Section>

      {/* API 에러 */}
      {submitState === 'error' && apiError && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      {/* 버튼 */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/admin/companies')}
          className="btn-secondary"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitState === 'loading'}
          className="btn-primary flex-1 max-w-xs flex items-center justify-center gap-2"
        >
          {submitState === 'loading' ? (
            <><Loader2 size={16} className="animate-spin" />저장 중...</>
          ) : mode === 'create' ? (
            '회사 등록'
          ) : (
            '수정 저장'
          )}
        </button>
      </div>
    </form>
  )
}

/* ── 서브 컴포넌트 ──────────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 pb-1 border-b border-slate-100">{title}</h3>
      {children}
    </div>
  )
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
}

function FieldWrap({
  label, error, required, children,
}: {
  label: string; error?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div data-error={error ? true : undefined}>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={11} />{error}
        </p>
      )}
    </div>
  )
}

function cls(hasError: boolean) {
  return [
    'input',
    hasError ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : '',
  ].filter(Boolean).join(' ')
}
