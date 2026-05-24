'use client'
/* ================================================================
   /auth/verify — 직원 가입 인증번호 입력 페이지
   공개 접근 가능 (로그인 불필요)

   플로우:
     어드민 승인 → 인증번호 이메일 수신 → 이 페이지에서 입력
     → 인증 완료 → 로그인 가능
================================================================ */

import { useState } from 'react'
import { Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, KeyRound } from 'lucide-react'
import Link from 'next/link'

type Step = 'form' | 'loading' | 'success' | 'error'

export default function EmployeeVerifyPage() {
  const [step,            setStep]            = useState<Step>('form')
  const [email,           setEmail]           = useState('')
  const [code,            setCode]            = useState('')
  const [password,        setPassword]        = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPw,          setShowPw]          = useState(false)
  const [errorMsg,        setErrorMsg]        = useState('')
  const [fieldErrors,     setFieldErrors]     = useState<Record<string, string>>({})

  /* ── 유효성 검사 ────────────────────────────────────────── */
  function validate(): boolean {
    const errs: Record<string, string> = {}

    if (!email.trim()) errs.email = '이메일을 입력해주세요'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = '이메일 형식이 올바르지 않습니다'

    if (!code.trim()) errs.code = '인증번호를 입력해주세요'
    else if (!/^\d{6}$/.test(code.trim())) errs.code = '인증번호는 6자리 숫자입니다'

    if (!password) errs.password = '비밀번호를 입력해주세요'
    else if (password.length < 8) errs.password = '비밀번호는 8자 이상이어야 합니다'

    if (!passwordConfirm) errs.passwordConfirm = '비밀번호 확인을 입력해주세요'
    else if (password !== passwordConfirm) errs.passwordConfirm = '비밀번호가 일치하지 않습니다'

    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  /* ── 제출 ───────────────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setStep('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/employee-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:    email.trim().toLowerCase(),
          code:     code.trim(),
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? '오류가 발생했습니다. 다시 시도해주세요.')
        setStep('error')
        return
      }

      setStep('success')
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.')
      setStep('error')
    }
  }

  /* ── 성공 화면 ──────────────────────────────────────────── */
  if (step === 'success') {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xl">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">가입이 완료되었습니다!</h2>
          <p className="text-sm text-slate-500 mb-6">
            이제 등록하신 이메일과 비밀번호로 로그인할 수 있습니다.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full bg-blue-600 text-white text-sm font-medium px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            로그인 하러 가기 →
          </Link>
        </div>
      </div>
    )
  }

  /* ── 폼/에러/로딩 화면 ─────────────────────────────────── */
  return (
    <div className="w-full max-w-md">
      {/* 로고 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <KeyRound size={16} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white">ModuHR</span>
        </div>
        <h1 className="text-2xl font-bold text-white mt-4 mb-1">가입 인증</h1>
        <p className="text-slate-400 text-sm">
          이메일로 발송된 6자리 인증번호를 입력하고<br />
          비밀번호를 설정하면 가입이 완료됩니다.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl">
        {/* 에러 배너 */}
        {step === 'error' && errorMsg && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* 이메일 */}
          <Field
            label="이메일"
            error={fieldErrors.email}
            required
          >
            <input
              type="email"
              className={inputCls(!!fieldErrors.email)}
              placeholder="등록된 이메일 주소"
              value={email}
              onChange={e => {
                setEmail(e.target.value)
                if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: '' }))
              }}
              autoComplete="email"
            />
          </Field>

          {/* 인증번호 */}
          <Field
            label="인증번호"
            error={fieldErrors.code}
            hint="이메일로 발송된 6자리 숫자"
            required
          >
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              className={inputCls(!!fieldErrors.code) + ' tracking-[0.4em] text-center text-xl font-bold'}
              placeholder="000000"
              value={code}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                setCode(v)
                if (fieldErrors.code) setFieldErrors(p => ({ ...p, code: '' }))
              }}
              autoComplete="one-time-code"
            />
          </Field>

          {/* 비밀번호 */}
          <Field
            label="비밀번호 설정"
            error={fieldErrors.password}
            hint="8자 이상"
            required
          >
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className={inputCls(!!fieldErrors.password) + ' pr-10'}
                placeholder="새 비밀번호 (8자 이상)"
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: '' }))
                }}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          {/* 비밀번호 확인 */}
          <Field
            label="비밀번호 확인"
            error={fieldErrors.passwordConfirm}
            required
          >
            <input
              type={showPw ? 'text' : 'password'}
              className={inputCls(!!fieldErrors.passwordConfirm)}
              placeholder="비밀번호 재입력"
              value={passwordConfirm}
              onChange={e => {
                setPasswordConfirm(e.target.value)
                if (fieldErrors.passwordConfirm) setFieldErrors(p => ({ ...p, passwordConfirm: '' }))
              }}
              autoComplete="new-password"
            />
          </Field>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={step === 'loading'}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-blue-700 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {step === 'loading' ? (
              <><Loader2 size={16} className="animate-spin" />인증 중...</>
            ) : (
              '가입 완료'
            )}
          </button>
        </form>

        {/* 안내 */}
        <p className="text-center text-xs text-slate-400 mt-4">
          인증번호를 받지 못했나요?{' '}
          <span className="text-blue-600">담당자 또는 어드민에게 문의하세요</span>
        </p>
      </div>

      {/* 로그인 링크 */}
      <p className="text-center text-sm text-slate-500 mt-6">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-blue-400 hover:underline">
          로그인
        </Link>
      </p>
    </div>
  )
}

/* ── 서브 컴포넌트 ──────────────────────────────────────────── */
function Field({
  label, error, hint, required, children,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div data-error={error ? true : undefined}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="text-xs text-slate-400 font-normal ml-1.5">({hint})</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={11} />
          {error}
        </p>
      )}
    </div>
  )
}

function inputCls(hasError: boolean) {
  return [
    'w-full border rounded-xl px-3.5 py-2.5 text-sm bg-white',
    'placeholder:text-slate-400 text-slate-900',
    'focus:outline-none focus:ring-2 transition-colors',
    hasError
      ? 'border-red-400 focus:ring-red-200 focus:border-red-500'
      : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500',
  ].join(' ')
}
