import { createClient } from '@/lib/supabase/server'

export interface EmployeeRow {
  id: number
  name: string
  email: string
  birthdate: string | null
  company_id: number
  employee_number: string | null
  user_id: string | null
  is_active: boolean
  Date_of_joining: string | null
  quit_date: string | null
  department: string | null
  position: string | null
  Grade: string | null
  Role: string | null
  job: string | null
  Tel: string | null
  Sex: string | null
  'Working place': string | null
  'Work details': string | null
  companies?: { name: string } | null
}

/** 어드민: 전체 직원 (이름·이메일·사번 서버 검색 지원) */
export async function getAllEmployees(filters?: {
  companyId?: number
  isActive?: boolean
  search?: string
}): Promise<EmployeeRow[]> {
  const supabase = createClient()
  let q = supabase
    .from('employees')
    .select('*, companies(name)')
    .order('name')

  if (filters?.companyId) q = q.eq('company_id', filters.companyId)
  if (filters?.isActive !== undefined) q = q.eq('is_active', filters.isActive)
  if (filters?.search) {
    const s = filters.search.trim()
    q = q.or(
      `name.ilike.%${s}%,email.ilike.%${s}%,employee_number.ilike.%${s}%`
    )
  }

  const { data } = await q
  return (data ?? []) as EmployeeRow[]
}

/** 기업담당자: 본인 회사 직원 (이름·이메일·사번 서버 검색 지원) */
export async function getCompanyEmployees(
  companyId: number,
  filters?: { isActive?: boolean; search?: string }
): Promise<EmployeeRow[]> {
  const supabase = createClient()
  let q = supabase
    .from('employees')
    .select('*')
    .eq('company_id', companyId)
    .order('name')

  if (filters?.isActive !== undefined) q = q.eq('is_active', filters.isActive)
  if (filters?.search) {
    const s = filters.search.trim()
    q = q.or(
      `name.ilike.%${s}%,email.ilike.%${s}%,employee_number.ilike.%${s}%`
    )
  }

  const { data } = await q
  return (data ?? []) as EmployeeRow[]
}

/** 직원: 본인 정보 (user_id로 조회) */
export async function getMyEmployee(): Promise<EmployeeRow | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('employees')
    .select('*, companies(name)')
    .eq('user_id', user.id)
    .single()
  return (data as EmployeeRow | null)
}

/** user_id 없는 직원 (초대 대상) */
export async function getUnlinkedEmployees(companyId?: number): Promise<EmployeeRow[]> {
  const supabase = createClient()
  let q = supabase
    .from('employees')
    .select('*, companies(name)')
    .is('user_id', null)
    .eq('is_active', true)
    .order('name')
  if (companyId) q = q.eq('company_id', companyId)
  const { data } = await q
  return (data ?? []) as EmployeeRow[]
}
