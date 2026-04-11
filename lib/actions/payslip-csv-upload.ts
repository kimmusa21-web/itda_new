'use server'
/* ================================================================
   itda — 급여 간편 CSV 업로드 Server Action

   처리 순서:
     1. 인증 + 권한 확인 (admin / manager)
     2. manager: company_id 불일치 차단
     3. 행별 형식 검증
     4. 파일 내 중복 검사 (email + pay_month)
     5. company_id + email 기준 직원 매칭
        → Option A: 한 명이라도 실패 시 전체 중단
     6. pay_info_v2 upsert (company_id, employee_id, accrual_month)
     7. 결과 반환
================================================================ */

import { createClient } from '@/lib/supabase/server'
import type {
  PayslipCsvRow,
  PayslipCsvResult,
  PayslipCsvFailure,
  PayslipCsvUploadParams,
} from '@/types/payslip-csv-upload'

/* ── 숫자 변환 헬퍼 ──────────────────────────────────────── */
function toNum(v: string | undefined): number {
  if (!v || v.trim() === '') return 0
  const n = Number(v.replace(/,/g, ''))
  return isNaN(n) || n < 0 ? 0 : n
}

/* ── 이메일 정규식 ───────────────────────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const DATE_RE  = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

/* ── 행 검증 ────────────────────────────────────────────── */
function serverValidateRow(
  row: PayslipCsvRow,
  rowNumber: number,
): PayslipCsvFailure[] {
  const failures: PayslipCsvFailure[] = []
  const fail = (reason: string) => failures.push({ rowNumber, email: row.email, reason })

  if (!row.email)                            fail('이메일 필수값')
  else if (!EMAIL_RE.test(row.email))        fail(`이메일 형식 오류: ${row.email}`)
  if (!row.pay_month)                        fail('귀속월 필수값 (YYYY-MM)')
  else if (!MONTH_RE.test(row.pay_month))    fail(`귀속월 형식 오류: ${row.pay_month}`)
  if (!row.base_salary)                      fail('기본급 필수값')
  else if (isNaN(Number(row.base_salary)))   fail(`기본급 숫자 오류: ${row.base_salary}`)
  if (row.bonus     && isNaN(Number(row.bonus)))     fail(`상여금 숫자 오류: ${row.bonus}`)
  if (row.allowance && isNaN(Number(row.allowance))) fail(`수당 숫자 오류: ${row.allowance}`)
  if (row.deduction && isNaN(Number(row.deduction))) fail(`공제액 숫자 오류: ${row.deduction}`)
  if (row.start_date && !DATE_RE.test(row.start_date))
    fail(`정산시작일 형식 오류: ${row.start_date} (YYYY-MM-DD 필요)`)
  if (row.end_date && !DATE_RE.test(row.end_date))
    fail(`정산종료일 형식 오류: ${row.end_date} (YYYY-MM-DD 필요)`)
  if (row.payment_date && !DATE_RE.test(row.payment_date))
    fail(`지급일 형식 오류: ${row.payment_date}`)

  return failures
}

