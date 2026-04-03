'use server'
/* ================================================================
   itda — CSV 업로드 Server Actions & Supabase 쿼리
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

/* ── 회사 목록 조회 ─────────────────────────────────── */
export async function getCompanies(): Promise<{ id: number; name: string }[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')
  return data ?? []
}

/* ── 컬럼 매핑 조회 ─────────────────────────────────── */
export async function getColumnMappings(companyId: number): Promise<ColumnMapping[]> {
  const supabase = createClient()

  // csv_column_name이 채워진 행만 (정규화된 데이터)
  const { data } = await supabase
    .from('column_mappings')
    .select('id, company_id, csv_column_name, db_key, group_type, label_ko, is_required, sort_order')
    .eq('company_id', companyId)
    .not('csv_column_name', 'is', null)
    .not('group_type', 'is', null)
    .order('sort_order')

  return (data ?? []) as ColumnMapping[]
}

/* ── 회사 직원 목록 조회 (이메일 매핑용) ─────────────── */
export async function getEmployeesByCompany(companyId: number): Promise<EmployeeMaster[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('employees')
    .select('id, email, name, company_id')
    .eq('is_active', true)
  return (data ?? []) as EmployeeMaster[]
}

/* ── pay_info_v2 upsert ─────────────────────────────── */
export async function upsertPayInfo(
  payloads: PayInfoPayload[],
  uploadLogId?: number,
): Promise<{ success: boolean; upsertedCount: number; error?: string }> {
  if (payloads.length === 0) return { success: true, upsertedCount: 0 }

  const supabase = createClient()

  const records = payloads.map(p => ({
    ...p,
    upload_log_id: uploadLogId ?? null,
  }))

  const { error, count } = await supabase
    .from('pay_info_v2')
    .upsert(records, {
      onConflict: 'company_id,employee_id,accrual_month',  // ★ UNIQUE KEY
      ignoreDuplicates: false,                              // 덮어쓰기
    })
    .select('id')

  if (error) {
    console.error('[upsertPayInfo]', error.message)
    return { success: false, upsertedCount: 0, error: error.message }
  }

  return { success: true, upsertedCount: payloads.length }
}

/* ── upload_logs 기록 ───────────────────────────────── */
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

/* ── 메인 업로드 Server Action ──────────────────────────
   호출: 검증 완료 후 확정 버튼 클릭 시
─────────────────────────────────────────────────────── */
export async function uploadPayrollCsv(params: {
  companyId:    number
  accrualMonth: string
  paymentDate:  string | null
  fileName:     string
  rows:         CsvRow[]
}): Promise<{
  success: boolean
  message: string
  upsertedCount?: number
  logId?: number
  validationResult?: ValidationResult
}> {
  const supabase = createClient()

  /* ① 어드민 권한 확인 */
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: '인증이 필요합니다' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return { success: false, message: 'CSV 업로드는 어드민만 가능합니다' }
  }

  /* ② 컬럼 매핑 + 직원 목록 조회 */
  const [mappings, employees] = await Promise.all([
    getColumnMappings(params.companyId),
    getEmployeesByCompany(params.companyId),
  ])

  if (mappings.length === 0) {
    return { success: false, message: '이 회사의 컬럼 매핑 정보가 없습니다' }
  }

  /* ③ 검증 (미등록 이메일 1건이라도 → 중단) */
  const validation = validateCsvRows(params.rows, employees, mappings, params.companyId)

  if (!validation.canUpload) {
    // 검증 실패 → 로그 기록 후 중단
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
      note:          `검증 실패: 오류 ${validation.errorRows}건`,
      error_detail:  validation.errors,
    })
    return {
      success: false,
      message: `검증 실패: 시스템에 없는 직원 이메일이 포함되어 있습니다 (${validation.errorRows}건)`,
      validationResult: validation,
    }
  }

  /* ④ CSV 변환 */
  const previews = transformCsvRows(
    params.rows, mappings, employees,
    params.companyId, params.accrualMonth, params.paymentDate,
  )
  const payloads = toPayInfoPayloads(previews, employees, params.companyId)

  /* ⑤ upload_logs 선생성 (log_id → pay_info_v2 참조) */
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
    note:          `정상 ${validation.validRows}건 / 무시 ${validation.ignoredRows}건`,
  })

  /* ⑥ pay_info_v2 upsert */
  const upsertResult = await upsertPayInfo(payloads, logId ?? undefined)

  if (!upsertResult.success) {
    // 저장 실패 시 로그 status 업데이트
    if (logId) {
      await supabase
        .from('upload_logs')
        .update({ status: 'failed', note: `저장 오류: ${upsertResult.error}` })
        .eq('id', logId)
    }
    return {
      success: false,
      message: `저장 중 오류가 발생했습니다: ${upsertResult.error}`,
    }
  }

  return {
    success: true,
    message: `${upsertResult.upsertedCount}명의 급여 데이터가 저장되었습니다 (귀속월: ${params.accrualMonth})`,
    upsertedCount: upsertResult.upsertedCount,
    logId: logId ?? undefined,
    validationResult: validation,
  }
}
