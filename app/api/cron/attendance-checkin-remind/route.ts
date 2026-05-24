import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient }       from '@/lib/supabase/service'
import { sendPushNotification }      from '@/lib/web-push'
import { isWorkday }                 from '@/lib/utils/korean-holidays'

// Vercel Cron: 매일 KST 08:50 (UTC 23:50 전날)
// vercel.json schedule: "50 23 * * 0-4"  (일~목 UTC = 월~금 KST)
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // 오늘 KST 날짜
  const kstNow  = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const today   = kstNow.toISOString().slice(0, 10)

  // 주말·공휴일이면 스킵
  if (!(await isWorkday(today))) {
    return NextResponse.json({ skipped: true, reason: 'holiday', date: today })
  }

  const service = createServiceClient()

  // 근태 기능이 활성화된 회사 + 핸드폰 번호가 있는 직원의 push 구독 목록
  const { data: subs } = await service
    .from('push_subscriptions')
    .select(`
      id,
      endpoint, p256dh, auth,
      employees!inner (
        id,
        name,
        phone,
        company_id,
        companies!inner ( features )
      )
    `)

  if (!subs?.length) return NextResponse.json({ sent: 0 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://moduhr.kr'
  let sent = 0, expired = 0

  for (const sub of subs) {
    const emp = (sub as any).employees
    if (!emp?.phone) continue

    // 근태 기능 활성화 확인
    const features = emp.companies?.features as Record<string, boolean> | null
    if (!features?.attendance) continue

    const ok = await sendPushNotification(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      {
        title: '출근 등록 알림 🏢',
        body:  `${emp.name}님, 출근 등록을 해주세요!`,
        url:   `${appUrl}/employee/attendance`,
      },
    )

    if (ok) sent++
    else {
      // 만료된 구독 삭제
      await service.from('push_subscriptions').delete().eq('id', sub.id)
      expired++
    }
  }

  return NextResponse.json({ sent, expired, date: today })
}
