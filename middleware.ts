/* ================================================================
   itda — 전역 미들웨어
   역할:
     1. Supabase 세션 갱신 (쿠키 refresh)
     2. 미인증 사용자 → /login 로 redirect (redirect 파라미터 보존)
     3. 이미 로그인된 사용자의 /login 접근 → 역할별 홈으로
     4. 역할별 경로 접근 제어
   ================================================================ */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** 인증 없이 접근 가능한 공개 경로 prefix */
const PUBLIC_PATHS = ['/login', '/register', '/auth', '/no-access']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  /* ── Supabase 세션 클라이언트 ── */
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  /* ── 세션 확인 (쿠키 갱신 포함) ── */
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  /* ── 공개 경로는 통과 ── */
  const isPublic = PUBLIC_PATHS.some(p => path.startsWith(p))

  /* ── 미인증 사용자 처리 ── */
  if (!user && !isPublic) {
    const loginUrl = new URL('/login', request.url)
    // 홈(/) 이 아닌 경우 redirect 파라미터로 원래 경로 보존
    if (path !== '/') loginUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(loginUrl)
  }

  /* ── 인증된 사용자 처리 ── */
  if (user) {
    /* /login 접근 → 역할별 홈으로 redirect */
    if (path === '/login' || path === '/') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const role = profile?.role
      if (role === 'admin' || role === 'manager' || role === 'employee') {
        return NextResponse.redirect(new URL(`/${role}`, request.url))
      }
      // role이 없으면 no-access로
      if (path !== '/no-access') {
        return NextResponse.redirect(new URL('/no-access', request.url))
      }
    }

    /* ── 역할 기반 경로 보호 ── */
    // 관리자·매니저·직원 경로에 접근 시에만 역할 확인
    const isProtectedPath =
      path.startsWith('/admin') ||
      path.startsWith('/manager') ||
      path.startsWith('/employee')

    if (isProtectedPath) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const role = profile?.role

      // admin: /admin 만 허용 (manager·employee 경로도 접근 차단)
      if (path.startsWith('/admin') && role !== 'admin') {
        const dest = role ? `/${role}` : '/no-access'
        return NextResponse.redirect(new URL(dest, request.url))
      }

      // manager: /manager 이하만 허용
      if (path.startsWith('/manager') && !['admin', 'manager'].includes(role ?? '')) {
        const dest = role ? `/${role}` : '/no-access'
        return NextResponse.redirect(new URL(dest, request.url))
      }

      // employee: /employee 이하만 허용
      if (path.startsWith('/employee') && role !== 'employee') {
        const dest = role ? `/${role}` : '/no-access'
        return NextResponse.redirect(new URL(dest, request.url))
      }

      // role 자체가 없는 경우
      if (!role && !path.startsWith('/no-access')) {
        return NextResponse.redirect(new URL('/no-access', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * _next/static, _next/image, favicon.ico, api 는 제외
     * api는 route handler 내부에서 별도 auth 처리
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
