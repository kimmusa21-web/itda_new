/* ================================================================
   GET /api/companies/[id]/export/payroll
   탈퇴기업 급여정보 CSV 다운로드 (admin 전용)
================================================================ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function esc(value: unknown): string {
  if (value == null || value === '') return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function num(v: unknown): string {
  if (v == null) return '0'
  return String(Number(v))
}

const HEADERS = [
  '사번', '성명', '귀속년월', '지급일',
  '기본급', '연장수당(고정)', '연장수당', '야간수당', '휴일수당',
  '식대', '인센티브', '연차수당', '기타수당1', '기타수당2', '상여금',
  '지급합계',
  '국민연금', '건강보험', '장기요양', '고용보험',
  '소득세', '지방소득세', '학자금상환', '소득세환급', '지방소득세환급',
  '건강보험정산', '기타공제',
  '공제합계', '실지급액',
]

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const companyId = Number(params.id)
  if (isNaN(companyId)) return new NextResponse('Bad Request', { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return new NextResponse('Forbidden', { status: 403 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: company } = await service
    .from('companies').select('name').eq('id', companyId).single()

  const { data: rows, error } = await service
    .from('pay_info_v2')
    .select(`
      accrual_month, payment_date,
      base_salary, overtime_pay_fixed, overtime_pay, nighttime_pay, holidaytime_pay,
      meal_allowance, incentive, annual_leave_allowance,
      Other_allowances, Other_allowances2, Holiday_bonus,
      Total_payment,
      national_pension, health_insurance, longterm_care, employment_insurance,
      income_tax, resident_tax, student_loan, income_tax_refund, resident_tax_refund,
      health_insurance_adjustment, Other_deductions,
      Total_deductible, net_pay,
      employees ( employee_number, name )
    `)
    .eq('company_id', companyId)
    .order('accrual_month', { ascending: true })

  if (error) return new NextResponse('DB Error: ' + error.message, { status: 500 })

  const csvRows = (rows ?? []).map(r => {
    const emp = r.employees as { employee_number?: string; name?: string } | null
    return [
      emp?.employee_number ?? '',
      emp?.name ?? '',
      r.accrual_month ?? '',
      r.payment_date ?? '',
      num(r.base_salary),
      num(r.overtime_pay_fixed),
      num(r.overtime_pay),
      num(r.nighttime_pay),
      num(r.holidaytime_pay),
      num(r.meal_allowance),
      num(r.incentive),
      num(r.annual_leave_allowance),
      num(r.Other_allowances),
      num(r.Other_allowances2),
      num(r.Holiday_bonus),
      num(r.Total_payment),
      num(r.national_pension),
      num(r.health_insurance),
      num(r.longterm_care),
      num(r.employment_insurance),
      num(r.income_tax),
      num(r.resident_tax),
      num(r.student_loan),
      num(r.income_tax_refund),
      num(r.resident_tax_refund),
      num(r.health_insurance_adjustment),
      num(r.Other_deductions),
      num(r.Total_deductible),
      num(r.net_pay),
    ].map(esc).join(',')
  })

  const today = new Date().toISOString().slice(0, 10)
  const fileName = `급여정보_${company?.name ?? companyId}_${today}.csv`
  const BOM = '﻿'
  const csv = BOM + [HEADERS.join(','), ...csvRows].join('\r\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  })
}
