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
