'use server'
/* ================================================================
   itda — 급여명세서 이메일 발송 Server Action
   처리 순서:
     1. 인증 + 권한 확인
     2. manager: company_id 일치 검증
     3. pay_info_v2에서 해당 월 데이터 조회
     4. 직원별 이메일 발송
     5. 결과 반환
================================================================ */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendPayslipNotificationEmail }       from '@/lib/email'

export interface SendPayslipResult {
  sentCount:    number
  failedCount:  number
  skippedCount: number   // 이메일 없음 등
  details: {
    name:    string
    email:   string
    status:  'sent' | 'failed' | 'skipped'
    reason?: string
  }[]
  authError?: string
}

export async function sendPayslipEmails(params: {
  companyId:    number
  accrualMonth: string
}): Promise<SendPayslipResult> {
  const empty: SendPayslipResult = {
    sentCount: 0, failedCount: 0, skippedCount: 0, details: [],
  }

  /* 1. 인증 */
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ...empty, authError: '인증이 필요합니다' }

  /* 2. 권한 확인 */
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id, companies(name)')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | undefined
  if (!role || !['admin', 'manager'].includes(role)) {
    return { ...empty, authError: '권한이 없습니다' }
  }

  /* 3. manager: company_id 일치 검증 */
  if (role === 'manager') {
    if (!profile.company_id || profile.company_id !== params.companyId) {
      return { ...empty, authError: '본인 회사의 급여명세서만 발송할 수 있습니다' }
    }
  }

  /* 4. 회사 이름 조회 */
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', params.companyId)
    .single()
  const companyName = company?.name ?? '회사'

  /* 5. pay_info_v2 + 직원 정보 조회 */
  const { data: payslips, error: payslipError } = await supabase
    .from('pay_info_v2')
    .select(`
      id,
      net_pay,
      payment_date,
      employees ( id, name, email )
    `)
    .eq('company_id', params.companyId)
    .eq('accrual_month', params.accrualMonth)
    .order('id')

  if (payslipError) {
    return { ...empty, authError: `급여 데이터 조회 오류: ${payslipError.message}` }
  }

  if (!payslips || payslips.length === 0) {
    return { ...empty, authError: '해당 월의 급여 데이터가 없습니다.' }
  }

  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const details  = []
  let sentCount  = 0
  let failedCount  = 0
  let skippedCount = 0

  /* 6. 직원별 이메일 발송 */
  for (const row of payslips) {
    const emp  = row.employees as { id: number; name: string; email: string } | null
    const name = emp?.name  ?? '직원'
    const email = emp?.email ?? ''

    if (!email) {
      skippedCount++
      details.push({ name, email: '(없음)', status: 'skipped' as const, reason: '이메일 주소 없음' })
      continue
    }

    const payslipUrl = `${appUrl}/employee/payslips/${row.id}`
    const netPay     = typeof row.net_pay === 'number'
      ? row.net_pay
      : parseFloat(String(row.net_pay ?? '0')) || 0

    const result = await sendPayslipNotificationEmail(email, name, {
      companyName,
      accrualMonth: params.accrualMonth,
      netPay,
      paymentDate:  row.payment_date ?? null,
      payslipUrl,
    })

    if (result.success) {
      sentCount++
      details.push({ name, email, status: 'sent' as const })
    } else {
      failedCount++
      details.push({ name, email, status: 'failed' as const, reason: result.error })
    }
  }

  return { sentCount, failedCount, skippedCount, details }
}
