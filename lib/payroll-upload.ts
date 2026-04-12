'use server'
/* ================================================================
   itda — 급여 CSV 업로드 Server Actions
   실제 테이블: pay_info_v2 (earnings/deductions JSONB)
================================================================ */

import { createClient } from '@/lib/supabase/server'
import {
  validateCsvRows,
  transformCsvRows,
  toPayInfoPayloads,
} from '@/lib/payroll-upload-utils'
import type {
  ColumnMapping, CsvRow, EmployeeMaster,
  PayInfoPayload, UploadLogParams, ValidationResult,
} from '@/types/payroll-upload'

/* ── 회사 목록 ─────────────────────────────────────────── */
export async function getCompanies(): Promise<{ id: number; name: string }[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')
  return data ?? []
}

/* ── 컬럼 매핑 조회 ─────────────────────────────────────── */
export async function getColumnMappings(companyId: number): Promise<ColumnMapping[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('column_mappings')
    .select('id, company_id, csv_column_name, db_key, group_type, label_ko, is_required, sort_order')
    .eq('company_id', companyId)
    .not('csv_column_name', 'is', null)
    .not('group_type', 'is', null)
    .order('sort_order')
  return (data ?? []) as ColumnMapping[]
}

/* ── 회사 직원 목록 ─────────────────────────────────────────── */
export async function getEmployeesByCompany(companyId: number): Promise<EmployeeMaster[]> {
  const supabase = createClient()
  // RLS 적용 후: employees 테이블은 각 역할의 범위만 조회됨
  //   - admin: 전체 직원 (companyId 필터로 특정 회사만)
  //   - manager: 자기 회사 직원만 (RLS가 company_id 범위를 강제)
  // "다른 회사 직원" vs "미등록" 구분은 불가하나, 보안상 의도된 동작
  const { data } = await supabase
    .from('employees')
    .select('id, email, name, company_id')
    .eq('company_id', companyId)
    .eq('is_active', true)
  return (data ?? []) as EmployeeMaster[]
}

/* ── pay_info_v2 upsert ─────────────────────────────────── */
export async function upsertPayInfo(
  payloads: PayInfoPayload[],
  uploadLogId?: number,
): Promise<{ success: boolean; upsertedCount: number; error?: string }> {
  if (payloads.length === 0) return { success: true, upsertedCount: 0 }

  const supabase = createClient()

  const records = payloads.map(p => ({
    company_id:        p.company_id,
    employee_id:       p.employee_id,
    accrual_month:     p.accrual_month,
    payment_date:      p.payment_date,
    work_days:         p.work_days,
    overtime_hours:    p.overtime_hours,
    Number_of_days:    p.Number_of_days   ?? null,
    Total_tax_salary:  p.Total_tax_salary ?? null,
    // 지급 항목 개별 컬럼
    base_salary:               p.base_salary              ?? null,
    overtime_pay_fixed:        p.overtime_pay_fixed       ?? null,
    overtime_pay:              p.overtime_pay             ?? null,
    holidaytime_pay:           p.holidaytime_pay          ?? null,
    nighttime_pay:             p.nighttime_pay            ?? null,
    meal_allowance:            p.meal_allowance           ?? null,
    incentive:                 p.incentive                ?? null,
    annual_leave_allowance:    p.annual_leave_allowance   ?? null,
    Other_allowances:          p.Other_allowances         ?? null,
    Other_allowances2:         p.Other_allowances2        ?? null,
    Holiday_bonus:             p.Holiday_bonus            ?? null,
    Total_payment:             p.Total_payment            ?? null,
    // 공제 항목 개별 컬럼
    national_pension:           p.national_pension          ?? null,
    health_insurance:           p.health_insurance          ?? null,
    longterm_care:              p.longterm_care             ?? null,
    employment_insurance:       p.employment_insurance      ?? null,
    income_tax:                 p.income_tax                ?? null,
    resident_tax:               p.resident_tax              ?? null,
    student_loan:               p.student_loan              ?? null,
    income_tax_refund:          p.income_tax_refund         ?? null,
    resident_tax_refund:        p.resident_tax_refund       ?? null,
    Total_deductible:           p.Total_deductible          ?? null,
    Other_deductions:           p.Other_deductions          ?? null,
    health_insurance_adjustment: p.health_insurance_adjustment ?? null,
    // JSONB
    earnings:          p.earnings,
    deductions:        p.deductions,
    total_earnings:    p.total_earnings,
    total_deductions:  p.total_deductions,
    net_pay:           p.net_pay,
    calculation_notes: p.calculation_notes,
    upload_log_id:     uploadLogId ?? null,
  }))

  const { error } = await supabase
    .from('pay_info_v2')
    .upsert(records, {
      onConflict:       'company_id,employee_id,accrual_month',  // ★ UNIQUE 제약
      ignoreDuplicates: false,                                     // 덮어쓰기
    })

  if (error) {
    console.error('[upsertPayInfo]', error.message)
    return { success: false, upsertedCount: 0, error: error.message }
  }

  return { success: true, upsertedCount: payloads.length }
}

