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

  /* ── 5. Supabase Auth 계정 생성 (또는 이직/재입사 처리) ──────── */
  const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email:         normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      name:       invite.name,
      company_id: invite.company_id,
    },
  })

  let authUserId: string

  if (authError) {
    // createUser 실패 시 → 이메일 중복 여부와 무관하게 기존 계정 조회
    // (Supabase 에러 메시지 패턴에 의존하지 않고 직접 확인)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (!existingProfile) {
      // 기존 계정도 없는데 createUser도 실패 → 진짜 서버 오류
      console.error('[complete-invite] Auth 계정 생성 실패:', authError.message)
      return NextResponse.json(
        { error: '계정 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 500 },
      )
    }

    // 이직/재입사: 기존 계정을 새 회사 employee 레코드에 연결
    // 초대 폼에서 입력한 비밀번호로 갱신 (기존 비밀번호 덮어쓰기)
    authUserId = existingProfile.id
    await supabaseAdmin.auth.admin.updateUserById(authUserId, { password })
    console.log(`[complete-invite] 이직/재입사 처리: 기존 계정 재사용 (authUserId=${authUserId})`)
  } else {
    authUserId = newUser!.user.id
  }

  /* ── 7. employees 연결 ────────────────────────────────────── */
  // 사번 기준 관리: 반드시 employee_id로만 연결 (이메일 매칭 제거)
  // 재입사 시 새 사번의 새 레코드가 employee_id로 명확히 지정되어야 함
  let employeeRow: { id: number; name: string; department: string | null; position: string | null; company_id: number } | null = null

  if (invite.employee_id) {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('id, name, department, position, company_id')
      .eq('id', invite.employee_id)
      .is('user_id', null)
      .maybeSingle()
    if (error) console.error('[complete-invite] employees 조회 오류:', error.message)
    employeeRow = data ?? null
  } else {
    // employee_id 없는 레거시 초대는 연결 스킵 (이메일 매칭 불가 — 사번 기준 관리)
    console.warn('[complete-invite] employee_id 없는 초대 — 직원 레코드 연결 생략:', invite.id)
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
