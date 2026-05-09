'use server'

import { revalidatePath }    from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import {
  dailyHours, calcRequestHours, calcExpiresAt,
  monthlyAccrualDays, fiscalYearAnnualDays, hireDateAnnualDays,
} from '@/lib/leave-calculator'
import {
  sendLeaveRequestNotification,
  sendLeaveApprovalEmail,
  sendLeaveRejectionEmail,
} from '@/lib/email'
import type { LeaveBasis, LeaveType } from '@/types/leave'

/* ── 정책 저장 ──────────────────────────────────────────────── */
export async function saveLeavePolicy(data: {
  basis:            LeaveBasis
  allow_negative:   boolean
  auto_approve:     boolean
  settle_on_resign: boolean
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const ctx = await getEffectiveManagerContext()
  if (!ctx?.companyId) return { success: false, error: '회사 정보가 없습니다' }

  const { error } = await supabase
    .from('leave_policies')
    .upsert({ company_id: ctx.companyId, ...data, updated_at: new Date().toISOString() },
             { onConflict: 'company_id' })

  if (error) return { success: false, error: error.message }
  revalidatePath('/manager/leave')
  return { success: true }
}

/* ── 정책 조회 ──────────────────────────────────────────────── */
export async function getLeavePolicy(companyId: number) {
  const supabase = createClient()
  const { data } = await supabase
    .from('leave_policies')
    .select('*')
    .eq('company_id', companyId)
    .single()
  return data
}

/* ── 월차 자동 적립 (매월 1일, 입사 후 1~11개월) ────────────── */
export async function accrueMonthlyLeave(
  employeeId: number,
  companyId:  number,
  hireDate:   string,
  weeklyHours: number | null,
  basis:      LeaveBasis,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const hire = new Date(hireDate)
  const now  = new Date()
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const days = monthlyAccrualDays(hire, period)
  if (days === 0) return { success: true }  // 해당 없음

  const dh         = dailyHours(weeklyHours)
  const totalHours = days * dh
  const expiresAt  = calcExpiresAt(period)

  const { error } = await supabase
    .from('leave_balances')
    .upsert({
      company_id: companyId, employee_id: employeeId,
      basis, period, period_type: 'monthly',
      total_hours: totalHours, expires_at: expiresAt,
    }, { onConflict: 'employee_id,period,basis', ignoreDuplicates: true })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/* ── 연간 연차 발급 (1년 이상, 매년 초 or 입사 기념일) ──────── */
export async function allocateAnnualLeave(
  employeeId:  number,
  companyId:   number,
  hireDate:    string,
  weeklyHours: number | null,
  basis:       LeaveBasis,
  year:        number,
): Promise<{ success: boolean; error?: string }> {
  const supabase  = createClient()
  const hire      = new Date(hireDate)
  const dh        = dailyHours(weeklyHours)

  const days = basis === 'hire_date'
    ? hireDateAnnualDays(hire, year)
    : fiscalYearAnnualDays(hire, year)

  if (days === 0) return { success: true }

  const totalHours = days * dh
  const period     = String(year)
  const expiresAt  = calcExpiresAt(period)

  const { error } = await supabase
    .from('leave_balances')
    .upsert({
      company_id: companyId, employee_id: employeeId,
      basis, period, period_type: 'annual',
      total_hours: totalHours, expires_at: expiresAt,
    }, { onConflict: 'employee_id,period,basis', ignoreDuplicates: true })

  if (error) return { success: false, error: error.message }
  revalidatePath('/manager/leave')
  return { success: true }
}

/* ── 회사 전체 직원 연차 일괄 발급 ──────────────────────────── */
export async function allocateLeaveForAllEmployees(year?: number): Promise<{ success: boolean; error?: string; count?: number }> {
  const supabase = createClient()
  const ctx = await getEffectiveManagerContext()
  if (!ctx?.companyId) return { success: false, error: '회사 정보가 없습니다' }

  const policy = await getLeavePolicy(ctx.companyId)
  if (!policy) return { success: false, error: '연차 정책을 먼저 설정해주세요' }

  const targetYear = year ?? new Date().getFullYear()

  const { data: employees } = await supabase
    .from('employees')
    .select('id, Date_of_joining, weekly_work_hours')
    .eq('company_id', ctx.companyId)
    .eq('is_active', true)
    .not('Date_of_joining', 'is', null)

  if (!employees?.length) return { success: true, count: 0 }

  const today = new Date()
  let count = 0
  for (const emp of employees) {
    const hire = new Date(emp.Date_of_joining!)
    // 1년 미만 근속자는 월차만 적용 — 연차 발급 스킵
    const msWorked = today.getTime() - hire.getTime()
    if (msWorked < 365.25 * 24 * 3600 * 1000) continue

    const res = await allocateAnnualLeave(
      emp.id, ctx.companyId, emp.Date_of_joining!, emp.weekly_work_hours, policy.basis, targetYear,
    )
    if (res.success) count++
  }

  revalidatePath('/manager/leave')
  return { success: true, count }
}

/* ── 연차 잔액 조회 (직원용) ─────────────────────────────────── */
export async function getMyLeaveBalances() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: emp } = await supabase
    .from('employees')
    .select('id, company_id, weekly_work_hours')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!emp) return []

  const { data: policy } = await supabase
    .from('leave_policies')
    .select('basis')
    .eq('company_id', emp.company_id)
    .single()

  const basis = policy?.basis ?? 'hire_date'
  const currentYear = String(new Date().getFullYear())

  const { data: balances } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('employee_id', emp.id)
    .eq('basis', basis)
    .or(`period.eq.${currentYear},period.like.${currentYear}-%`)
    .order('period')

  return balances ?? []
}

