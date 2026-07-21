/* ================================================================
   ModuHR — 주소 → 좌표 변환 (네이버 클라우드 플랫폼 Geocoding)
   NCP Geocoding API 는 CORS 미지원 + Secret 키 필요 →
   브라우저에서 직접 호출 불가하므로 서버 프록시로 중계한다.
   호출 권한: 로그인한 admin / manager 만 (외부 노출 시 API 할당량 소진 방지)
================================================================ */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const NCP_GEOCODE_URL = 'https://maps.apigw.ntruss.com/map-geocode/v2/geocode'

export async function GET(req: Request) {
  /* ── 인증 ── */
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
  }

  /* ── 입력 ── */
  const query = new URL(req.url).searchParams.get('query')?.trim()
  if (!query) return NextResponse.json({ error: '주소를 입력해주세요' }, { status: 400 })

  /* ── 키 확인 ── */
  const keyId  = process.env.NCP_MAP_CLIENT_ID ?? process.env.NEXT_PUBLIC_NCP_MAP_CLIENT_ID
  const secret = process.env.NCP_MAP_CLIENT_SECRET
  if (!keyId || !secret) {
    return NextResponse.json({ error: '지도 API 키가 설정되지 않았습니다' }, { status: 500 })
  }

  /* ── NCP 호출 ── */
  try {
    const res = await fetch(`${NCP_GEOCODE_URL}?query=${encodeURIComponent(query)}`, {
      headers: {
        'x-ncp-apigw-api-key-id': keyId,
        'x-ncp-apigw-api-key':    secret,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      // NCP 에러 본문은 키가 노출될 수 있으므로 그대로 흘리지 않는다
      console.error('[geocode] NCP 응답 오류', res.status, await res.text().catch(() => ''))
      return NextResponse.json({ error: '좌표 조회에 실패했습니다' }, { status: 502 })
    }

    const data = await res.json()
    const first = data?.addresses?.[0]
    if (!first) {
      return NextResponse.json({ error: '주소로 좌표를 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json({
      lat:     Number(first.y),
      lng:     Number(first.x),
      address: first.roadAddress || first.jibunAddress || query,
    })
  } catch (e) {
    console.error('[geocode] 호출 실패', e)
    return NextResponse.json({ error: '좌표 조회에 실패했습니다' }, { status: 502 })
  }
}
