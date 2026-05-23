'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'
import { resolveAuthEmailsForLogin, sendPasswordResetByRealEmail } from '@/lib/actions/auth-actions'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const redirectPath  = searchParams.get('redirect')
  const supabase      = createClient()

  const [tab,      setTab]      = useState<'login' | 'register'>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [message,  setMessage]  = useState<{ type: 'error'|'success'; text: string } | null>(null)

  /* ── 로그인 성공 후 리다이렉트 ── */
  async function afterSignIn() {
    if (redirectPath && redirectPath.startsWith('/')) { router.push(redirectPath); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user!.id).single()
    router.push(`/${profile?.role ?? 'employee'}`)
  }

  /* ── 로그인 ── */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMessage(null)

    // 1. 실제 이메일로 직접 시도 (어드민/매니저는 실제 이메일이 Auth 이메일)
    const { error: directErr } = await supabase.auth.signInWithPassword({ email, password })
    if (!directErr) { await afterSignIn(); return }

    // 2. 직원 계정 탐색 — 사번 기반 synthetic 이메일(emp{id}@itda.internal)로 재시도
    const syntheticEmails = await resolveAuthEmailsForLogin(email)
    for (const syntheticEmail of syntheticEmails) {
      const { error: synErr } = await supabase.auth.signInWithPassword({ email: syntheticEmail, password })
      if (!synErr) { await afterSignIn(); return }
    }

    setMessage({ type: 'error', text: '이메일 또는 비밀번호가 올바르지 않습니다.' })
    setLoading(false)
  }

  /* ── 비밀번호 재설정 ── */
  async function handleReset() {
    if (!email) { setMessage({ type: 'error', text: '이메일을 먼저 입력해주세요.' }); return }
    setLoading(true)
    const result = await sendPasswordResetByRealEmail(email)
    setLoading(false)
    if (result.success) setMessage({ type: 'success', text: '비밀번호 재설정 이메일을 발송했습니다. 메일함을 확인하세요.' })
    else                setMessage({ type: 'error',   text: result.error ?? '메일 발송에 실패했습니다.' })
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#0f172a] px-4">

      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="3" y="6"  width="22" height="3" rx="1.5" fill="white"/>
            <rect x="3" y="12" width="16" height="3" rx="1.5" fill="white" fillOpacity=".7"/>
            <rect x="3" y="18" width="19" height="3" rx="1.5" fill="white" fillOpacity=".5"/>
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">ModuHR</h1>
        <p className="text-slate-400 text-sm mt-1.5">딱 필요한 HR 모듈만.</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-[#1e293b] rounded-2xl border border-[#334155] p-6">

        {/* Tabs */}
        <div className="flex gap-1 bg-[#0f172a] p-1 rounded-xl mb-6">
          {(['login', 'register'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setMessage(null) }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
                ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {t === 'login' ? '로그인' : '회사 가입신청'}
            </button>
          ))}
        </div>

        {/* Login form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">이메일</label>
              <input
                type="email" required autoComplete="email"
                placeholder="example@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] text-slate-100 rounded-xl px-3.5 py-2.5 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">비밀번호</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                  placeholder="비밀번호 입력"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] text-slate-100 rounded-xl px-3.5 py-2.5 pr-11 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {message && (
              <div className={`text-xs px-3 py-2.5 rounded-xl ${
                message.type === 'success'
                  ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700'
                  : 'bg-red-900/40 text-red-400 border border-red-700'
              }`}>
                {message.text}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors active:scale-95">
              {loading ? '로그인 중...' : '로그인'}
            </button>

            <button type="button" onClick={handleReset} disabled={loading}
              className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors py-1">
              비밀번호를 잊으셨나요? 이메일로 재설정
            </button>
          </form>
        )}

        {/* Register form */}
        {tab === 'register' && (
          <RegisterForm setMessage={setMessage} message={message} />
        )}
      </div>

      <p className="text-slate-700 text-xs mt-6">
        운영 문의: swkim@fithr.co.kr
      </p>
    </div>
  )
}

/* ── 회사 가입신청 폼 ── */
const FEATURE_OPTIONS = [
  { key: 'attendance', label: '근태 관리', desc: '출퇴근 기록·조회' },
  { key: 'payroll',    label: '급여 관리', desc: '급여명세서 발행' },
  { key: 'leave',      label: '연차 관리', desc: '연차 신청·승인' },
  { key: 'documents',  label: '서류 관리', desc: '재직증명서 발급' },
] as const

