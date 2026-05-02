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

  // approve — DB 함수 호출
  const { data, error } = await supabaseAdmin
    .rpc('approve_company_request', { request_id: requestId })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // biz_doc_url을 companies 테이블에 복사
  try {
    const { data: reqRow } = await supabaseAdmin
      .from('company_admin_requests')
      .select('biz_doc_url, biz_number')
      .eq('id', requestId)
      .maybeSingle()

    if (reqRow?.biz_doc_url) {
      await supabaseAdmin
        .from('companies')
        .update({ biz_doc_url: reqRow.biz_doc_url })
        .eq('biz_number', reqRow.biz_number)
    }
  } catch (e) {
    console.warn('[approve-request] biz_doc_url 복사 실패:', e)
  }

  return NextResponse.json({ success: true, ...data })
}
