'use server'
/* ================================================================
   itda — 어드민 직접 직원 생성 Server Action
   사번 자동 생성 포함 (사용자 입력 금지)
================================================================ */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { generateUniqueEmployeeNumber } from '@/lib/employee-number'

function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY 미설정')
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export interface CreateEmployeeAdminInput {
  company_id: number
  name: string
  email: string
  birthdate?: string | null
  department?: string | null
  position?: string | null
  job?: string | null
  Grade?: string | null
  Role?: string | null
  Tel?: string | null
  Sex?: string | null
  Date_of_joining?: string | null
  'Working place'?: string | null
  'Work details'?: string | null
  is_active?: boolean
  is_contract?: boolean
  contract_end_date?: string | null
}

export async function createEmployeeAdmin(
  input: CreateEmployeeAdminInput,
): Promise<{ success: boolean; error?: string }> {
  /* 1. 인증 */
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { success: false, error: '어드민 권한이 필요합니다' }

  /* 2. 사번 자동 생성 */
  let employeeNumber: string | null = null
  const { data: company } = await supabase
    .from('companies')
    .select('biz_number')
    .eq('id', input.company_id)
    .single()

  if (!company) return { success: false, error: '회사 정보를 찾을 수 없습니다' }

  if (company.biz_number) {
    try {
      employeeNumber = await generateUniqueEmployeeNumber(
        supabase,
        company.biz_number,
        input.Date_of_joining ?? null,
        input.company_id,
      )
    } catch (e) {
      console.error('[createEmployeeAdmin] 사번 생성 실패:', e)
    }
  }

  /* 3. INSERT (service role — RLS 우회) */
  const adminClient = createServiceClient()
  const { error } = await adminClient.from('employees').insert({
    company_id:      input.company_id,
    name:            input.name,
    email:           input.email,
    birthdate:       input.birthdate        ?? null,
    department:      input.department       ?? null,
    position:        input.position         ?? null,
    job:             input.job              ?? null,
    Grade:           input.Grade            ?? null,
    Role:            input.Role             ?? null,
    Tel:             input.Tel              ?? null,
    Sex:             input.Sex              ?? null,
    Date_of_joining: input.Date_of_joining  ?? null,
    'Working place': input['Working place'] ?? null,
    'Work details':  input['Work details']  ?? null,
    employee_number:   employeeNumber,
    is_active:         input.is_active ?? true,
    is_contract:       input.is_contract ?? false,
    contract_end_date: input.contract_end_date ?? null,
    user_id:           null,
  })

  if (error) {
    console.error('[createEmployeeAdmin] INSERT 실패:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/* ================================================================
   deleteEmployeeAdmin — 퇴사 직원 완전 삭제 (어드민 전용)
   순서: pay_info_v2 → employees
   퇴사(is_active=false) 상태인 직원만 삭제 허용
================================================================ */
export async function deleteEmployeeAdmin(
  employeeId: number,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient()

  /* 어드민 권한 확인 */
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return { success: false, error: '어드민만 직원을 삭제할 수 있습니다' }
  }

  /* 퇴사 상태 확인 */
  const { data: emp } = await supabase
    .from('employees').select('is_active, name').eq('id', employeeId).single()
  if (!emp) return { success: false, error: '직원을 찾을 수 없습니다' }
  if (emp.is_active) {
    return { success: false, error: '재직 중인 직원은 삭제할 수 없습니다. 먼저 퇴사 처리하세요.' }
  }

  /* 급여 데이터 삭제 */
  const { error: payErr } = await supabase
    .from('pay_info_v2').delete().eq('employee_id', employeeId)
  if (payErr) {
    console.error('[deleteEmployeeAdmin] pay_info_v2 삭제 실패:', payErr.message)
    return { success: false, error: `급여 데이터 삭제 실패: ${payErr.message}` }
  }

  /* 직원 삭제 (service role — RLS 우회) */
  const service = createServiceClient()
  const { error: empErr } = await service
    .from('employees').delete().eq('id', employeeId)
  if (empErr) {
    console.error('[deleteEmployeeAdmin] employees 삭제 실패:', empErr.message)
    return { success: false, error: `직원 삭제 실패: ${empErr.message}` }
  }

  return { success: true }
}