function RegisterForm({
  setMessage,
  message,
}: {
  setMessage: (m: any) => void
  message: { type: 'error'|'success'; text: string } | null
}) {
  const [form, setForm] = useState({
    company_name: '', biz_number: '', representative: '',
    admin_name: '', admin_email: '', admin_phone: '',
    business_type: '', industry: '', telephone: '', address: '',
  })
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [bizDocUrl,    setBizDocUrl]    = useState<string | null>(null)
  const [extracting,   setExtracting]   = useState(false)
  const [extractMsg,   setExtractMsg]   = useState<string | null>(null)
  const [loading,      setLoading]      = useState(false)

  function toggleFeature(key: string) {
    setSelectedFeatures(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  /* ── 사업자등록증 첨부 → 자동 추출 ── */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setExtracting(true)
    setExtractMsg('파일 분석 중...')

    const fd = new FormData()
    fd.append('file', file)

    const res  = await fetch('/api/extract-biz-doc', { method: 'POST', body: fd })
    const data = await res.json().catch(() => ({}))

    setExtracting(false)

    if (!res.ok) {
      setExtractMsg('업로드 실패: ' + (data.error ?? '알 수 없는 오류'))
      return
    }

    if (data.url) setBizDocUrl(data.url)

    if (data.extracted) {
      const ex = data.extracted
      setForm(prev => ({
        ...prev,
        company_name:   ex.company_name   || prev.company_name,
        biz_number:     ex.biz_number     || prev.biz_number,
        representative: ex.representative || prev.representative,
        business_type:  ex.business_type  || prev.business_type,
        industry:       ex.industry       || prev.industry,
        address:        ex.address        || prev.address,
      }))
      setExtractMsg('✓ 정보가 자동으로 입력되었습니다. 내용을 확인 후 수정하세요.')
    } else {
      setExtractMsg('✓ 파일이 첨부되었습니다. 내용을 직접 입력해주세요.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const requestedFeatures = selectedFeatures.length > 0
      ? Object.fromEntries(selectedFeatures.map(k => [k, true]))
      : null
    const res = await fetch('/api/company-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, biz_doc_url: bizDocUrl, requested_features: requestedFeatures }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) setMessage({ type: 'error', text: '신청 중 오류가 발생했습니다: ' + (data.error ?? res.statusText) })
    else         setMessage({ type: 'success', text: '가입 신청이 완료되었습니다. 검토 후 이메일로 안내드립니다.' })
  }

  const inputCls = "w-full bg-[#0f172a] border border-[#334155] text-slate-100 rounded-xl px-3.5 py-2.5 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-slate-400 mb-2">기업 정보를 입력하면 어드민 검토 후 계정을 발급합니다.</p>

      {/* 사업자등록증 첨부 */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">사업자등록증 첨부 (선택)</label>
        <label className={`flex items-center gap-2 cursor-pointer w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors
          ${bizDocUrl
            ? 'border-emerald-600 bg-emerald-900/20 text-emerald-400'
            : 'border-dashed border-[#334155] bg-[#0f172a] text-slate-500 hover:border-blue-500 hover:text-slate-300'
          }`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          {extracting ? '분석 중...' : bizDocUrl ? '파일 첨부됨' : 'PDF / 이미지 파일 선택'}
          <input
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={extracting}
          />
        </label>
        {extractMsg && (
          <p className={`text-xs mt-1.5 ${extractMsg.startsWith('✓') ? 'text-emerald-400' : 'text-amber-400'}`}>
            {extractMsg}
          </p>
        )}
        <p className="text-xs text-slate-600 mt-1">첨부 시 내용이 자동으로 입력됩니다</p>
      </div>

      {[
        ['회사명 *',        'company_name',  '브이에이성형외과'],
        ['사업자번호',      'biz_number',    '000-00-00000'],
        ['대표자',          'representative','홍길동'],
        ['업태',            'business_type', '서비스업'],
        ['종목',            'industry',      '의원'],
        ['전화번호',        'telephone',     '02-1234-5678'],
        ['주소',            'address',       '서울시 강남구'],
        ['담당자 이름 *',   'admin_name',    '이담당'],
        ['담당자 이메일 *', 'admin_email',   'manager@va.kr'],
        ['담당자 연락처',   'admin_phone',   '010-1234-5678'],
      ].map(([label, key, placeholder]) => (
        <div key={key}>
          <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
          <input
            className={inputCls}
            placeholder={placeholder}
            value={(form as any)[key]}
            onChange={f(key as keyof typeof form)}
            required={label.includes('*')}
          />
        </div>
      ))}

      {/* 필요한 기능 선택 */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">필요한 기능 선택 (복수 선택 가능)</label>
        <div className="grid grid-cols-2 gap-2">
          {FEATURE_OPTIONS.map(({ key, label, desc }) => {
            const checked = selectedFeatures.includes(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleFeature(key)}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  checked
                    ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                    : 'border-[#334155] bg-[#0f172a] text-slate-400 hover:border-slate-500'
                }`}
              >
                <span className={`mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${
                  checked ? 'bg-blue-500 border-blue-500' : 'border-slate-600'
                }`}>
                  {checked && (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <div>
                  <p className="text-xs font-medium leading-tight">{label}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{desc}</p>
                </div>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-slate-600 mt-1.5">선택하지 않으면 직원 관리 기능만 기본 제공됩니다</p>
      </div>

      {message && (
        <div className={`text-xs px-3 py-2.5 rounded-xl ${
          message.type === 'success'
            ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700'
            : 'bg-red-900/40 text-red-400 border border-red-700'
        }`}>{message.text}</div>
      )}

      <button type="submit" disabled={loading || extracting || message?.type === 'success'}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors active:scale-95 mt-2">
        {loading ? '신청 중...' : '가입신청 제출'}
      </button>
    </form>
  )
}
