'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface EmployeeEditInput {
  name:            string
  phone:           string
  birthdate:       string
  gender:          string
  department:      string
  position:        string
  grade:           string
  roleTitle:       string
  job:             string
  workLocation:    string
  joinDate:        string
  isContract:       boolean
  contractEndDate:  string
  weeklyWorkHours:  string
  isForeigner:      boolean
  nationality:      string
  visaType:         string
}

export type EmployeeEditResult = { success: true } | { success: false; error: string }

export async function updateEmployeeByManager(
  employeeId: number,
  data: EmployeeEditInput,
): Promise<EmployeeEditResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role ?? ''))
    return { success: false, error: '권한이 없습니다' }

  // manager는 본인 회사 직원만 수정 가능
  const { data: emp } = await supabase
    .from('employees')
    .select('id, company_id')
    .eq('id', employeeId)
    .single()

  if (!emp) return { success: false, error: '직원을 찾을 수 없습니다' }

  if (profile.role === 'manager' && emp.company_id !== profile.company_id)
    return { success: false, error: '본인 소속 회사의 직원만 수정할 수 있습니다' }

  const { error } = await supabase
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
      job:               data.job          || null,
      'Working place':   data.workLocation || null,
      Date_of_joining:   data.joinDate     || null,
      is_contract:        data.isContract,
      contract_end_date:  data.contractEndDate || null,
      weekly_work_hours:  data.weeklyWorkHours ? Number(data.weeklyWorkHours) : null,
      is_foreigner:       data.isForeigner,
      nationality:        data.nationality || null,
      visa_type:          data.visaType || null,
    })
    .eq('id', employeeId)

  if (error) return { success: false, error: '저장 실패: ' + error.message }

  revalidatePath('/manager/employees')
  revalidatePath('/admin/employees')
  return { success: true }
}
