import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient }       from '@/lib/supabase/service'
import { sendPushNotification }      from '@/lib/web-push'
import { isWorkday }                 from '@/lib/utils/korean-holidays'

// Vercel Cron: 매일 08:55 KST (23:55 UTC 전날) 실행
// 회사별 출근 시간 기준 5분 전에 직원에게 출근 등록 알림 발송
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const today  = kstNow.toISOString().slice(0, 10)

  if (!(await isWorkday(today)))
    return NextResponse.json({ skipped: true, reason: 'holiday', date: today })

  // 현재 KST 시각 (분 단위)
  const nowMin = kstNow.getUTCHours() * 60 + kstNow.getUTCMinutes()

  const service = createServiceClient()
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://moduhr.kr'
  let sent = 0, expired = 0

  // 근태 활성화된 회사 목록 + checkin_time 조회
  const { data: companies } = await service
    .from('companies')
    .select('id, checkin_time, features')

  if (!companies?.length) return NextResponse.json({ sent: 0 })

  for (const company of companies) {
    const features = company.features as Record<string, boolean> | null
    if (!features?.attendance) continue

    // 회사 출근시간 파싱 (기본 09:00)
    const timeStr    = (company.checkin_time as string | null) ?? '09:00'
    const [hh, mm]   = timeStr.split(':').map(Number)
    const remindMin  = hh * 60 + mm - 5  // 출근 5분 전

    // 현재 크론 실행 시각이 알림 시각 ±15분 이내인지 확인
    if (Math.abs(nowMin - remindMin) > 15) continue

    // 해당 회사 push 구독자 조회
    const { data: subs } = await service
      .from('push_subscriptions')
      .select(`
        id, endpoint, p256dh, auth,
        employees!inner ( id, name, phone )
      `)
      .eq('employees.company_id', company.id)

    if (!subs?.length) continue

    for (const sub of subs) {
      const emp = (sub as any).employees
      if (!emp?.phone) continue

      const ok = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        {
          title: '출근 등록 알림 🏢',
          body:  `${emp.name}님, ${timeStr} 출근 시간이 다가옵니다. 출근 등록을 잊지 마세요!`,
          url:   `${appUrl}/employee/attendance`,
        },
      )

      if (ok) sent++
      else {
        await service.from('push_subscriptions').delete().eq('id', sub.id)
        expired++
      }
    }
  }

  return NextResponse.json({ sent, expired, date: today })
}
