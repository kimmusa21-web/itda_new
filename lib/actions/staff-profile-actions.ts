'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface StaffProfileInput {
  name:          string
  phone:         string
  birthdate:     string
  gender:        string
  department:    string
  position:      string
  grade:         string
  roleTitle:     string
  job:           string
  workLocation:  string
}

export type StaffProfileResult = { success: true } | { success: false; error: string }

export async function updateStaffProfile(data: StaffProfileInput): Promise<StaffProfileResult> {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { success: false, error: '인증이 필요합니다' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role ?? ''))
    return { success: false, error: '권한이 없습니다' }

  const { error: profErr } = await supabase
    .from('profiles')
    .update({
      name:       data.name.trim(),
      department: data.department || null,
      position:   data.position   || null,
    })
    .eq('id', user.id)

  if (profErr) return { success: false, error: '프로필 저장 실패: ' + profErr.message }

  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (emp) {
    const { error: empErr } = await supabase
      .from('employees')
      .update({
        name:            data.name.trim(),
        Tel:             data.phone        || null,
        birthdate:       data.birthdate    || null,
        Sex:             data.gender       || null,
        department:      data.department   || null,
        position:        data.position     || null,
        Grade:           data.grade        || null,
        Role:            data.roleTitle    || null,
        job:             data.job          || null,
        'Working place': data.workLocation || null,
      })
      .eq('id', emp.id)

    if (empErr) return { success: false, error: '직원 정보 저장 실패: ' + empErr.message }
  }

  revalidatePath('/admin/profile')
  revalidatePath('/manager/profile')
  return { success: true }
}

export async function changePassword(newPassword: string): Promise<StaffProfileResult> {
  if (!newPassword || newPassword.length < 8)
    return { success: false, error: '비밀번호는 8자 이상이어야 합니다' }

  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { success: false, error: error.message }
  return { success: true }
}
