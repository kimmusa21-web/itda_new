'use server'
/* ================================================================
   itda — 급여대장 엑셀 업로드 Server Action
   직원 식별: 1순위 사번, 2순위 이름(단일 매칭)
   저장 대상: pay_info_v2
================================================================ */

import { createClient } from '@/lib/supabase/server'
import { upsertPayInfo } from '@/lib/payroll-upload'
import type { ParsedLedgerRow } from '@/lib/payroll-ledger-utils'
import { EARNINGS_DB_KEYS, DEDUCTIONS_DB_KEYS } from '@/lib/payroll-ledger-utils'
import type { PayInfoPayload } from '@/types/payroll-upload'

export interface LedgerRowResult {
  rowIndex:       number
  name:           string
  employeeNumber: string
  accrualMonth:   string
  status:         'success' | 'failure'
  reason?:        string
}

export interface LedgerUploadResult {
  totalCount:   number
  successCount: number
  failureCount: number
  results:      LedgerRowResult[]
  authError?:   string
}

export async function uploadPayrollLedger(params: {
  companyId: number
  rows:      ParsedLedgerRow[]
  fileName:  string
}): Promise<LedgerUploadResult> {
  const empty = (authError?: string): LedgerUploadResult => ({
    totalCount: 0, successCount: 0, failureCount: 0, results: [], authError,
  })

  /* 1. 인증 */
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return empty('인증이 필요합니다')

  /* 2. 권한 */
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!['admin', 'manager'].includes(profile?.role ?? ''))
    return empty('권한이 없습니다')

  if (profile?.role === 'manager' && profile.company_id !== params.companyId)
    return empty('본인 회사 직원만 업로드 가능합니다')

  if (params.rows.length === 0)
    return empty('업로드할 데이터가 없습니다')

  /* 3. 직원 목록 조회 (사번 + 이름 매칭용) */
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, employee_number, company_id')
    .eq('company_id', params.companyId)
    .eq('is_active', true)

  const empList = employees ?? []

  // 사번 → 직원 맵 (1순위)
  const byEmpNumber = new Map<string, typeof empList[0]>()
  for (const e of empList) {
    if (e.employee_number) byEmpNumber.set(e.employee_number, e)
  }

  // 이름 → 직원[] 맵 (2순위, 동명이인 감지)
  const byName = new Map<string, typeof empList[0][]>()
  for (const e of empList) {
    const arr = byName.get(e.name) ?? []
    arr.push(e)
    byName.set(e.name, arr)
  }

  /* 4. 행별 매칭 + PayInfoPayload 생성 */
  const payloads: PayInfoPayload[] = []
  const rowResults: LedgerRowResult[] = []

  // 배치 내 중복 (동일 employee_id + accrual_month) 감지용
  const seenKeys = new Set<string>()

  for (const row of params.rows) {
    const rowResult: LedgerRowResult = {
      rowIndex:       row.rowIndex,
      name:           row.rawName,
      employeeNumber: row.rawEmployeeNumber,
      accrualMonth:   row.accrualMonth ?? '',
      status:         'failure',
    }

    // 귀속월 필수
    if (!row.accrualMonth) {
      rowResult.reason = '귀속월이 없습니다 (귀속월/급여월 컬럼 필요)'
      rowResults.push(rowResult)
      continue
    }

    // 직원 매칭
    let employee: typeof empList[0] | null = null

    // 1순위: 사번
    if (row.rawEmployeeNumber) {
      employee = byEmpNumber.get(row.rawEmployeeNumber) ?? null
    }

    // 2순위: 이름 (단일 매칭만 허용)
    if (!employee && row.rawName) {
      const matches = byName.get(row.rawName) ?? []
      if (matches.length === 1) {
        employee = matches[0]
      } else if (matches.length > 1) {
        rowResult.reason = `동명이인 ${matches.length}명 존재 — 사번으로 구분 필요`
        rowResults.push(rowResult)
        continue
      }
    }

    if (!employee) {
      rowResult.reason = `직원 매칭 실패 (사번: "${row.rawEmployeeNumber}", 이름: "${row.rawName}")`
      rowResults.push(rowResult)
      continue
    }

    // 배치 내 중복 체크 — 같은 employee_id + accrual_month 는 1건만 허용
    const batchKey = `${employee.id}|${row.accrualMonth}`
    if (seenKeys.has(batchKey)) {
      rowResult.reason = `이 파일 내 중복 — 동일 직원(${row.rawName})의 같은 귀속월 데이터가 이미 처리됨`
      rowResults.push(rowResult)
      continue
    }
    seenKeys.add(batchKey)

    /* 5. earnings / deductions JSONB 빌드 */
    const r = row as unknown as Record<string, number>
    const nvl = (v: number): number | null => v !== 0 ? v : null

    const earnings: Record<string, number> = {}
    for (const k of EARNINGS_DB_KEYS) {
      const v = r[k]
      if (v && v !== 0) earnings[k] = v
    }

    const deductions: Record<string, number> = {}
    for (const k of DEDUCTIONS_DB_KEYS) {
      const v = r[k]
      if (v && v !== 0) deductions[k] = v
    }

    const totalEarnings =
      row.Total_payment !== 0
        ? row.Total_payment
        : Object.values(earnings).reduce((s, v) => s + v, 0)

    const totalDeductions =
      row.Total_deductible !== 0
        ? row.Total_deductible
        : Object.values(deductions).reduce((s, v) => s + v, 0)

    const netPay =
      row.net_pay !== 0
        ? row.net_pay
        : totalEarnings - totalDeductions

    payloads.push({
      company_id:        params.companyId,
      employee_id:       employee.id,
      accrual_month:     row.accrualMonth,
      payment_date:      row.paymentDate,
      work_days:         null,
      overtime_hours:    null,
      // 지급 개별 컬럼
      base_salary:              nvl(row.base_salary),
      overtime_pay_fixed:       nvl(row.overtime_pay_fixed),
      overtime_pay:             nvl(row.overtime_pay),
      holidaytime_pay:          nvl(row.holidaytime_pay),
      nighttime_pay:            nvl(row.nighttime_pay),
      meal_allowance:           nvl(row.meal_allowance),
      incentive:                nvl(row.incentive),
      annual_leave_allowance:   nvl(row.annual_leave_allowance),
      Other_allowances:         nvl(row.Other_allowances),
      Other_allowances2:        nvl(row.Other_allowances2),
      Holiday_bonus:            nvl(row.Holiday_bonus),
      Total_payment:            totalEarnings || null,
      // 공제 개별 컬럼
      national_pension:           nvl(row.national_pension),
      health_insurance:           nvl(row.health_insurance),
      longterm_care:              nvl(row.longterm_care),
      employment_insurance:       nvl(row.employment_insurance),
      income_tax:                 nvl(row.income_tax),
      resident_tax:               nvl(row.resident_tax),
      student_loan:               nvl(row.student_loan),
      income_tax_refund:          row.income_tax_refund !== 0 ? row.income_tax_refund : null,
      resident_tax_refund:        row.resident_tax_refund !== 0 ? row.resident_tax_refund : null,
      Total_deductible:           totalDeductions || null,
      Other_deductions:           nvl(row.Other_deductions),
      health_insurance_adjustment: nvl(row.health_insurance_adjustment),
      // JSONB (표시용)
      earnings,
      deductions,
      total_earnings:    totalEarnings,
      total_deductions:  totalDeductions,
      net_pay:           netPay,
      calculation_notes: [],
    })

    rowResult.status = 'success'
    rowResults.push(rowResult)
  }

  /* 6. DB upsert */
  if (payloads.length > 0) {
    const { success, error } = await upsertPayInfo(payloads)
    if (!success) {
      // 전체 실패로 처리
      return {
        totalCount:   params.rows.length,
        successCount: 0,
        failureCount: params.rows.length,
        results: params.rows.map(r => ({
          rowIndex:       r.rowIndex,
          name:           r.rawName,
          employeeNumber: r.rawEmployeeNumber,
          accrualMonth:   r.accrualMonth ?? '',
          status:         'failure' as const,
          reason:         `DB 저장 오류: ${error ?? '알 수 없는 오류'}`,
        })),
      }
    }
  }

  const successCount = rowResults.filter(r => r.status === 'success').length
  const failureCount = rowResults.filter(r => r.status === 'failure').length

  return {
    totalCount:   params.rows.length,
    successCount,
    failureCount,
    results: rowResults,
  }
}
