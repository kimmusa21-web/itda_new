import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  dailyHours, calcExpiresAt,
  hireDateAnnualDays, fiscalYearAnnualDays,
} from '@/lib/leave-calculator'

export const runtime    = 'nodejs'
export const maxDuration = 60

type LeaveBasis = 'hire_date' | 'fiscal_year'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today    = new Date()
  const todayY   = today.getFullYear()
  const todayM   = today.getMonth()   // 0-based
  const todayD   = today.getDate()

  // 재직 중인 전체 직원 조회
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, company_id, Date_of_joining, weekly_work_hours')
    .eq('is_active', true)
    .not('Date_of_joining', 'is', null)

  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 })

  // 회사별 연차 정책 조회
  const { data: policies } = await supabase
    .from('leave_policies')
    .select('company_id, basis')

  const policyMap = new Map<number, LeaveBasis>(
    (policies ?? []).map(p => [p.company_id, p.basis as LeaveBasis])
  )

  let monthlyCount = 0
  let annualCount  = 0
  const errors: string[] = []

  for (const emp of employees ?? []) {
    const hire     = new Date(emp.Date_of_joining)
    const hireY    = hire.getFullYear()
    const hireM    = hire.getMonth()   // 0-based
    const hireD    = hire.getDate()

    // 이번 달의 유효 기념일(말일 처리: 31일 입사 → 30일 달이면 30일로)
    const lastDayOfMonth   = new Date(todayY, todayM + 1, 0).getDate()
    const effectiveHireDay = Math.min(hireD, lastDayOfMonth)

    if (todayD !== effectiveHireDay) continue  // 오늘이 기념일이 아님

    const monthsElapsed = (todayY - hireY) * 12 + (todayM - hireM)
    const basis         = policyMap.get(emp.company_id) ?? 'hire_date'
    const dh            = dailyHours(emp.weekly_work_hours)

    if (monthsElapsed >= 1 && monthsElapsed <= 11) {
      // ── 월차 적립 ────────────────────────────────────────
      const period    = `${todayY}-${String(todayM + 1).padStart(2, '0')}`
      const expiresAt = calcExpiresAt(period)

      const { error } = await supabase.from('leave_balances').upsert({
        company_id:  emp.company_id,
        employee_id: emp.id,
        basis,
        period,
        period_type: 'monthly',
        total_hours: dh,
        expires_at:  expiresAt,
      }, { onConflict: 'employee_id,period,basis', ignoreDuplicates: true })

      if (error) errors.push(`monthly emp=${emp.id}: ${error.message}`)
      else monthlyCount++

    } else if (monthsElapsed >= 12 && monthsElapsed % 12 === 0) {
      // ── 연차 적립 (입사 기념일 — 정확히 N주년) ───────────
      const days = basis === 'hire_date'
        ? hireDateAnnualDays(hire, todayY)
        : fiscalYearAnnualDays(hire, todayY)

      if (days > 0) {
        const period    = String(todayY)
        const expiresAt = calcExpiresAt(period)

        const { error } = await supabase.from('leave_balances').upsert({
          company_id:  emp.company_id,
          employee_id: emp.id,
          basis,
          period,
          period_type: 'annual',
          total_hours: days * dh,
          expires_at:  expiresAt,
        }, { onConflict: 'employee_id,period,basis', ignoreDuplicates: true })

        if (error) errors.push(`annual emp=${emp.id}: ${error.message}`)
        else annualCount++
      }
    }
  }

  return NextResponse.json({
    success:      errors.length === 0,
    date:         today.toISOString().slice(0, 10),
    monthlyCount,
    annualCount,
    errors:       errors.length > 0 ? errors : undefined,
  })
}
