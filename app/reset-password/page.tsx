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

  useEffect(() => {
    let resolved = false

    const init = async () => {
      // admin.generateLink()는 implicit flow → 해시에 토큰 포함
      // createBrowserClient가 flowType:'pkce'로 초기화되므로 직접 파싱해서 setSession 호출
      const hash = window.location.hash.substring(1)
      if (hash) {
        const params       = new URLSearchParams(hash)
        const accessToken  = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type         = params.get('type')

        if (accessToken && refreshToken && type === 'recovery') {
          const { error } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          })
          if (!error) {
            resolved = true
            setReady(true)
            // 토큰이 URL에 남지 않도록 해시 제거
            window.history.replaceState(null, '', window.location.pathname)
            return
          }
        }
      }

      // 이미 세션이 있는 경우(PKCE 콜백 등)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        resolved = true
        setReady(true)
      }
    }

    init()

    // 이벤트 기반 폴백
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) {
        resolved = true
        setReady(true)
      }
    })

    // 5초 안에 인증이 확인되지 않으면 에러 표시
    const timer = setTimeout(() => {
      if (!resolved) {
        setMsg('인증 링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.')
      }
    }, 5000)

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
