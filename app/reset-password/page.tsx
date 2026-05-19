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

  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    // 디버그: 현재 URL 파라미터 표시
    const search = window.location.search
    const hash   = window.location.hash
    setDebugInfo(`search: ${search || '(없음)'} | hash: ${hash || '(없음)'}`)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true)
      } else {
        setMsg('인증 링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.')
      }
    })
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
          {debugInfo && (
            <p className="text-xs text-slate-400 bg-slate-50 rounded p-2 mb-2 break-all">{debugInfo}</p>
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
