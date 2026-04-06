import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    // 1. 어드민 권한 확인
    const supabaseClient = createServerClient()
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

    const { data: profile } = await supabaseClient
      .from('profiles').select('role').eq('id', user.id).single()
    if (!['admin', 'manager'].includes(profile?.role ?? ''))
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

    // 2. 요청 파싱
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: '요청 형식이 올바르지 않습니다' }, { status: 400 })

    const { employeeId, email, name } = body as { employeeId: number; email: string; name: string }
    if (!employeeId || !email) return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })

    // 3. Service Role Key 확인
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[invite-employee] SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다')
      return NextResponse.json(
        { error: '서버 설정 오류: 관리자에게 문의하세요 (SERVICE_ROLE_KEY 미설정)' },
        { status: 500 },
      )
    }

    // 4. Service Role Client (Admin API 사용)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // 5. 초대 이메일 발송 (Supabase Auth)
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { name, employee_id: employeeId },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/reset-password`,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 6. employees.user_id 업데이트
    await supabaseAdmin
      .from('employees')
      .update({ user_id: data.user.id })
      .eq('id', employeeId)

    // 7. profiles 생성
    const { data: emp } = await supabaseAdmin
      .from('employees').select('company_id').eq('id', employeeId).single()

    await supabaseAdmin.from('profiles').upsert({
      id: data.user.id,
      email,
      name,
      role: 'employee',
      company_id: emp?.company_id,
    }, { onConflict: 'id' })

    return NextResponse.json({ success: true, userId: data.user.id })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '알 수 없는 오류'
    console.error('[invite-employee] 오류:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
