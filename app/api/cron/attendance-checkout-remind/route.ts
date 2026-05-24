import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient }       from '@/lib/supabase/service'
import { sendPushNotification }      from '@/lib/web-push'

// Vercel Cron: 매 5분마다 실행
// 출근 후 9시간이 지났고 아직 퇴근 미등록 + 알림 미발송인 직원에게 발송
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const service  = createServiceClient()
  const nowUtc   = new Date().toISOString()
  const kstNow   = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const today    = kstNow.toISOString().slice(0, 10)

  // 오늘 출근했고, 퇴근 미등록, 알림 미발송, 출근 후 9시간 경과한 로그 조회
  const { data: logs } = await service
    .from('attendance_logs')
    .select(`
      id,
      employee_id,
      check_in_at,
      employees!inner (
        id, name, phone,
        company_id,
        companies!inner ( features )
      )
    `)
    .eq('work_date', today)
    .not('check_in_at', 'is', null)
    .is('check_out_at', null)
    .is('checkout_reminded_at', null)
    .lte('check_in_at', new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString())

  if (!logs?.length) return NextResponse.json({ sent: 0 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://moduhr.kr'
  let sent = 0

  for (const log of logs) {
    const emp = (log as any).employees
    if (!emp?.phone) continue

    const features = emp.companies?.features as Record<string, boolean> | null
    if (!features?.attendance) continue

    // 해당 직원의 push 구독 조회
    const { data: subs } = await service
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('employee_id', emp.id)

    if (!subs?.length) continue

    for (const sub of subs) {
      const ok = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        {
          title: '퇴근 등록 알림 🏠',
          body:  `${emp.name}님, 퇴근 등록을 잊지 마세요!`,
          url:   `${appUrl}/employee/attendance`,
        },
      )
      if (!ok) {
        await service.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }

    // 알림 발송 기록 (중복 발송 방지)
    await service
      .from('attendance_logs')
      .update({ checkout_reminded_at: nowUtc })
      .eq('id', log.id)

    sent++
  }

  return NextResponse.json({ sent })
}
