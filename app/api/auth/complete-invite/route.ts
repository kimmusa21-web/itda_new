/* ================================================================
   POST /api/auth/complete-invite
   초대 링크 기반 가입 완료 처리

   Body: { token: string, password: string }

   처리 순서:
     1. 입력값 검증
     2. employee_invites 조회 (service_role)
     3. 만료/사용 여부 확인
     4. 이미 가입된 이메일 중복 확인
     5. Supabase Auth 계정 생성 (admin.createUser)
     6. employees 조회 + user_id 연결 + is_active=true
     7. profiles upsert
     8. employee_invites.used_at 업데이트
================================================================ */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  /* ── 1. 파싱 ──────────────────────────────────────────────── */
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다' }, { status: 400 })
  }

  const { token, password } = body as { token?: string; password?: string }

  if (!token?.trim()) {
    return NextResponse.json({ error: '초대 토큰이 없습니다' }, { status: 400 })
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다' }, { status: 400 })
  }

  /* ── 2. service_role 클라이언트 ───────────────────────────── */
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[complete-invite] SUPABASE_SERVICE_ROLE_KEY 미설정')
    return NextResponse.json({ error: '서버 설정 오류. 관리자에게 문의하세요.' }, { status: 500 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  /* ── 3. 초대 토큰 조회 ────────────────────────────────────── */
  const { data: invite, error: inviteErr } = await supabaseAdmin
    .from('employee_invites')
    .select('id, company_id, employee_id, email, name, expires_at, used_at')
    .eq('token', token.trim())
    .maybeSingle()

  if (inviteErr) {
    console.error('[complete-invite] DB 조회 오류:', inviteErr.message)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }

  if (!invite) {
    return NextResponse.json(
      { error: '유효하지 않은 초대 링크입니다. 이메일에서 링크를 다시 확인해주세요.' },
      { status: 404 },
    )
  }

  /* ── 4. 사용/만료 확인 ────────────────────────────────────── */
  if (invite.used_at) {
    return NextResponse.json(
      { error: '이미 사용된 초대 링크입니다. 기존 계정으로 로그인하세요.' },
      { status: 409 },
    )
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json(
      { error: '초대 링크가 만료되었습니다. 담당자에게 재발송을 요청하세요.' },
      { status: 410 },
    )
  }

  const normalizedEmail = invite.email.trim().toLowerCase()

  /* ── 5. Supabase Auth 계정 생성 ───────────────────────────── */
  // createUser가 이미 존재하는 이메일이면 에러 반환 → 에러 메시지로 구분
  const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email:         normalizedEmail,
    password,
    email_confirm: true,           // 이미 이메일 초대로 인증됨 → 자동 확인
    user_metadata: {
      name:       invite.name,
      company_id: invite.company_id,
    },
  })

  let authUserId: string

  if (authError) {
    const isConflict =
      authError.message.toLowerCase().includes('already been registered') ||
      authError.message.toLowerCase().includes('already exists') ||
      authError.message.toLowerCase().includes('duplicate') ||
      authError.status === 422

    if (!isConflict) {
      console.error('[complete-invite] Auth 계정 생성 실패:', authError.message)
      return NextResponse.json(
        { error: '계정 생성 중 오류가 발생했습니다: ' + authError.message },
        { status: 500 },
      )
    }

    // 재입사 케이스: 이미 Auth 계정이 존재 → 기존 계정을 새 employee 레코드에 연결
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (!existingProfile) {
      return NextResponse.json(
        { error: '이미 가입된 이메일입니다. 로그인하거나 비밀번호 재설정을 이용하세요.' },
        { status: 409 },
      )
    }

    // 기존 auth user_id로 새 employee 레코드 연결
    authUserId = existingProfile.id
    console.log(`[complete-invite] 재입사 처리: 기존 계정 재사용 (authUserId=${authUserId})`)
  } else {
    authUserId = newUser!.user.id
  }

  /* ── 7. employees 연결 ────────────────────────────────────── */
  // 우선순위: invite.employee_id(직접 초대) → company_id+email 매칭(승인 플로우 fallback)
  let employeeRow: { id: number; name: string; department: string | null; position: string | null; company_id: number } | null = null

  if (invite.employee_id) {
    // 직접 초대 플로우: employee_id로 직접 연결
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('id, name, department, position, company_id')
      .eq('id', invite.employee_id)
      .is('user_id', null)
      .maybeSingle()
    if (error) console.error('[complete-invite] employees 조회(id) 오류:', error.message)
    employeeRow = data ?? null
  } else {
    // 기존 승인 플로우 fallback: company_id + email 매칭
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('id, name, department, position, company_id')
      .eq('company_id', invite.company_id)
      .ilike('email', normalizedEmail)
      .is('user_id', null)
      .maybeSingle()
    if (error) console.error('[complete-invite] employees 조회(email) 오류:', error.message)
    employeeRow = data ?? null
  }

  if (employeeRow) {
    const { error: empUpdateErr } = await supabaseAdmin
      .from('employees')
      .update({ user_id: authUserId, is_active: true })
      .eq('id', employeeRow.id)

    if (empUpdateErr) {
      console.error('[complete-invite] employees 업데이트 실패:', empUpdateErr.message)
    } else {
      console.log(`[complete-invite] employees 연결: id=${employeeRow.id}`)
    }
  } else {
    console.warn(`[complete-invite] employees 행 없음 or 이미 연결됨: ${normalizedEmail} / company_id=${invite.company_id}`)
  }

  /* ── 8. profiles upsert ───────────────────────────────────── */
  const { error: profileErr } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id:         authUserId,
        email:      normalizedEmail,
        name:       invite.name || (employeeRow?.name ?? normalizedEmail),
        role:       'employee',
        company_id: invite.company_id,
        department: employeeRow?.department ?? null,
        position:   employeeRow?.position ?? null,
      },
      { onConflict: 'id' },
    )

  if (profileErr) {
    console.error('[complete-invite] profiles upsert 실패:', profileErr.message)
    // 계정 생성은 성공했으므로 에러를 반환하지 않고 로그만 남김
  }

  /* ── 9. 초대 토큰 사용 완료 표시 ─────────────────────────── */
  const { error: markUsedErr } = await supabaseAdmin
    .from('employee_invites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)

  if (markUsedErr) {
    console.error('[complete-invite] used_at 업데이트 실패:', markUsedErr.message)
  }

  console.log(`[complete-invite] 가입 완료: ${normalizedEmail} (authUserId=${authUserId})`)

  return NextResponse.json({
    success: true,
    message: '가입이 완료되었습니다. 이제 로그인하세요.',
  })
}