/* ── 연차 신청 (직원) ────────────────────────────────────────── */
export async function requestLeave(data: {
  leave_type:   LeaveType
  start_date:   string
  end_date:     string
  reason:       string | null
  hourly_count?: number
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다' }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, company_id, weekly_work_hours, name, email')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!emp) return { success: false, error: '직원 정보를 찾을 수 없습니다' }

  const { data: policy } = await supabase
    .from('leave_policies')
    .select('*')
    .eq('company_id', emp.company_id)
    .single()
  if (!policy) return { success: false, error: '연차 정책이 설정되지 않았습니다' }

  const start = new Date(data.start_date)
  const end   = new Date(data.end_date)

  const hoursRequested = calcRequestHours(
    data.leave_type, start, end, emp.weekly_work_hours, data.hourly_count,
  )
  if (hoursRequested <= 0) return { success: false, error: '평일이 없거나 시간이 0입니다' }

  // 잔액 확인
  const year = String(start.getFullYear())
  const { data: balances } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('employee_id', emp.id)
    .eq('basis', policy.basis)
    .or(`period.eq.${year},period.like.${year}-%`)

  const totalRemaining = (balances ?? []).reduce((sum, b) => {
    return sum + b.total_hours + b.adj_hours - b.used_hours
  }, 0)

  if (!policy.allow_negative && totalRemaining < hoursRequested) {
    return { success: false, error: `잔여 연차가 부족합니다 (잔여: ${totalRemaining.toFixed(1)}시간, 신청: ${hoursRequested.toFixed(1)}시간)` }
  }

  // 가장 먼저 만료되는 잔액에서 차감
  const primaryBalance = (balances ?? []).sort((a, b) =>
    new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
  )[0]

  const status = policy.auto_approve ? 'approved' : 'pending'

  const { data: req, error } = await supabase
    .from('leave_requests')
    .insert({
      company_id:      emp.company_id,
      employee_id:     emp.id,
      balance_id:      primaryBalance?.id ?? null,
      leave_type:      data.leave_type,
      start_date:      data.start_date,
      end_date:        data.end_date,
      hours_requested: hoursRequested,
      reason:          data.reason,
      status,
      ...(policy.auto_approve ? { approved_at: new Date().toISOString() } : {}),
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // 자동승인이면 즉시 차감
  if (policy.auto_approve && primaryBalance) {
    await supabase
      .from('leave_balances')
      .update({ used_hours: primaryBalance.used_hours + hoursRequested, updated_at: new Date().toISOString() })
      .eq('id', primaryBalance.id)
  }

  // 매니저에게 신청 알림 (자동승인이 아닐 때)
  if (!policy.auto_approve) {
    const { data: managerProfile } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('company_id', emp.company_id)
      .eq('role', 'manager')
      .single()

    if (managerProfile?.email) {
      await sendLeaveRequestNotification(managerProfile.email, {
        managerName:  managerProfile.name ?? '담당자',
        employeeName: emp.name,
        leaveType:    data.leave_type,
        startDate:    data.start_date,
        endDate:      data.end_date,
        hours:        hoursRequested,
        reason:       data.reason,
      })
    }
  }

  revalidatePath('/employee/leave')
  revalidatePath('/manager/leave')
  return { success: true }
}

/* ── 연차 승인 (매니저) ─────────────────────────────────────── */
export async function approveLeaveRequest(requestId: number): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증 필요' }

  const { data: req } = await supabase
    .from('leave_requests')
    .select('*, employees(name, email, weekly_work_hours)')
    .eq('id', requestId)
    .single()

  if (!req) return { success: false, error: '신청 내역을 찾을 수 없습니다' }
  if (req.status !== 'pending') return { success: false, error: '이미 처리된 신청입니다' }

  const { error } = await supabase
    .from('leave_requests')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: user.id })
    .eq('id', requestId)

  if (error) return { success: false, error: error.message }

  // 잔액 차감
  if (req.balance_id) {
    const { data: bal } = await supabase.from('leave_balances').select('used_hours').eq('id', req.balance_id).single()
    if (bal) {
      await supabase.from('leave_balances')
        .update({ used_hours: bal.used_hours + req.hours_requested, updated_at: new Date().toISOString() })
        .eq('id', req.balance_id)
    }
  }

  // 직원에게 승인 알림
  const empArr = req.employees as unknown as { name: string; email: string }[]
  const emp = empArr?.[0]
  if (emp?.email) {
    await sendLeaveApprovalEmail(emp.email, {
      employeeName: emp.name,
      leaveType:    req.leave_type,
      startDate:    req.start_date,
      endDate:      req.end_date,
      hours:        req.hours_requested,
    })
  }

  revalidatePath('/manager/leave')
  revalidatePath('/employee/leave')
  return { success: true }
}

