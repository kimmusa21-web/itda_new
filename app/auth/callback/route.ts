import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Supabase PKCE 흐름 콜백 라우트
 * 이메일 링크 클릭 → Supabase 검증 → ?code=xxx 로 여기 도착
 * → exchangeCodeForSession → 세션 쿠키 설정 → next 경로로 이동
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/login'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=인증_링크가_만료되었습니다`)
}
