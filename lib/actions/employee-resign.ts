'use server'

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function serviceClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export interface ResignInput {
  quitDate:          string
  quitReason:        string
  unemploymentClaim: boolean
  unemploymentCode:  string
}

export async function resignEmployee(
  employeeId: number,
  input: ResignInput,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role ?? ''))
    return { success: false, error: '권한이 없습니다' }

  if (!input.quitDate) return { success: false, error: '퇴사일은 필수입니다' }

  const service = serviceClient()

  const { data: emp } = await service
    .from('employees')
    .select('id, name, email, company_id, is_active, companies(name)')
    .eq('id', employeeId)
    .single()

  if (!emp) return { success: false, error: '직원을 찾을 수 없습니다' }
  if (!emp.is_active) return { success: false, error: '이미 퇴사 처리된 직원입니다' }

  if (profile.role === 'manager' && emp.company_id !== profile.company_id)
    return { success: false, error: '본인 소속 회사의 직원만 처리할 수 있습니다' }

  const { error } = await service
    .from('employees')
    .update({
      is_active:          false,
      quit_date:          input.quitDate,
      quit_reason:        input.quitReason   || null,
      unemployment_claim: input.unemploymentClaim,
      unemployment_code:  input.unemploymentClaim ? (input.unemploymentCode || null) : null,
    })
    .eq('id', employeeId)

  if (error) return { success: false, error: '퇴사 처리 실패: ' + error.message }

  revalidatePath('/manager/employees')
  revalidatePath('/manager/employees/resigned')
  revalidatePath('/admin/employees')
  revalidatePath('/admin/employees/resigned')
  revalidatePath('/admin/requests')

  try {
    const companyName = (emp.companies as any)?.name ?? '회사'
    const { data: admins } = await service
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      await service.from('notifications').insert(
        admins.map((a: { id: string }) => ({
          user_id:   a.id,
          type:      'employee_resignation',
          title:     '직원 퇴사 통보',
          message:   `[${companyName}] ${emp.name}(${emp.email}) 퇴사일: ${input.quitDate}`,
          target_id: String(employeeId),
          is_read:   false,
        }))
      )
    }
  } catch (e) {
    console.warn('[resignEmployee] 어드민 알림 생성 실패:', e)
  }

  return { success: true }
}
