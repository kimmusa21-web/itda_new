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
    employee_number: employeeNumber,
    is_active:       input.is_active ?? true,
    user_id:         null,
  })

  if (error) {
    console.error('[createEmployeeAdmin] INSERT 실패:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true }
}
