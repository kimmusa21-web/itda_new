'use server'

import { createServiceClient } from '@/lib/supabase/service'

export interface PendingResignee {
  id: number
  name: string
  job: string | null
  quit_date: string
  company_id: number
  company_name: string
}

export interface MissingPayrollEmployee {
  id: number
  name: string
  job: string | null
  company_id: number
  company_name: string
  latest_month: string
}

/** 퇴사일이 지났는데 여전히 재직 상태(is_active=true)인 직원 */
export async function getPendingResignees(): Promise<PendingResignee[]> {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('employees')
    .select('id, name, job, quit_date, company_id, companies(name)')
    .eq('is_active', true)
    .not('quit_date', 'is', null)
    .lte('quit_date', today)
    .is('companies.deleted_at', null)
    .order('quit_date')

  if (!data) return []

  return data.map((e) => ({
    id:           e.id,
    name:         e.name ?? '',
    job:          e.job,
    quit_date:    e.quit_date as string,
    company_id:   e.company_id as number,
    company_name: (e.companies as unknown as { name: string } | null)?.name ?? '미지정',
  }))
}

/** 회사별 최근 급여월 기준으로 급여 데이터가 없는 재직자 */
export async function getMissingPayrollEmployees(): Promise<MissingPayrollEmployee[]> {
  const supabase = createServiceClient()

  // 1. 회사별 가장 최근 accrual_month
  const { data: payrolls } = await supabase
    .from('pay_info_v2')
    .select('company_id, accrual_month')

  if (!payrolls || payrolls.length === 0) return []

  const latestByCompany: Record<number, string> = {}
  for (const row of payrolls) {
    const cid = row.company_id as number
    const month = row.accrual_month as string
    if (!latestByCompany[cid] || month > latestByCompany[cid]) {
      latestByCompany[cid] = month
    }
  }

  // 2. 해당 달에 급여가 있는 employee_id 목록
  const results: MissingPayrollEmployee[] = []

  for (const [companyIdStr, latestMonth] of Object.entries(latestByCompany)) {
    const companyId = Number(companyIdStr)

    const { data: paidEmpIds } = await supabase
      .from('pay_info_v2')
      .select('employee_id')
      .eq('company_id', companyId)
      .eq('accrual_month', latestMonth)

    const paidSet = new Set((paidEmpIds ?? []).map((r) => r.employee_id as number))

    // 3. 해당 회사 재직자 중 급여 없는 직원
    const { data: activeEmps } = await supabase
      .from('employees')
      .select('id, name, job, company_id, companies(name, deleted_at)')
      .eq('company_id', companyId)
      .eq('is_active', true)

    for (const emp of activeEmps ?? []) {
      const co = emp.companies as unknown as { name: string; deleted_at: string | null } | null
      if (co?.deleted_at) continue  // 탈퇴 회사 제외
      if (!paidSet.has(emp.id as number)) {
        results.push({
          id:           emp.id as number,
          name:         emp.name ?? '',
          job:          emp.job,
          company_id:   emp.company_id as number,
          company_name: co?.name ?? '미지정',
          latest_month: latestMonth,
        })
      }
    }
  }

  return results
}
