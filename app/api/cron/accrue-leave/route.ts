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

  // Vercel 서버는 UTC 기준 — KST(UTC+9)로 변환하여 날짜 비교
  const kst    = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const todayY = kst.getUTCFullYear()
  const todayM = kst.getUTCMonth()   // 0-based
  const todayD = kst.getUTCDate()

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
    // 입사일을 문자열에서 직접 파싱 (UTC/KST 혼용 오류 방지)
    const [hireY, hireM1, hireD] = emp.Date_of_joining.split('-').map(Number)
    const hireM = hireM1 - 1  // 0-based

    // 이번 달의 유효 기념일(말일 처리: 31일 입사 → 30일 달이면 말일로)
    const lastDayOfMonth   = new Date(Date.UTC(todayY, todayM + 1, 0)).getUTCDate()
    const effectiveHireDay = Math.min(hireD, lastDayOfMonth)

    if (todayD !== effectiveHireDay) continue  // 오늘이 기념일이 아님

    const monthsElapsed = (todayY - hireY) * 12 + (todayM - hireM)
    const basis         = policyMap.get(emp.company_id) ?? 'hire_date'
    const dh            = dailyHours(emp.weekly_work_hours)

    // hireDateAnnualDays 계산용 — 날짜 문자열 기반으로 안전하게 생성
    const hire = new Date(Date.UTC(hireY, hireM, hireD))

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

  const kstDate = `${todayY}-${String(todayM + 1).padStart(2, '0')}-${String(todayD).padStart(2, '0')}`
  return NextResponse.json({
    success:      errors.length === 0,
    date:         kstDate,
    monthlyCount,
    annualCount,
    errors:       errors.length > 0 ? errors : undefined,
  })
}
