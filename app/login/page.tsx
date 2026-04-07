'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

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

  /* ── 로그인 ── */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMessage(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage({ type: 'error', text: '이메일 또는 비밀번호가 올바르지 않습니다.' })
      setLoading(false); return
    }

    /* redirect 파라미터가 있고 안전한 내부 경로면 그쪽으로 이동 */
    if (redirectPath && redirectPath.startsWith('/')) {
      router.push(redirectPath)
      return
    }

    /* 역할 조회 후 리다이렉트 */
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', (await supabase.auth.getUser()).data.user!.id).single()
    router.push(`/${profile?.role ?? 'employee'}`)
  }

  /* ── 비밀번호 재설정 ── */
  async function handleReset() {
    if (!email) { setMessage({ type: 'error', text: '이메일을 먼저 입력해주세요.' }); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) setMessage({ type: 'error', text: '메일 발송에 실패했습니다.' })
    else       setMessage({ type: 'success', text: '비밀번호 재설정 이메일을 발송했습니다. 메일함을 확인하세요.' })
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
        <h1 className="text-3xl font-bold text-white tracking-tight">itda</h1>
        <p className="text-slate-400 text-sm mt-1.5">급여명세서를 언제 어디서나</p>
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

      {/* Initial pw hint */}
      {tab === 'login' && (
        <p className="text-center text-xs text-slate-600 mt-5">
          초기 비밀번호:{' '}
          <span className="font-mono bg-[#1e293b] text-slate-400 px-2 py-0.5 rounded">
            이메일앞부분 + 생년월일6자리
          </span>
        </p>
      )}

      <p className="text-slate-700 text-xs mt-6">
        운영 문의: admin@itda.kr
      </p>
    </div>
  )
}

/* ── 회사 가입신청 폼 ── */
function RegisterForm({
  setMessage,
  message,
}: {
  setMessage: (m: any) => void
  message: { type: 'error'|'success'; text: string } | null
}) {
  const supabase = createClient()
  const [form, setForm] = useState({
    company_name: '', biz_number: '', representative: '',
    admin_name: '', admin_email: '', admin_phone: '',
    business_type: '', industry: '', telephone: '', address: '',
  })
  const [loading, setLoading] = useState(false)

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('company_admin_requests').insert(form)
    setLoading(false)
    if (error) setMessage({ type: 'error', text: '신청 중 오류가 발생했습니다: ' + error.message })
    else       setMessage({ type: 'success', text: '가입 신청이 완료되었습니다. 검토 후 이메일로 안내드립니다.' })
  }

  const inputCls = "w-full bg-[#0f172a] border border-[#334155] text-slate-100 rounded-xl px-3.5 py-2.5 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-slate-400 mb-4">기업 정보를 입력하면 어드민 검토 후 계정을 발급합니다.</p>

      {[
        ['회사명 *',     'company_name',  '브이에이성형외과'],
        ['사업자번호',   'biz_number',    '000-00-00000'],
        ['대표자',       'representative','홍길동'],
        ['업태',         'business_type', '서비스업'],
        ['종목',         'industry',      '의원'],
        ['전화번호',     'telephone',     '02-1234-5678'],
        ['주소',         'address',       '서울시 강남구'],
        ['담당자 이름 *','admin_name',    '이담당'],
        ['담당자 이메일 *','admin_email', 'manager@va.kr'],
        ['담당자 연락처','admin_phone',   '010-1234-5678'],
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

      {message && (
        <div className={`text-xs px-3 py-2.5 rounded-xl ${
          message.type === 'success'
            ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700'
            : 'bg-red-900/40 text-red-400 border border-red-700'
        }`}>{message.text}</div>
      )}

      <button type="submit" disabled={loading || message?.type === 'success'}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors active:scale-95 mt-2">
        {loading ? '신청 중...' : '가입신청 제출'}
      </button>
    </form>
  )
}
