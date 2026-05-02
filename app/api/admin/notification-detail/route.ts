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

export async function GET(req: Request) {
  /* 인증 확인 */
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const type     = searchParams.get('type')
  const targetId = searchParams.get('target_id')

  if (!type || !targetId) {
    return NextResponse.json({ error: 'type, target_id 필수' }, { status: 400 })
  }

  const service = serviceClient()

  /* ── 기업 가입신청 ───────────────────────────────────────────── */
  if (type === 'new_company_request') {
    const { data, error } = await service
      .from('company_admin_requests')
      .select('*')
      .eq('id', targetId)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data)  return NextResponse.json({ error: '데이터 없음' }, { status: 404 })
    return NextResponse.json({ type, data })
  }

  /* ── 신규 직원 등록 ──────────────────────────────────────────── */
  if (type === 'new_employee_registered') {
    const { data, error } = await service
      .from('employees')
      .select(`
        id, name, email, department, position, job, Date_of_joining,
        salary_type, salary_amount, salary_basis,
        is_contract, weekly_work_hours,
        companies ( name )
      `)
      .eq('id', targetId)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data)  return NextResponse.json({ error: '데이터 없음' }, { status: 404 })
    return NextResponse.json({ type, data })
  }

  /* ── 퇴사 통보 ───────────────────────────────────────────────── */
  if (type === 'employee_resignation') {
    const { data, error } = await service
      .from('employees')
      .select(`
        id, name, email, department, position,
        Date_of_joining, resignation_date,
        companies ( name )
      `)
      .eq('id', targetId)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data)  return NextResponse.json({ error: '데이터 없음' }, { status: 404 })
    return NextResponse.json({ type, data })
  }

  return NextResponse.json({ error: '지원하지 않는 알림 유형' }, { status: 400 })
}
