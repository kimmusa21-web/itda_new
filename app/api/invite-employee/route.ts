import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  // 1. 어드민 권한 확인
  const supabaseClient = createServerClient()
  const { data: { user } } = await supabaseClient.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data: profile } = await supabaseClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.role ?? ''))
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

  // 2. 요청 파싱
  const body = await req.json()
  const { employeeId, email, name } = body as { employeeId: number; email: string; name: string }
  if (!employeeId || !email) return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })

  // 3. Service Role Client (Admin API 사용)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 4. 초대 이메일 발송 (Supabase Auth)
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { name, employee_id: employeeId },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/reset-password`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 5. employees.user_id 업데이트 (트리거가 처리하지만 선제 업데이트)
  await supabaseAdmin
    .from('employees')
    .update({ user_id: data.user.id })
    .eq('id', employeeId)

  // 6. profiles 생성
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
}
