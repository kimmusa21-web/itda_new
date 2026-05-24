/* ================================================================
   ModuHR — 회사 전직원 급여내역 CSV 내보내기 Route Handler
   GET /api/payroll/company-export?companyId=N&startMonth=YYYY-MM&endMonth=YYYY-MM
   권한: admin(전체), manager(본인 회사만)
================================================================ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { toAccrualMonth } from '@/lib/payslip-utils'

/* ── CSV 이스케이프 ── */
function esc(value: unknown): string {
  if (value == null || value === '') return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function num(v: unknown): string {
  if (v == null) return ''
  const n = typeof v === 'number' ? v : Number(v)
  return isNaN(n) ? '' : String(n)
}

/* ── CSV 헤더 ── */
const HEADERS = [
  '회사명', '사번', '성명', '이메일', '부서', '직급',
  '귀속월', '급여지급일', '정산시작일', '정산종료일', '근무일수',
  // 지급
  '기본급', '고정연장수당', '연장근로수당', '휴일근로수당', '야간근로수당',
  '연차수당', '인센티브', '식대', '기타수당1', '기타수당2', '명절상여',
  '과세급여합계',
  // 공제
  '국민연금', '건강보험', '장기요양보험료', '고용보험', '소득세', '지방소득세',
  '소득세환급', '지방소득세환급', '건강보험료정산', '학자금대출', '기타공제',
  // 합계
  '총지급액', '총공제액', '실지급액',
  // 근로시간
  '연장근로시간(분)', '휴일근로시간(분)', '야간근로시간(분)', '잔여연차시간(분)',
]

export async function GET(req: NextRequest) {
  const supabase = createClient()

  /* ── 인증 ── */
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, company_id').eq('id', user.id).single()
  if (!profile || profile.role === 'employee') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  /* ── 파라미터 파싱 ── */
  const sp         = req.nextUrl.searchParams
  const companyId  = Number(sp.get('companyId'))
  const startMonth = sp.get('startMonth') ?? ''   // YYYY-MM
  const endMonth   = sp.get('endMonth')   ?? ''   // YYYY-MM

  if (!companyId || isNaN(companyId)) {
    return new NextResponse('Bad Request: companyId required', { status: 400 })
  }
  if (!startMonth || !endMonth) {
    return new NextResponse('Bad Request: startMonth and endMonth required', { status: 400 })
  }

  /* ── Manager: 본인 회사만 허용 ── */
  if (profile.role === 'manager' && profile.company_id !== companyId) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  /* ── 기간 → accrual_month 범위 (DB 형식: YYYY-MM-DD) ── */
  const startDate = `${startMonth}-01`
  const endDate   = `${endMonth}-01`

  /* ── 데이터 조회 (귀속월 오름차순, 직원 이름 오름차순) ── */
  const { data, error } = await supabase
    .from('pay_info_v2')
    .select(`
      *,
      employees(name, email, department, position, employee_number, Date_of_joining, company_id),
      companies(name)
    `)
    .eq('company_id', companyId)
    .gte('accrual_month', startDate)
    .lte('accrual_month', endDate)
    .order('accrual_month', { ascending: false })
    .order('employee_id',   { ascending: true })

  if (error) return new NextResponse(`DB Error: ${error.message}`, { status: 500 })

  const rows = data ?? []

  /* ── 회사명 & 파일명 ── */
  const companyName = (rows[0]?.companies as { name?: string } | null)?.name
    ?? String(companyId)
  const today    = new Date().toISOString().slice(0, 10)
  const period   = startMonth === endMonth ? startMonth : `${startMonth}_${endMonth}`
  const fileName = `payroll_${companyName}_${period}_${today}.csv`

  /* ── CSV 행 빌드 ── */
  const csvRows = rows.map(row => {
    const emp = row.employees as Record<string, unknown> | null
    const co  = row.companies as Record<string, unknown> | null
    const e   = (row.earnings   as Record<string, number> | null) ?? {}
    const d   = (row.deductions as Record<string, number> | null) ?? {}
    const r   = row as Record<string, unknown>

    const cells = [
      co?.name             ?? '',
      emp?.employee_number ?? '',
      emp?.name            ?? '',
      emp?.email           ?? '',
      emp?.department      ?? '',
      emp?.position        ?? '',
      toAccrualMonth(row.accrual_month as string),
      row.payment_date     ?? '',
      r.start_date         ?? '',
      r.end_date           ?? '',
      num(row.work_days),
      // 지급
      num(e.base_salary),
      num(e.overtime_pay_fixed),
      num(e.overtime_pay),
      num(e.holidaytime_pay),
      num(e.nighttime_pay),
      num(e.annual_leave_allowance),
      num(e.incentive),
      num(e.meal_allowance),
      num(e.Other_allowances),
      num(e.Other_allowances2),
      num(e.Holiday_bonus),
      num(e.Total_tax_salary ?? r.Total_tax_salary),
      // 공제
      num(d.national_pension),
      num(d.health_insurance),
      num(d.longterm_care),
      num(d.employment_insurance),
      num(d.income_tax),
      num(d.resident_tax),
      num(d.income_tax_refund),
      num(d.resident_tax_refund),
      num(d.health_insurance_adjustment),
      num(d.student_loan),
      num(d.Other_deductions),
      // 합계
      num(row.total_earnings),
      num(row.total_deductions),
      num(row.net_pay),
      // 근로시간
      num(r.Over_time),
      num(r.Holiday_working_hours),
      num(r.night_work_hours),
      num(r.Remaining_annual_leave_hours),
    ]

    return cells.map(esc).join(',')
  })

  /* ── CSV 응답 (UTF-8 BOM) ── */
  const BOM = '\uFEFF'
  const csv = BOM + [HEADERS.join(','), ...csvRows].join('\r\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  })
}