/* ── 연차 반려 (매니저) ─────────────────────────────────────── */
export async function rejectLeaveRequest(requestId: number, reason: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증 필요' }

  const { data: req } = await supabase
    .from('leave_requests')
    .select('*, employees(name, email)')
    .eq('id', requestId)
    .single()

  if (!req) return { success: false, error: '신청 내역을 찾을 수 없습니다' }
  if (req.status !== 'pending') return { success: false, error: '이미 처리된 신청입니다' }

  const { error } = await supabase
    .from('leave_requests')
    .update({ status: 'rejected', rejection_reason: reason, rejected_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) return { success: false, error: error.message }

  const empArr = req.employees as unknown as { name: string; email: string }[]
  const emp = empArr?.[0]
  if (emp?.email) {
    await sendLeaveRejectionEmail(emp.email, {
      employeeName: emp.name,
      leaveType:    req.leave_type,
      startDate:    req.start_date,
      endDate:      req.end_date,
      hours:        req.hours_requested,
      reason,
    })
  }

  revalidatePath('/manager/leave')
  revalidatePath('/employee/leave')
  return { success: true }
}

/* ── 연차 취소 (직원) ────────────────────────────────────────── */
export async function cancelLeaveRequest(requestId: number): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증 필요' }

  const { data: req } = await supabase
    .from('leave_requests')
    .select('status, balance_id, hours_requested, employees(user_id)')
    .eq('id', requestId)
    .single()

  if (!req) return { success: false, error: '신청 내역을 찾을 수 없습니다' }

  const empArr = req.employees as unknown as { user_id: string }[]
  if (empArr?.[0]?.user_id !== user.id) return { success: false, error: '권한이 없습니다' }
  if (!['pending', 'approved'].includes(req.status)) return { success: false, error: '취소할 수 없는 상태입니다' }

  await supabase.from('leave_requests').update({ status: 'cancelled' }).eq('id', requestId)

  // 승인됐던 경우 잔액 복원
  if (req.status === 'approved' && req.balance_id) {
    const { data: bal } = await supabase.from('leave_balances').select('used_hours').eq('id', req.balance_id).single()
    if (bal) {
      await supabase.from('leave_balances')
        .update({ used_hours: Math.max(0, bal.used_hours - req.hours_requested), updated_at: new Date().toISOString() })
        .eq('id', req.balance_id)
    }
  }

  revalidatePath('/employee/leave')
  revalidatePath('/manager/leave')
  return { success: true }
}

