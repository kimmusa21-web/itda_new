'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function serviceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function getAdminUser() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

export async function approveWithdrawal(
  requestId: number,
): Promise<{ success: boolean; error?: string }> {
  const user = await getAdminUser()
  if (!user) return { success: false, error: '어드민 권한이 필요합니다' }

  const service = serviceClient()

  const { data: request } = await service
    .from('company_withdrawal_requests')
    .select('company_id')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (!request) return { success: false, error: '대기 중인 신청이 아닙니다' }

  const { error: companyErr } = await service
    .from('companies')
    .update({ status: 'withdrawn', withdrawn_at: new Date().toISOString() })
    .eq('id', request.company_id)

  if (companyErr) return { success: false, error: '회사 상태 변경 실패: ' + companyErr.message }

  await service
    .from('company_withdrawal_requests')
    .update({
      status:      'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', requestId)

  // 해당 회사 소속 모든 Auth 계정 비활성화 (manager + employees)
  // profiles와 employees를 모두 조회해 누락 방지
  const [{ data: profileMembers }, { data: employeeMembers }] = await Promise.all([
    service.from('profiles').select('id').eq('company_id', request.company_id),
    service.from('employees').select('user_id').eq('company_id', request.company_id).not('user_id', 'is', null),
  ])

  const userIds = new Set<string>([
    ...(profileMembers  ?? []).map((m: { id: string }) => m.id),
    ...(employeeMembers ?? []).filter((e: { user_id: string | null }) => e.user_id).map((e: { user_id: string }) => e.user_id),
  ])

  if (userIds.size > 0) {
    await Promise.all(
      [...userIds].map(id => service.auth.admin.updateUserById(id, { ban_duration: '87600h' })),
    )
  }

  revalidatePath('/admin/companies')
  revalidatePath('/admin/companies/withdrawn')
  revalidatePath('/admin/requests')
  return { success: true }
}

export async function rejectWithdrawal(
  requestId: number,
): Promise<{ success: boolean; error?: string }> {
  const user = await getAdminUser()
  if (!user) return { success: false, error: '어드민 권한이 필요합니다' }

  const service = serviceClient()

  await service
    .from('company_withdrawal_requests')
    .update({
      status:      'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', requestId)

  revalidatePath('/admin/requests')
  return { success: true }
}
