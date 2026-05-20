'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [ready,    setReady]    = useState(false)
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState('')
  const [debugMsg, setDebugMsg] = useState('')

  useEffect(() => {
    let resolved = false

    const init = async () => {
      const search = window.location.search
      const hash   = window.location.hash
      setDebugMsg(`search: ${search || '(없음)'} | hash: ${hash ? hash.substring(0, 60) + '…' : '(없음)'}`)
      console.log('[reset-password] search:', search)
      console.log('[reset-password] hash:', hash)

      // 1. PKCE: ?code=xxx (PKCE 프로젝트에서 admin.generateLink도 이 방식으로 올 수 있음)
      const searchParams = new URLSearchParams(search)
      const code = searchParams.get('code')
      if (code) {
        console.log('[reset-password] PKCE code 발견, 교환 시도...')
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        console.log('[reset-password] exchangeCodeForSession:', { user: data?.session?.user?.email, error })
        if (!error && data.session) {
          resolved = true
          setReady(true)
          window.history.replaceState(null, '', window.location.pathname)
          return
        }
      }

      // 2. Implicit: #access_token=xxx (implicit flow)
      if (hash) {
        const hashParams   = new URLSearchParams(hash.substring(1))
        const accessToken  = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type         = hashParams.get('type')
        console.log('[reset-password] hash type:', type, '| has tokens:', !!(accessToken && refreshToken))

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          })
          console.log('[reset-password] setSession:', { user: data?.session?.user?.email, error })
          if (!error && data.session) {
            resolved = true
            setReady(true)
            window.history.replaceState(null, '', window.location.pathname)
            return
          }
        }
      }

      // 3. 기존 세션 확인
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[reset-password] getSession:', session?.user?.email ?? '없음')
      if (session) {
        resolved = true
        setReady(true)
        return
      }

      // search도 hash도 없으면 즉시 에러
      if (!search && !hash) {
        setMsg('인증 링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.')
        return
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[reset-password] authStateChange:', event, session?.user?.email)
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) {
        resolved = true
        setReady(true)
      }
    })

    const timer = setTimeout(() => {
      if (!resolved) {
        console.log('[reset-password] 타임아웃 — 세션 없음')
        setMsg('인증 링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.')
      }
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setMsg('비밀번호가 일치하지 않습니다'); return }
    if (password.length < 8)  { setMsg('비밀번호는 8자 이상이어야 합니다'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setMsg('오류: ' + error.message)
    else {
      setMsg('비밀번호가 변경되었습니다. 로그인 페이지로 이동합니다.')
      await supabase.auth.signOut()
      setTimeout(() => router.push('/login'), 2000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">비밀번호 변경</h1>
          <p className="text-sm text-gray-500 mt-1">새 비밀번호를 입력하세요</p>
        </div>
        <div className="card p-6">
          {debugMsg && (
            <p className="text-xs text-slate-400 bg-slate-50 rounded p-2 mb-2 break-all">{debugMsg}</p>
          )}
          {!ready ? (
            <p className="text-sm text-center text-slate-500 py-4">
              {msg || '인증 정보 확인 중...'}
            </p>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">새 비밀번호</label>
                <input type="password" className="input" placeholder="8자 이상"
                  value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호 확인</label>
                <input type="password" className="input" placeholder="비밀번호 재입력"
                  value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </div>
              {msg && (
                <p className={`text-xs px-3 py-2 rounded-lg ${
                  msg.includes('변경되었') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>{msg}</p>
              )}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