/* ── 수동 조정 (매니저/어드민) ──────────────────────────────── */
export async function adjustLeaveBalance(data: {
  employee_id: number
  balance_id:  number
  hours:       number   // 음수=차감, 양수=추가
  reason:      string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증 필요' }

  const ctx = await getEffectiveManagerContext()
  if (!ctx?.companyId) return { success: false, error: '회사 정보가 없습니다' }

  const { data: bal } = await supabase
    .from('leave_balances')
    .select('adj_hours, company_id')
    .eq('id', data.balance_id)
    .single()

  if (!bal) return { success: false, error: '잔액 정보를 찾을 수 없습니다' }
  if (bal.company_id !== ctx.companyId) return { success: false, error: '권한이 없습니다' }

  // adj_hours 누적
  const { error: balErr } = await supabase
    .from('leave_balances')
    .update({ adj_hours: bal.adj_hours + data.hours, updated_at: new Date().toISOString() })
    .eq('id', data.balance_id)

  if (balErr) return { success: false, error: balErr.message }

  // 이력 저장
  await supabase.from('leave_adjustments').insert({
    company_id:  ctx.companyId,
    employee_id: data.employee_id,
    balance_id:  data.balance_id,
    hours:       data.hours,
    reason:      data.reason,
    adjusted_by: user.id,
  })

  revalidatePath('/manager/leave')
  revalidatePath('/employee/leave')
  return { success: true }
}

/* ── 매니저용 직원 연차 현황 조회 ───────────────────────────── */
export async function getCompanyLeaveOverview() {
  const supabase = createClient()
  const ctx = await getEffectiveManagerContext()
  if (!ctx?.companyId) return null

  const policy = await getLeavePolicy(ctx.companyId)
  const year   = String(new Date().getFullYear())

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, department, position, Date_of_joining, weekly_work_hours')
    .eq('company_id', ctx.companyId)
    .eq('is_active', true)
    .order('name')

  const { data: balances } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('company_id', ctx.companyId)
    .eq('basis', policy?.basis ?? 'hire_date')
    .or(`period.eq.${year},period.like.${year}-%`)

  const { data: pendingRequests } = await supabase
    .from('leave_requests')
    .select('*, employees(name, department, position)')
    .eq('company_id', ctx.companyId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })

  return { policy, employees: employees ?? [], balances: balances ?? [], pendingRequests: pendingRequests ?? [] }
}

/* ── 직원용 내 연차 신청 이력 조회 ─────────────────────────── */
export async function getMyLeaveRequests() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!emp) return []

  const { data } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('employee_id', emp.id)
    .order('requested_at', { ascending: false })
    .limit(50)

  return data ?? []
}

/* ── 직원 조정 이력 조회 (직원도 볼 수 있음) ───────────────── */
export async function getMyLeaveAdjustments() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!emp) return []

  const { data } = await supabase
    .from('leave_adjustments')
    .select('*')
    .eq('employee_id', emp.id)
    .order('created_at', { ascending: false })

  return data ?? []
}
