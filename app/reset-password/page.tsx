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

  // 이메일 링크에 포함된 복구 토큰을 Supabase 클라이언트가 처리할 때까지 대기
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })

    // 이미 세션이 있는 경우(재방문 등) 즉시 활성화
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

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
            <p className="text-sm text-center text-slate-500 py-4">인증 정보 확인 중...</p>
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
