/* ================================================================
   POST /api/auth/complete-invite
   초대 링크 기반 가입 완료 처리 (사번 기준 개별 계정)

   Body: { token: string, password: string }

   처리 순서:
     1. 입력값 검증
     2. employee_invites 조회 (service_role)
     3. 만료/사용 여부 확인
     4. employees 레코드 조회
     5. 이미 연결된 계정이면 비밀번호만 갱신, 아니면 emp{id}@itda.internal 로 신규 생성
     6. employees user_id 연결 + is_active=true
     7. profiles upsert (실제 이메일 보관)
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

  /* ── 5. employee 레코드 조회 ──────────────────────────────── */
  if (!invite.employee_id) {
    console.error('[complete-invite] employee_id 없는 초대 — 처리 불가:', invite.id)
    return NextResponse.json(
      { error: '초대 정보가 올바르지 않습니다. 관리자에게 문의하세요.' },
      { status: 400 },
    )
  }

  const { data: employeeRow, error: empFetchErr } = await supabaseAdmin
    .from('employees')
    .select('id, name, department, position, company_id, user_id')
    .eq('id', invite.employee_id)
    .maybeSingle()

  if (empFetchErr) {
    console.error('[complete-invite] employees 조회 오류:', empFetchErr.message)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }

  if (!employeeRow) {
    console.error('[complete-invite] employee 레코드 없음:', invite.employee_id)
    return NextResponse.json(
      { error: '직원 정보를 찾을 수 없습니다. 관리자에게 문의하세요.' },
      { status: 404 },
    )
  }

  /* ── 6. 사번 기반 synthetic 이메일 — 이 employee 레코드에만 귀속 ── */
  // 동일인이 타사에 재입사해도 다른 employees.id → 다른 계정이 생성됨
  const syntheticEmail = `emp${employeeRow.id}@itda.internal`

  /* ── 7. 계정 생성 또는 재초대(비밀번호 갱신) ─────────────── */
  let authUserId: string

  if (employeeRow.user_id) {
    // 재초대: 이미 가입 완료된 직원에게 재발송된 경우 → 비밀번호만 갱신
    authUserId = employeeRow.user_id
    const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, { password })
    if (pwErr) {
      console.error('[complete-invite] 비밀번호 갱신 실패:', pwErr.message)
      return NextResponse.json(
        { error: '계정 처리 중 오류가 발생했습니다. 관리자에게 문의하세요.' },
        { status: 500 },
      )
    }
    console.log(`[complete-invite] 재초대 — 비밀번호 갱신 (authUserId=${authUserId})`)
  } else {
    // 신규 가입: synthetic 이메일로 새 Auth 계정 생성 (이메일 중복 없음)
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email:         syntheticEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name:       invite.name,
        company_id: invite.company_id,
      },
    })

    if (authError) {
      console.error('[complete-invite] Auth 계정 생성 실패:', authError.message)
      return NextResponse.json(
        { error: '계정 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 500 },
      )
    }

    authUserId = newUser!.user.id
    console.log(`[complete-invite] 신규 계정 생성: ${syntheticEmail} (authUserId=${authUserId})`)
  }

  /* ── 8. employees 연결 ────────────────────────────────────── */
  const { error: empUpdateErr } = await supabaseAdmin
    .from('employees')
    .update({ user_id: authUserId, is_active: true })
    .eq('id', employeeRow.id)

  if (empUpdateErr) {
    console.error('[complete-invite] employees 업데이트 실패:', empUpdateErr.message)
  } else {
    console.log(`[complete-invite] employees 연결: id=${employeeRow.id}`)
  }

  /* ── 9. profiles upsert (실제 이메일 저장) ────────────────── */
  const { error: profileErr } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id:         authUserId,
        email:      normalizedEmail,          // 실제 이메일 보관 (로그인 UI 표시용)
        name:       invite.name || (employeeRow.name ?? normalizedEmail),
        role:       'employee',
        company_id: invite.company_id,
        department: employeeRow.department ?? null,
        position:   employeeRow.position   ?? null,
      },
      { onConflict: 'id' },
    )

  if (profileErr) {
    console.error('[complete-invite] profiles upsert 실패:', profileErr.message)
  }

  /* ── 10. 초대 토큰 사용 완료 ───────────────────────────────── */
  const { error: markUsedErr } = await supabaseAdmin
    .from('employee_invites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)

  if (markUsedErr) {
    console.error('[complete-invite] used_at 업데이트 실패:', markUsedErr.message)
  }

  console.log(`[complete-invite] 완료: ${normalizedEmail} → ${syntheticEmail} (authUserId=${authUserId})`)

  return NextResponse.json({
    success: true,
    message: '가입이 완료되었습니다. 이제 로그인하세요.',
  })
}
