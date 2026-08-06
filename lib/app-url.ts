/* ================================================================
   ModuHR — 이메일 링크용 앱 URL 확정 헬퍼 (서버 전용)

   배경:
     초대/재설정 메일의 링크가 `*.vercel.app` 배포 URL로 나가면
     Vercel Deployment Protection에 걸려 Vercel 로그인·가입 화면으로
     튕긴다(우리 사이트 가입 페이지가 아니라 Vercel 가입 페이지가 뜸).

   우선순위:
     1. NEXT_PUBLIC_APP_URL — 단, localhost / *.vercel.app 은 제외
        (커스텀 도메인이 설정된 경우에만 신뢰)
     2. 실제 요청 호스트 (x-forwarded-host → host)
        매니저가 지금 쓰고 있는 도메인 = 직원도 접속 가능한 도메인
     3. 배포 환경이면 PRODUCTION_URL, 아니면 localhost
================================================================ */

import { headers } from 'next/headers'

/** 운영 커스텀 도메인 — 요청 컨텍스트가 없는 cron 등에서의 최후 fallback */
const PRODUCTION_URL = 'https://moduhr.kr'

/** 후행 슬래시 제거 */
function normalize(url: string): string {
  return url.replace(/\/+$/, '')
}

/** 이메일 링크에 넣어도 안전한 도메인인지 — vercel 배포 URL은 보호 페이지로 튕김 */
function isPublicUrl(url: string | undefined): boolean {
  if (!url?.startsWith('http')) return false
  return !url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('.vercel.app')
}

/**
 * 이메일 등 외부로 나가는 링크의 베이스 URL을 반환한다.
 * Server Component / Server Action / Route Handler 에서만 호출할 것.
 */
export function getAppUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL

  /* 1. 커스텀 도메인이 명시돼 있으면 최우선 */
  if (env && isPublicUrl(env)) return normalize(env)

  /* 2. 실제 요청 호스트에서 역산 */
  try {
    const h    = headers()
    const host = h.get('x-forwarded-host') ?? h.get('host')
    if (host) {
      const proto = h.get('x-forwarded-proto')
        ?? (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')
      return normalize(`${proto}://${host}`)
    }
  } catch {
    /* headers() 를 쓸 수 없는 컨텍스트(cron 등) — 아래 fallback 사용 */
  }

  /* 3. 최후 fallback — 배포 환경에서 localhost 링크가 나가는 것만은 막는다 */
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') return PRODUCTION_URL
  return env?.startsWith('http') ? normalize(env) : 'http://localhost:3000'
}
