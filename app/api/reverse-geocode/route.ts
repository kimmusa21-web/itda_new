/* ================================================================
   itda — 좌표 → 주소 변환 (네이버 클라우드 플랫폼 Reverse Geocoding)
   NCP Reverse Geocoding API 는 CORS 미지원 + Secret 키 필요 →
   브라우저에서 직접 호출 불가하므로 서버 프록시로 중계한다.
   호출 권한: 로그인한 사용자 (외부 노출 시 API 할당량 소진 방지)
================================================================ */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const NCP_REVERSE_GEOCODE_URL = 'https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc'

export async function GET(req: Request) {
  /* ── 인증 (로그인 사용자면 충분: 직원도 출퇴근 시 호출) ── */
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  /* ── 입력 ── */
  const params = new URL(req.url).searchParams
  const lat = Number(params.get('lat'))
  const lng = Number(params.get('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: '좌표가 올바르지 않습니다' }, { status: 400 })
  }

  /* ── 키 확인 ── */
  const keyId  = process.env.NCP_MAP_CLIENT_ID ?? process.env.NEXT_PUBLIC_NCP_MAP_CLIENT_ID
  const secret = process.env.NCP_MAP_CLIENT_SECRET
  if (!keyId || !secret) {
    return NextResponse.json({ error: '지도 API 키가 설정되지 않았습니다' }, { status: 500 })
  }

  /* ── NCP 호출 (도로명 우선, 실패 시 지번) ── */
  try {
    const url = `${NCP_REVERSE_GEOCODE_URL}?coords=${lng},${lat}&output=json&orders=roadaddr,addr`
    const res = await fetch(url, {
      headers: {
        'x-ncp-apigw-api-key-id': keyId,
        'x-ncp-apigw-api-key':    secret,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      // NCP 에러 본문은 키가 노출될 수 있으므로 그대로 흘리지 않는다
      console.error('[reverse-geocode] NCP 응답 오류', res.status, await res.text().catch(() => ''))
      return NextResponse.json({ error: '주소 조회에 실패했습니다' }, { status: 502 })
    }

    const data = await res.json()
    const address = formatAddress(data)
    if (!address) {
      return NextResponse.json({ error: '해당 좌표의 주소를 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json({ address })
  } catch (e) {
    console.error('[reverse-geocode] 호출 실패', e)
    return NextResponse.json({ error: '주소 조회에 실패했습니다' }, { status: 502 })
  }
}

/** NCP reverse-geocode 응답에서 사람이 읽을 주소 문자열을 조립한다. */
function formatAddress(data: unknown): string | null {
  const results = (data as { results?: RgResult[] })?.results
  if (!results?.length) return null

  // roadaddr 우선, 없으면 첫 결과 사용
  const road = results.find(r => r.name === 'roadaddr')
  const target = road ?? results[0]
  const region = target.region
  const land   = target.land

  const area = [region?.area1?.name, region?.area2?.name, region?.area3?.name]
    .filter(Boolean)
    .join(' ')

  let detail = ''
  if (target.name === 'roadaddr' && land?.name) {
    // 도로명 + 건물번호
    detail = [land.name, [land.number1, land.number2].filter(Boolean).join('-')]
      .filter(Boolean)
      .join(' ')
  } else if (land) {
    // 지번
    detail = [region?.area4?.name, [land.number1, land.number2].filter(Boolean).join('-')]
      .filter(Boolean)
      .join(' ')
  }

  const full = [area, detail].filter(Boolean).join(' ').trim()
  return full || null
}

interface RgResult {
  name?: string
  region?: {
    area1?: { name?: string }
    area2?: { name?: string }
    area3?: { name?: string }
    area4?: { name?: string }
  }
  land?: {
    name?:    string
    number1?: string
    number2?: string
  }
}
