import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabaseClient = createServerClient()
  const { data: { user } } = await supabaseClient.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data: profile } = await supabaseClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin')
    return NextResponse.json({ error: '어드민 권한이 필요합니다' }, { status: 403 })

  const { requestId, action, rejectReason } = await req.json()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  if (action === 'reject') {
    await supabaseAdmin
      .from('company_admin_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reject_reason: rejectReason })
      .eq('id', requestId)
    return NextResponse.json({ success: true })
  }

  // ── 승인 처리 ──────────────────────────────────────────────────
  const { data: request, error: reqErr } = await supabaseAdmin
    .from('company_admin_requests')
    .select('*')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (reqErr || !request)
    return NextResponse.json({ error: '대기중인 신청서가 아닙니다' }, { status: 404 })

  // 동일 사업자번호 회사가 이미 있는지 확인 (soft-delete 포함)
  const { data: existingCompany } = await supabaseAdmin
    .from('companies')
    .select('id')
    .eq('biz_number', request.biz_number)
    .maybeSingle()

  let companyId: number

  if (existingCompany) {
    // 기존 회사 재활성화 및 정보 업데이트
    const { error: updateErr } = await supabaseAdmin
      .from('companies')
      .update({
        name:           request.company_name,
        representative: request.representative  ?? null,
        business_type:  request.business_type   ?? null,
        industry_type:  request.industry         ?? null,
        telephone:      request.telephone        ?? null,
        address:        request.address          ?? null,
        status:         'active',
        deleted_at:     null,
        ...(request.biz_doc_url ? { biz_doc_url: request.biz_doc_url } : {}),
      })
      .eq('id', existingCompany.id)

    if (updateErr)
      return NextResponse.json({ error: '회사 정보 업데이트 실패: ' + updateErr.message }, { status: 500 })

    companyId = existingCompany.id
  } else {
    // 신규 회사 생성
    const { data: newCompany, error: insertErr } = await supabaseAdmin
      .from('companies')
      .insert({
        name:           request.company_name,
        biz_number:     request.biz_number,
        representative: request.representative  ?? null,
        business_type:  request.business_type   ?? null,
        industry_type:  request.industry         ?? null,
        telephone:      request.telephone        ?? null,
        address:        request.address          ?? null,
        status:         'active',
        biz_doc_url:    request.biz_doc_url      ?? null,
      })
      .select('id')
      .single()

    if (insertErr || !newCompany)
      return NextResponse.json({ error: '회사 생성 실패: ' + insertErr?.message }, { status: 500 })

    companyId = newCompany.id
  }

  // 신청서 승인 완료 처리
  await supabaseAdmin
    .from('company_admin_requests')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', requestId)

  // ── 신청자를 매니저로 초대 ──────────────────────────────────────
  let managerInvited = false
  if (request.admin_email) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        request.admin_email,
        {
          data: {
            name:       request.admin_name ?? request.admin_email.split('@')[0],
            role:       'manager',
            company_id: String(companyId),
          },
          redirectTo: `${appUrl}/reset-password`,
        }
      )

      if (inviteData?.user?.id) {
        // 트리거가 company_id를 누락할 수 있으므로 upsert로 보정
        await supabaseAdmin.from('profiles').upsert(
          {
            id:         inviteData.user.id,
            email:      request.admin_email,
            name:       request.admin_name ?? '',
            role:       'manager',
            company_id: companyId,
          },
          { onConflict: 'id' }
        )
        managerInvited = true
      } else if (inviteErr) {
        // 이미 계정이 있는 경우 — profiles 에서 찾아 권한 업데이트
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', request.admin_email)
          .maybeSingle()

        if (existingProfile) {
          await supabaseAdmin
            .from('profiles')
            .update({ role: 'manager', company_id: companyId })
            .eq('id', existingProfile.id)
          managerInvited = true
        } else {
          console.warn('[approve-request] 매니저 초대 실패:', inviteErr.message)
        }
      }
    } catch (e) {
      console.warn('[approve-request] 매니저 설정 오류:', e)
    }
  }

  return NextResponse.json({
    success: true,
    company_id:      companyId,
    company_name:    request.company_name,
    manager_invited: managerInvited,
  })
}