/* ── upload_logs INSERT ─────────────────────────────────── */
export async function createUploadLog(
  params: UploadLogParams,
): Promise<number | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('upload_logs')
    .insert({
      company_id:    params.company_id,
      accrual_month: params.accrual_month,
      payment_date:  params.payment_date,
      file_name:     params.file_name,
      uploaded_by:   params.uploaded_by,
      total_rows:    params.total_rows,
      success_rows:  params.success_rows,
      ignored_rows:  params.ignored_rows,
      error_rows:    params.error_rows,
      status:        params.status,
      note:          params.note ?? null,
      error_detail:  params.error_detail ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createUploadLog]', error.message)
    return null
  }
  return data?.id ?? null
}

/* ================================================================
   ★ 메인 Server Action: uploadPayrollCsv
   처리 순서:
     1. 어드민 권한 확인
     2. 컬럼 매핑 + 직원 목록 조회
     3. 서버 재검증 (미등록 이메일 1건이라도 → 로그 기록 후 중단)
     4. 변환 → PayInfoPayload[]
     5. upload_logs 선생성 (log_id → pay_info_v2 참조)
     6. pay_info_v2 upsert
     7. 실패 시 로그 업데이트
================================================================ */
export async function uploadPayrollCsv(params: {
  companyId:    number
  accrualMonth: string
  paymentDate:  string | null
  fileName:     string
  rows:         CsvRow[]
}): Promise<{
  success:           boolean
  message:           string
  upsertedCount?:    number
  logId?:            number
  validationResult?: ValidationResult
}> {
  const supabase = createClient()

  /* ── 어드민 권한 확인 ── */
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: '인증이 필요합니다' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return { success: false, message: 'CSV 업로드는 어드민만 가능합니다' }
  }

  /* ── 컬럼 매핑 + 직원 목록 ── */
  const [mappings, employees] = await Promise.all([
    getColumnMappings(params.companyId),
    getEmployeesByCompany(params.companyId),
  ])

  if (mappings.length === 0) {
    return { success: false, message: '이 회사의 컬럼 매핑 정보가 없습니다. 어드민에게 문의하세요.' }
  }

  /* ── 서버 재검증 ── */
  const validation = validateCsvRows(params.rows, employees, mappings, params.companyId)

  if (!validation.canUpload) {
    // 검증 실패 → 로그만 기록하고 중단
    await createUploadLog({
      company_id:    params.companyId,
      accrual_month: params.accrualMonth,
      payment_date:  params.paymentDate,
      file_name:     params.fileName,
      uploaded_by:   user.id,
      total_rows:    validation.totalRows,
      success_rows:  0,
      ignored_rows:  validation.ignoredRows,
      error_rows:    validation.errorRows,
      status:        'failed',
      note:          `검증 실패: 미등록 이메일 등 오류 ${validation.errorRows}건`,
      error_detail:  validation.errors,
    })
    return {
      success: false,
      message: `검증 실패: 시스템에 없는 직원 이메일이 포함되어 있습니다 (${validation.errorRows}건 오류). 직원 목록을 먼저 확인하세요.`,
      validationResult: validation,
    }
  }

  /* ── 변환 ── */
  const previews = transformCsvRows(
    params.rows, employees, mappings,
    params.companyId, params.accrualMonth, params.paymentDate,
  )
  const payloads = toPayInfoPayloads(previews, employees, params.companyId)

  /* ── upload_logs 선생성 (성공 예상으로 먼저 기록) ── */
  const logId = await createUploadLog({
    company_id:    params.companyId,
    accrual_month: params.accrualMonth,
    payment_date:  params.paymentDate,
    file_name:     params.fileName,
    uploaded_by:   user.id,
    total_rows:    validation.totalRows,
    success_rows:  validation.validRows,
    ignored_rows:  validation.ignoredRows,
    error_rows:    0,
    status:        'success',
    note:          `정상 ${validation.validRows}건 저장 / 무시 ${validation.ignoredRows}건`,
  })

  /* ── pay_info_v2 upsert ── */
  const upsertResult = await upsertPayInfo(payloads, logId ?? undefined)

  if (!upsertResult.success) {
    // upsert 실패 → 로그 status를 failed로 업데이트
    if (logId) {
      await supabase
        .from('upload_logs')
        .update({ status: 'failed', note: `upsert 오류: ${upsertResult.error}` })
        .eq('id', logId)
    }
    return {
      success: false,
      message: `급여 데이터 저장 중 오류가 발생했습니다: ${upsertResult.error}`,
    }
  }

  return {
    success:        true,
    message:        `${upsertResult.upsertedCount}명의 급여 데이터가 저장되었습니다 (귀속월: ${params.accrualMonth})`,
    upsertedCount:  upsertResult.upsertedCount,
    logId:          logId ?? undefined,
    validationResult: validation,
  }
}
