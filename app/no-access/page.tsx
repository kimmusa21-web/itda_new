'use client'
/* ================================================================
   itda — 접근 권한 없음 페이지
   - 인증은 됐지만 유효한 role/profile이 없는 사용자
   - 또는 잘못된 경로 접근 후 fallback
================================================================ */

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldOff, LogOut, Home } from 'lucide-react'

export default function NoAccessPage() {
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleHome() {
    // 실제 role을 다시 조회해서 이동
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role
    if (role === 'admin' || role === 'manager' || role === 'employee') {
      router.push(`/${role}`)
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center space-y-6">

        {/* 아이콘 */}
        <div className="flex items-center justify-center">
          <div className="w-20 h-20 rounded-3xl bg-red-100 flex items-center justify-center">
            <ShieldOff size={36} className="text-red-500" />
          </div>
        </div>

        {/* 메시지 */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900">접근 권한이 없습니다</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            이 페이지에 접근할 권한이 없거나<br />
            계정에 역할이 아직 설정되지 않았습니다.
          </p>
          <p className="text-xs text-slate-400">
            어드민에게 계정 권한 설정을 요청하세요.
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleHome}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Home size={16} />
            내 대시보드로 이동
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl border border-slate-200 transition-colors"
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </div>

        {/* 연락처 */}
        <p className="text-xs text-slate-400">
          문의: <a href="mailto:admin@itda.kr" className="underline hover:text-slate-600">admin@itda.kr</a>
        </p>
      </div>
    </div>
  )
}
