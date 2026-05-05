'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function serviceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/* ================================================================
   transferManagerRole — 기존 직원에게 매니저 권한 이전 (어드민 전용)
   대상 직원은 앱 계정(user_id)이 있어야 함
================================================================ */
export async function transferManagerRole(
  companyId: number,
  employeeId: number,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { success: false, error: '어드민 권한이 필요합니다' }

  const service = serviceClient()

  const { data: emp } = await service
    .from('employees')
    .select('user_id, name, is_active, company_id')
    .eq('id', employeeId)
    .single()

  if (!emp)             return { success: false, error: '직원을 찾을 수 없습니다' }
  if (emp.company_id !== companyId) return { success: false, error: '해당 기업 소속 직원이 아닙니다' }
  if (!emp.is_active)   return { success: false, error: '퇴사한 직원에게는 권한을 부여할 수 없습니다' }
  if (!emp.user_id)     return { success: false, error: '해당 직원은 아직 앱 계정이 없습니다. 먼저 초대를 완료해주세요.' }

  // service role로 실행 → profiles_protect_sensitive_fields 트리거 우회
  const { error } = await service
    .from('profiles')
    .update({ role: 'manager', company_id: companyId })
    .eq('id', emp.user_id)

  if (error) return { success: false, error: '권한 변경 실패: ' + error.message }

  revalidatePath(`/admin/companies/${companyId}`)
  return { success: true }
}
