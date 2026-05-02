import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다' }, { status: 400 })
  }

  const { company_name, admin_name, admin_email } = body
  if (!company_name?.trim() || !admin_name?.trim() || !admin_email?.trim()) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요' }, { status: 400 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  /* 1. 기업신청 INSERT */
  const { data: request, error: reqError } = await service
    .from('company_admin_requests')
    .insert(body)
    .select('id')
    .single()

  if (reqError) {
    console.error('[company-request] INSERT 실패:', reqError.message)
    return NextResponse.json({ error: '신청 중 오류가 발생했습니다: ' + reqError.message }, { status: 500 })
  }

  /* 2. 어드민 알림 생성 */
  try {
    const { data: admins } = await service
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      await service.from('notifications').insert(
        admins.map((a: { id: string }) => ({
          user_id:   a.id,
          type:      'new_company_request',
          title:     '기업 가입신청',
          message:   `${company_name} (담당자: ${admin_name} / ${admin_email}) 가입신청이 접수되었습니다.`,
          target_id: String(request.id),
          is_read:   false,
        }))
      )
    }
  } catch (e) {
    console.warn('[company-request] 어드민 알림 생성 실패:', e)
  }

  return NextResponse.json({ success: true })
}