/* ── 메인 서버 액션 ─────────────────────────────────────── */
export async function uploadPayslipCsv(
  params: PayslipCsvUploadParams,
): Promise<PayslipCsvResult> {
  const empty: PayslipCsvResult = {
    totalCount: 0, successCount: 0, failureCount: 0, failures: [],
  }

  /* 1. 인증 */
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ...empty, authError: '인증이 필요합니다' }

  /* 2. 권한 확인 */
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | undefined
  if (!role || !['admin', 'manager'].includes(role)) {
    return { ...empty, authError: '권한이 없습니다 (admin / manager 전용)' }
  }

  /* 3. manager: company_id 일치 확인 */
  if (role === 'manager') {
    if (!profile?.company_id || profile.company_id !== params.companyId) {
      return { ...empty, authError: '본인 회사 데이터만 업로드할 수 있습니다' }
    }
  }

  const { companyId, rows } = params
  const totalCount = rows.length
  const allFailures: PayslipCsvFailure[] = []

  /* 4. 행별 형식 검증 */
  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2  // 헤더 = 1행
    const rowFails  = serverValidateRow(rows[i], rowNumber)
    allFailures.push(...rowFails)
  }

  /* 5. 파일 내 중복 검사 (email + pay_month) */
  const keyCount = new Map<string, number>()
  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2
    const row = rows[i]
    if (!row.email || !row.pay_month) continue   // 이미 검증 에러 있음
    const key = `${row.email.toLowerCase()}|${row.pay_month}`
    if (keyCount.has(key)) {
      allFailures.push({
        rowNumber,
        email:  row.email,
        reason: `파일 내 중복 (${row.email} / ${row.pay_month})`,
      })
    } else {
      keyCount.set(key, rowNumber)
    }
  }

  /* 6. Option A: 형식/중복 오류 있으면 전체 중단 */
  if (allFailures.length > 0) {
    return {
      totalCount,
      successCount: 0,
      failureCount: allFailures.length,
      failures:     allFailures,
      authError:    '검증 오류가 있어 업로드를 중단했습니다. 오류를 수정 후 다시 업로드해주세요.',
    }
  }

  /* 7. 회사 직원 목록 조회 (company_id 기준) */
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, email')
    .eq('company_id', companyId)

  if (empError) {
    return { ...empty, totalCount, authError: `직원 조회 오류: ${empError.message}` }
  }

  // email → employee_id 맵 (company 내, 소문자 정규화)
  const emailToEmployeeId = new Map<string, number>()
  for (const emp of employees ?? []) {
    if (emp.email) {
      emailToEmployeeId.set(emp.email.toLowerCase(), emp.id as number)
    }
  }

  /* 8. 직원 매칭 (company_id + email) */
  const matchFailures: PayslipCsvFailure[] = []
  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2
    const row = rows[i]
    const empId = emailToEmployeeId.get(row.email.toLowerCase())
    if (!empId) {
      matchFailures.push({
        rowNumber,
        email:  row.email,
        reason: `직원 없음 — company_id=${companyId}, email=${row.email}`,
      })
    }
  }

  /* Option A: 한 명이라도 매칭 실패 → 전체 중단 */
  if (matchFailures.length > 0) {
    return {
      totalCount,
      successCount: 0,
      failureCount: matchFailures.length,
      failures:     matchFailures,
      authError:    `직원 매칭 실패 ${matchFailures.length}건. 전체 업로드를 중단했습니다. employees 테이블에서 직원 등록 여부를 확인하세요.`,
    }
  }

  /* 9. pay_info_v2 upsert 데이터 구성 */
  const upsertRows = rows.map(row => {
    const baseSalary = toNum(row.base_salary)
    const bonus      = toNum(row.bonus)
    const allowance  = toNum(row.allowance)
    const deduction  = toNum(row.deduction)

    const totalEarnings    = baseSalary + bonus + allowance
    const totalDeductions  = deduction
    const netPay           = totalEarnings - totalDeductions

    return {
      company_id:        companyId,
      employee_id:       emailToEmployeeId.get(row.email.toLowerCase())!,
      accrual_month:     row.pay_month,
      payment_date:      row.payment_date || null,
      // ★ 정산기간 직접 저장
      start_date:        row.start_date || null,
      end_date:          row.end_date   || null,
      earnings: {
        base_salary: baseSalary,
        bonus,
        allowance,
      },
      deductions: {
        deduction,
      },
      total_earnings:    totalEarnings,
      total_deductions:  totalDeductions,
      net_pay:           netPay,
      calculation_notes: ['간편 CSV 업로드'],
    }
  })

  /* 10. bulk upsert (conflict: company_id, employee_id, accrual_month) */
  const BATCH_SIZE = 100
  let successCount = 0
  const upsertFailures: PayslipCsvFailure[] = []

  for (let start = 0; start < upsertRows.length; start += BATCH_SIZE) {
    const batch = upsertRows.slice(start, start + BATCH_SIZE)

    const { error: upsertError } = await supabase
      .from('pay_info_v2')
      .upsert(batch, {
        onConflict:       'company_id,employee_id,accrual_month',
        ignoreDuplicates: false,
      })

    if (upsertError) {
      // 배치 실패 시 해당 배치 전체를 실패로 처리
      for (let j = start; j < start + batch.length; j++) {
        const row = rows[j]
        upsertFailures.push({
          rowNumber: j + 2,
          email:     row?.email ?? '',
          reason:    `DB 저장 오류: ${upsertError.message}`,
        })
      }
    } else {
      successCount += batch.length
    }
  }

  return {
    totalCount,
    successCount,
    failureCount: upsertFailures.length,
    failures:     upsertFailures,
  }
}
