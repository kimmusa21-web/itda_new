/* ================================================================
   POST /api/employee-verify
   직원 인증번호 검증 + Supabase Auth 계정 생성

   Body: { email: string, code: string, password: string }

   처리 순서:
     1. 입력값 검증
     2. employee_verification_codes 최신 코드 조회
     3. 만료 여부 확인
     4. SHA-256 해시 비교
     5. Supabase Auth 계정 생성 (service_role)
     6. employees.user_id 연결 + is_active=true
     7. profiles 생성
     8. verification_code verified_at 업데이트
================================================================ */

import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다' }, { status: 400 })
  }

  const { email, code, password } = body as {
    email?: string
    code?: string
    password?: string
  }

  // ── 1. 입력 검증 ──────────────────────────────────────────
  if (!email?.trim()) return NextResponse.json({ error: '이메일을 입력해주세요' }, { status: 400 })
  if (!code?.trim())  return NextResponse.json({ error: '인증번호를 입력해주세요' }, { status: 400 })
  if (!password || password.length < 8)
    return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다' }, { status: 400 })

  const normalizedEmail = email.trim().toLowerCase()
  const trimmedCode     = code.trim()

  // ── 2. service_role 클라이언트 ────────────────────────────
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // ── 3. 인증코드 조회 (미사용 + 최신) ──────────────────────
  const { data: verCodes, error: codeErr } = await supabaseAdmin
    .from('employee_verification_codes')
    .select(`
      id, request_id, email, code_hash, expires_at, verified_at, created_at,
      employee_requests (
        id, name, email, company_id, phone, department, position
      )
    `)
    .eq('email', normalizedEmail)
    .is('verified_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (codeErr) {
    console.error('[employee-verify] DB 조회 오류:', codeErr.message)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }

  if (!verCodes || verCodes.length === 0) {
    return NextResponse.json(
      { error: '유효한 인증번호가 없습니다. 어드민에게 재발송을 요청하세요.' },
      { status: 404 },
    )
  }

  const verCode = verCodes[0]

  // Supabase 중첩 select는 배열로 반환됨 → 첫 번째 요소 추출
  type EmployeeRequestRef = {
    id: number; name: string; email: string; company_id: number
    phone: string | null; department: string | null; position: string | null
  }
  const rawRef = verCode.employee_requests
  const employeeRequest: EmployeeRequestRef | null = Array.isArray(rawRef)
    ? (rawRef[0] as unknown as EmployeeRequestRef) ?? null
    : (rawRef as unknown as EmployeeRequestRef) ?? null

  // ── 4. 만료 확인 ──────────────────────────────────────────
  if (new Date(verCode.expires_at) < new Date()) {
    return NextResponse.json(
      { error: '인증번호가 만료되었습니다. 어드민에게 재발송을 요청하세요.' },
      { status: 400 },
    )
  }

  // ── 5. 해시 비교 ──────────────────────────────────────────
  if (verCode.code_hash !== hashCode(trimmedCode)) {
    return NextResponse.json(
      { error: '인증번호가 올바르지 않습니다. 다시 확인해주세요.' },
      { status: 400 },
    )
  }

  // ── 6. 연결된 가입신청 확인 ───────────────────────────────
  if (!employeeRequest) {
    return NextResponse.json({ error: '연결된 가입 신청을 찾을 수 없습니다' }, { status: 404 })
  }

  // ── 7. Supabase Auth 계정 생성 ────────────────────────────
  // createUser는 이미 존재하면 에러 반환 → 에러 핸들링으로 처리
  let authUserId: string

  const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email:         normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      name:        employeeRequest.name,
      employee_id: verCode.request_id,
    },
  })

  if (authError) {
    // 이미 존재하는 계정인 경우 → 에러 처리
    const alreadyExists =
      authError.message.includes('already been registered') ||
      authError.message.includes('already exists') ||
      authError.message.includes('duplicate')

    if (alreadyExists) {
      return NextResponse.json(
        { error: '이미 가입된 이메일입니다. 로그인하거나 비밀번호 재설정을 이용하세요.' },
        { status: 409 },
      )
    }

    console.error('[employee-verify] Auth 계정 생성 실패:', authError.message)
    return NextResponse.json(
      { error: '계정 생성 중 오류가 발생했습니다: ' + authError.message },
      { status: 500 },
    )
  }

  authUserId = newUser.user.id

  // ── 8. employees 업데이트 (user_id 연결 + is_active=true) ─
  const { data: employeeRow } = await supabaseAdmin
    .from('employees')
    .select('id')
    .eq('email', normalizedEmail)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()   // single() 대신 maybeSingle() — 없어도 에러 아님

  if (employeeRow) {
    const { error: empUpdateErr } = await supabaseAdmin
      .from('employees')
      .update({ user_id: authUserId, is_active: true })
      .eq('id', employeeRow.id)

    if (empUpdateErr) {
      console.error('[employee-verify] employees 업데이트 실패:', empUpdateErr.message)
    }
  }

  // ── 9. profiles 생성/업데이트 ─────────────────────────────
  const { error: profileErr } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id:         authUserId,
        email:      normalizedEmail,
        name:       employeeRequest.name,
        role:       'employee',
        company_id: employeeRequest.company_id,
        phone:      employeeRequest.phone ?? null,
        department: employeeRequest.department ?? null,
        position:   employeeRequest.position ?? null,
      },
      { onConflict: 'id' },
    )

  if (profileErr) {
    console.error('[employee-verify] profiles 생성 실패:', profileErr.message)
  }

  // ── 10. 인증코드 사용 완료 표시 ──────────────────────────
  await supabaseAdmin
    .from('employee_verification_codes')
    .update({ verified_at: new Date().toISOString() })
    .eq('id', verCode.id)

  console.log(`[employee-verify] 인증 완료: ${normalizedEmail} (userId=${authUserId})`)

  return NextResponse.json({
    success: true,
    message: '가입이 완료되었습니다. 이제 로그인하세요.',
  })
}
