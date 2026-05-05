import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient }  from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function serviceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function POST(req: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id, name, email')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager')
    return NextResponse.json({ error: '매니저 권한이 필요합니다' }, { status: 403 })

  if (!profile.company_id)
    return NextResponse.json({ error: '연결된 회사가 없습니다' }, { status: 400 })

  const { note, data_downloaded } = await req.json()

  const service = serviceClient()

  // 이미 접수된 신청이 있는지 확인
  const { data: existing } = await service
    .from('company_withdrawal_requests')
    .select('id')
    .eq('company_id', profile.company_id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing)
    return NextResponse.json({ error: '이미 탈퇴 신청이 접수되어 있습니다' }, { status: 409 })

  // 회사명 조회
  const { data: company } = await service
    .from('companies')
    .select('name')
    .eq('id', profile.company_id)
    .single()

  // 신청 삽입
  const { data: request, error: insertErr } = await service
    .from('company_withdrawal_requests')
    .insert({
      company_id:      profile.company_id,
      requested_by:    user.id,
      note:            note?.trim() || null,
      data_downloaded: data_downloaded ?? false,
    })
    .select('id')
    .single()

  if (insertErr || !request)
    return NextResponse.json({ error: '신청 중 오류: ' + insertErr?.message }, { status: 500 })

  // 어드민 알림
  try {
    const { data: admins } = await service
      .from('profiles').select('id').eq('role', 'admin')

    if (admins && admins.length > 0) {
      await service.from('notifications').insert(
        admins.map((a: { id: string }) => ({
          user_id:   a.id,
          type:      'company_withdrawal_request',
          title:     '기업 탈퇴신청',
          message:   `${company?.name ?? '(회사명 없음)'} (담당자: ${profile.name ?? profile.email}) 탈퇴신청이 접수되었습니다.`,
          target_id: String(request.id),
          is_read:   false,
        }))
      )
    }
  } catch (e) {
    console.warn('[withdrawal-request] 어드민 알림 실패:', e)
  }

  return NextResponse.json({ success: true })
}
