'use server'
/* ================================================================
   itda — 직원 CSV 대량 등록 Server Action
   처리 순서:
     1. 인증 + 권한 확인
     2. manager면 company_id 일치 확인
     3. 행별 형식 검증
     4. DB 중복 검증 (이메일, 사번)
     5. 유효 행만 배치 INSERT
     6. 결과 반환
================================================================ */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { validateEmployeeRow } from '@/lib/csv-employee-utils'
import { generateUniqueEmployeeNumbersBatch } from '@/lib/employee-number'
import type {
  BulkUploadParams,
  EmployeeUploadResult,
  EmployeeCsvRawRow,
  EmployeeUploadRowResult,
} from '@/types/employee-upload'

/* ── service role 클라이언트 (INSERT 권한 보장) ── */
function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.')
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

/* ── 메인 Server Action ──────────────────────────────────────── */
export async function uploadEmployeesCsv(
  params: BulkUploadParams,
): Promise<EmployeeUploadResult & { authError?: string }> {
  /* 1. 인증 */
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { authError: '인증이 필요합니다', totalCount: 0, successCount: 0, failureCount: 0, successes: [], failures: [] }
  }

  /* 2. 권한 확인 */
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | undefined
  if (!role || !['admin', 'manager'].includes(role)) {
    return { authError: '권한이 없습니다', totalCount: 0, successCount: 0, failureCount: 0, successes: [], failures: [] }
  }

  /* 3. manager면 company_id 일치 확인 (클라이언트 조작 차단) */
  if (role === 'manager') {
    if (!profile?.company_id || profile.company_id !== params.companyId) {
      return { authError: '본인 회사 직원만 등록할 수 있습니다', totalCount: 0, successCount: 0, failureCount: 0, successes: [], failures: [] }
    }
  }

  const { companyId, rows, fileName } = params
  let adminClient: ReturnType<typeof createServiceClient>
  try {
    adminClient = createServiceClient()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '서버 설정 오류'
    return { authError: msg, totalCount: 0, successCount: 0, failureCount: 0, successes: [], failures: [] }
  }

  /* 4. 회사 사업자번호 조회 (사번 자동 생성용) */
  const { data: companyData } = await adminClient
    .from('companies')
    .select('biz_number')
    .eq('id', companyId)
    .single()
  const bizNumber = companyData?.biz_number ?? null

  /* 5. 전체 이메일 유니크 검증 (다른 회사 포함) */
  const { data: allEmployeeEmails } = await adminClient
    .from('employees')
    .select('email')
  const allEmails = new Set(
    (allEmployeeEmails ?? []).map(e => (e.email ?? '').toLowerCase())
  )

  /* 7. 파일 내 이메일 중복 추적 */
  const seenEmails = new Set<string>()

  /* 8. 행별 검증 */
  const successes: EmployeeUploadRowResult[] = []
  const failures: EmployeeUploadRowResult[] = []

  const validRows: { row: EmployeeCsvRawRow; rowNumber: number }[] = []

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2 // 헤더 = 1행
    const reasons: string[] = []

    // 형식 검증 (사번은 자동 생성이므로 미검증)
    const validation = validateEmployeeRow(row, rowNumber)
    reasons.push(...validation.reasons)

    // 파일 내 이메일 중복
    if (row.email) {
      if (seenEmails.has(row.email)) {
        reasons.push(`파일 내 이메일 중복: ${row.email}`)
      } else {
        seenEmails.add(row.email)
      }
    }

    // DB 이메일 중복 (전체)
    if (row.email && allEmails.has(row.email)) {
      reasons.push(`이미 등록된 이메일: ${row.email}`)
    }

    if (reasons.length > 0) {
      failures.push({ rowNumber, rawData: row, status: 'failure', reasons })
    } else {
      validRows.push({ row, rowNumber })
    }
  })

  /* 9. 유효 행 사번 일괄 자동 생성 */
  let generatedNumbers: string[] = []
  if (validRows.length > 0 && bizNumber) {
    try {
      generatedNumbers = await generateUniqueEmployeeNumbersBatch(
        adminClient,
        companyId,
        bizNumber,
        validRows.map(({ row }) => row.join_date || null),
      )
    } catch (e) {
      console.error('[employee-bulk-upload] 사번 생성 실패:', e)
      // 사번 생성 실패 시 null로 진행
      generatedNumbers = validRows.map(() => '')
    }
  } else {
    generatedNumbers = validRows.map(() => '')
  }

  /* 10. 유효 행 배치 INSERT */
  if (validRows.length > 0) {
    const records = validRows.map(({ row }, i) => ({
      company_id:        companyId,
      name:              row.name,
      email:             row.email,
      employee_number:   generatedNumbers[i] || null,
      department:        row.department || null,
      position:          row.position   || null,
      Tel:               row.phone      || null,
      Date_of_joining:   row.join_date  || null,
      is_active:         row.employment_status !== 'inactive',
      is_contract:       row.is_contract === 'Y',
      contract_end_date: row.contract_end_date || null,
      weekly_work_hours: row.weekly_work_hours ? Number(row.weekly_work_hours) : null,
    }))

    // 50건씩 배치 처리 (사번은 이미 generatedNumbers에 할당됨)
    const BATCH_SIZE = 50
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)
      const batchRows = validRows.slice(i, i + BATCH_SIZE)

      const { error } = await adminClient.from('employees').insert(batch)

      if (error) {
        // 배치 실패 시 해당 배치 전체를 failures로
        console.error('[employee-bulk-upload] INSERT error:', error.message)
        batchRows.forEach(({ row, rowNumber }) => {
          failures.push({
            rowNumber,
            rawData: row,
            status: 'failure',
            reasons: [`저장 오류: ${error.message}`],
          })
        })
      } else {
        batchRows.forEach(({ row, rowNumber }) => {
          successes.push({ rowNumber, rawData: row, status: 'success' })
        })
      }
    }
  }

  /* 11. 업로드 이력 기록 */
  try {
    await adminClient.from('employee_upload_logs').insert({
      company_id:     companyId,
      uploaded_by:    user.id,
      file_name:      fileName,
      total_rows:     rows.length,
      success_rows:   successes.length,
      failure_rows:   failures.length,
      failure_detail: failures.length > 0
        ? failures.map(f => ({ rowNumber: f.rowNumber, reasons: f.reasons }))
        : null,
    })
  } catch (e) {
    // 로그 실패는 무시 (메인 결과에 영향 없음)
    console.warn('[employee-bulk-upload] log insert failed:', e)
  }

  return {
    totalCount:   rows.length,
    successCount: successes.length,
    failureCount: failures.length,
    successes,
    failures,
  }
}
