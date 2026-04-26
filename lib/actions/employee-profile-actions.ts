'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ProfileUpdateResult =
  | { success: true }
  | { success: false; error: string }

const PHONE_RE = /^[0-9\-\s+()]{0,20}$/

export async function updateEmployeeProfile(data: {
  phoneNumber: string
}): Promise<ProfileUpdateResult> {
  const supabase = createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { success: false, error: '인증이 필요합니다' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'employee')
    return { success: false, error: '권한이 없습니다' }

  if (!profile.company_id)
    return { success: false, error: '소속 회사 정보가 없습니다' }

  const phoneNumber = data.phoneNumber.trim()
  if (phoneNumber && !PHONE_RE.test(phoneNumber))
    return { success: false, error: '전화번호는 숫자, -, + 만 입력 가능합니다' }

  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!emp) return { success: false, error: '직원 정보를 찾을 수 없습니다' }

  const { error: empErr } = await supabase
    .from('employees')
    .update({ Tel: phoneNumber || null })
    .eq('id', emp.id)

  if (empErr) return { success: false, error: '저장 중 오류가 발생했습니다' }

  revalidatePath('/employee/profile')
  return { success: true }
}
