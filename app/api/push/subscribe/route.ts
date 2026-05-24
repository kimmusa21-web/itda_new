import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient }        from '@/lib/supabase/server'

// POST /api/push/subscribe — 구독 등록/갱신
export async function POST(req: NextRequest) {
  const { endpoint, p256dh, auth } = await req.json()
  if (!endpoint || !p256dh || !auth)
    return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const service = createServiceClient()

  // 프로필에서 employee_id 조회 (직원 계정만)
  const { data: emp } = await service
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!emp) return NextResponse.json({ error: 'not_employee' }, { status: 403 })

  await service
    .from('push_subscriptions')
    .upsert({ employee_id: emp.id, endpoint, p256dh, auth }, { onConflict: 'employee_id,endpoint' })

  return NextResponse.json({ ok: true })
}

// DELETE /api/push/subscribe — 구독 해제
export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: emp } = await service
    .from('employees').select('id').eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!emp) return NextResponse.json({ error: 'not_employee' }, { status: 403 })

  await service
    .from('push_subscriptions')
    .delete()
    .eq('employee_id', emp.id)
    .eq('endpoint', endpoint)

  return NextResponse.json({ ok: true })
}
