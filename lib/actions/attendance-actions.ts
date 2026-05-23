'use server'

import { revalidatePath }      from 'next/cache'
import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  getEffectiveManagerContext,
  getEffectiveEmployeeContext,
} from '@/lib/impersonation/get-effective-context'
import { calculateDistanceMeters } from '@/lib/utils/distance'
import { kstToday, kstFirstOfMonth, isAllowedWorkDate } from '@/lib/utils/kst'
import { calcWorkMinutes } from '@/lib/utils/work-hours'
import { isWorkday, prefetchHolidaysForYear } from '@/lib/utils/korean-holidays'
import type {
  CheckInInput, CheckOutInput, UpdateAttendanceInput,
  AttendanceSettings, AttendanceLog, AttendanceRow, MonthlySummaryRow, WorkType,
} from '@/types/attendance'

/* ── 내부: manager들에게 누락 입력/수정 알림 ──────────────── */
async function sendLateEntryNotification(
  companyId:    number,
  employeeName: string,
  workDate:     string,
  logId:        number,
  isModified:   boolean,
) {
  const supabase = createServiceClient()
  const { data: managers } = await supabase
    .from('profiles')
    .select('id')
    .eq('company_id', companyId)
    .eq('role', 'manager')

  if (!managers?.length) return

  const title   = isModified
    ? `누락 출퇴근 수정: ${employeeName}`
    : `누락 출퇴근 입력: ${employeeName}`
  const message = `${workDate} 출퇴근 기록이 ${isModified ? '수정' : '입력'}되었습니다.`

  await supabase.from('notifications').insert(
    managers.map(m => ({
      user_id:   m.id,
      type:      isModified ? 'late_attendance_modified' : 'late_attendance_entry',
      title,
      message,
      target_id: String(logId),
    }))
  )
}

/* ── 내부: 알림 설정 조회 ─────────────────────────────────── */
async function fetchSettings(companyId: number) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('attendance_settings')
    .select('notify_late_entry, notify_late_modified')
    .eq('company_id', companyId)
    .maybeSingle()
  return data ?? { notify_late_entry: true, notify_late_modified: false }
}

/* ── 출근 ─────────────────────────────────────────────────── */
export async function checkIn(
  input: CheckInInput,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const ctx = await getEffectiveEmployeeContext()
  if (!ctx) return { success: false, error: '직원 정보를 찾을 수 없습니다.' }

  if (!isAllowedWorkDate(input.work_date)) {
    return { success: false, error: '이번 달 범위 내 날짜만 입력할 수 있습니다.' }
  }

  if (input.work_type === 'field' && !input.work_note?.trim()) {
    return { success: false, error: '외근 시 방문지 또는 사유를 입력해주세요.' }
  }

  const { data: existing } = await supabase
    .from('attendance_logs')
    .select('id, status')
    .eq('employee_id', ctx.employeeId)
    .eq('work_date', input.work_date)
    .maybeSingle()

  if (existing?.status === 'checked_in' || existing?.status === 'checked_out') {
    return { success: false, error: '이미 출근 기록이 있습니다. 수정 버튼을 사용해주세요.' }
  }

  // 사무실 출근 반경 체크
  let distanceM: number | null = null
  if (input.work_type === 'office') {
    const { data: company } = await supabase
      .from('companies')
      .select('latitude, longitude, allowed_radius_m')
      .eq('id', ctx.companyId)
      .single()

    if (!company?.latitude || !company?.longitude) {
      return { success: false, error: '회사 위치가 설정되지 않았습니다. 담당자에게 문의해주세요.' }
    }

    distanceM = calculateDistanceMeters(
      company.latitude, company.longitude,
      input.latitude, input.longitude,
    )
    const radius = company.allowed_radius_m ?? 100
    if (distanceM > radius) {
      return {
        success: false,
        error: `회사 출근 가능 반경 밖입니다. (현재 ${distanceM}m / 허용 ${radius}m 이내)`,
      }
    }
  } else {
    // field/remote: 참고용 거리 (차단 없음)
    const { data: company } = await supabase
      .from('companies')
      .select('latitude, longitude')
      .eq('id', ctx.companyId)
      .single()
    if (company?.latitude && company?.longitude) {
      distanceM = calculateDistanceMeters(
        company.latitude, company.longitude,
        input.latitude, input.longitude,
      )
    }
  }

  const today  = kstToday()
  const isLate = input.work_date < today
  const nowIso = new Date().toISOString()

  const { data: log, error } = await supabase
    .from('attendance_logs')
    .insert({
      company_id:          ctx.companyId,
      employee_id:         ctx.employeeId,
      work_date:           input.work_date,
      work_type:           input.work_type,
      work_note:           input.work_note ?? null,
      check_in_at:         nowIso,
      check_in_latitude:   input.latitude,
      check_in_longitude:  input.longitude,
      check_in_distance_m: distanceM,
      check_in_accuracy_m: input.accuracy_m,
      status:              'checked_in',
      is_late_entry:       isLate,
      late_entry_note:     input.late_entry_note ?? null,
      is_impersonated:     ctx.isImpersonating,
      entered_by_user_id:  user.id,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  if (isLate) {
    const settings = await fetchSettings(ctx.companyId)
    if (settings.notify_late_entry) {
      await sendLateEntryNotification(ctx.companyId, ctx.employeeName, input.work_date, log.id, false)
    }
  }

  revalidatePath('/employee/attendance')
  return { success: true }
}

/* ── 퇴근 ─────────────────────────────────────────────────── */
export async function checkOut(
  input: CheckOutInput,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const ctx = await getEffectiveEmployeeContext()
  if (!ctx) return { success: false, error: '직원 정보를 찾을 수 없습니다.' }

  if (!isAllowedWorkDate(input.work_date)) {
    return { success: false, error: '이번 달 범위 내 날짜만 입력할 수 있습니다.' }
  }

  const { data: log } = await supabase
    .from('attendance_logs')
    .select('id, status, check_in_at, work_type')
    .eq('employee_id', ctx.employeeId)
    .eq('work_date', input.work_date)
    .maybeSingle()

  if (!log || log.status === 'not_started') {
    return { success: false, error: '출근 기록이 없습니다. 먼저 출근해주세요.' }
  }
  if (log.status === 'checked_out') {
    return { success: false, error: '이미 퇴근 처리되었습니다. 수정 버튼을 사용해주세요.' }
  }

  const nowIso = new Date().toISOString()
  if (log.check_in_at && nowIso <= log.check_in_at) {
    return { success: false, error: '퇴근 시간이 출근 시간보다 빠릅니다.' }
  }

  let distanceM: number | null = null
  const { data: company } = await supabase
    .from('companies')
    .select('latitude, longitude')
    .eq('id', ctx.companyId)
    .single()
  if (company?.latitude && company?.longitude) {
    distanceM = calculateDistanceMeters(
      company.latitude, company.longitude,
      input.latitude, input.longitude,
    )
  }

  const { error } = await supabase
    .from('attendance_logs')
    .update({
      check_out_at:          nowIso,
      check_out_latitude:    input.latitude,
      check_out_longitude:   input.longitude,
      check_out_distance_m:  distanceM,
      check_out_accuracy_m:  input.accuracy_m,
      status:                'checked_out',
      entered_by_user_id:    user.id,
      is_impersonated:       ctx.isImpersonating,
    })
    .eq('id', log.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/employee/attendance')
  return { success: true }
}

/* ── 출퇴근 수정 ──────────────────────────────────────────── */
export async function updateAttendance(
  input: UpdateAttendanceInput,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const ctx = await getEffectiveEmployeeContext()
  if (!ctx) return { success: false, error: '직원 정보를 찾을 수 없습니다.' }

  const { data: log } = await supabase
    .from('attendance_logs')
    .select('id, employee_id, work_date, check_in_at, check_out_at, is_late_entry')
    .eq('id', input.log_id)
    .maybeSingle()

  if (!log) return { success: false, error: '출퇴근 기록을 찾을 수 없습니다.' }
  if (log.employee_id !== ctx.employeeId) return { success: false, error: '본인 기록만 수정할 수 있습니다.' }

  if (!isAllowedWorkDate(log.work_date)) {
    return { success: false, error: '이번 달 범위 내 기록만 수정할 수 있습니다.' }
  }

  const newCheckIn  = input.check_in_at  ?? log.check_in_at
  const newCheckOut = input.check_out_at ?? log.check_out_at
  if (newCheckIn && newCheckOut && newCheckIn >= newCheckOut) {
    return { success: false, error: '퇴근 시간은 출근 시간보다 늦어야 합니다.' }
  }

  const updates: Record<string, unknown> = {
    entered_by_user_id: user.id,
    is_impersonated:    ctx.isImpersonating,
  }
  if (input.work_type       !== undefined) updates.work_type       = input.work_type
  if (input.work_note       !== undefined) updates.work_note       = input.work_note
  if (input.check_in_at     !== undefined) updates.check_in_at     = input.check_in_at
  if (input.check_out_at    !== undefined) updates.check_out_at    = input.check_out_at
  if (input.late_entry_note !== undefined) updates.late_entry_note = input.late_entry_note

  const finalIn  = input.check_in_at  !== undefined ? input.check_in_at  : log.check_in_at
  const finalOut = input.check_out_at !== undefined ? input.check_out_at : log.check_out_at
  updates.status = finalOut ? 'checked_out' : finalIn ? 'checked_in' : 'not_started'

  const { error } = await supabase
    .from('attendance_logs')
    .update(updates)
    .eq('id', input.log_id)

  if (error) return { success: false, error: error.message }

  if (log.is_late_entry) {
    const settings = await fetchSettings(ctx.companyId)
    if (settings.notify_late_modified) {
      await sendLateEntryNotification(ctx.companyId, ctx.employeeName, log.work_date, log.id, true)
    }
  }

  revalidatePath('/employee/attendance')
  return { success: true }
}

/* ── 특정 날짜 출퇴근 조회 (employee) ────────────────────── */
export async function getAttendanceByDate(workDate: string): Promise<AttendanceLog | null> {
  const supabase = createClient()
  const ctx = await getEffectiveEmployeeContext()
  if (!ctx) return null

  const { data } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('employee_id', ctx.employeeId)
    .eq('work_date', workDate)
    .maybeSingle()

  return (data as AttendanceLog | null)
}

/* ── 직원 날짜 범위 출퇴근 조회 ──────────────────────────── */
export async function getEmployeeAttendanceRange(
  startDate: string,
  endDate:   string,
): Promise<AttendanceLog[]> {
  const supabase = createClient()
  const ctx = await getEffectiveEmployeeContext()
  if (!ctx) return []

  const { data } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('employee_id', ctx.employeeId)
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .order('work_date', { ascending: true })

  return (data as AttendanceLog[]) ?? []
}

/* ── manager 출퇴근 현황 조회 ─────────────────────────────── */
export async function getManagerAttendanceList(date: string): Promise<{
  rows:      AttendanceRow[]
  employees: { id: number; name: string; employee_number: string | null; department: string | null; position: string | null }[]
}> {
  const supabase = createClient()
  const ctx = await getEffectiveManagerContext()
  if (!ctx) return { rows: [], employees: [] }

  const { data: emps } = await supabase
    .from('employees')
    .select('id, name, employee_number, department, position')
    .eq('company_id', ctx.companyId)
    .eq('is_active', true)
    .order('name')

  const { data: logs } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('company_id', ctx.companyId)
    .eq('work_date', date)

  const logMap = new Map<number, AttendanceLog>((logs ?? []).map(l => [l.employee_id as number, l as AttendanceLog]))

  const rows: AttendanceRow[] = (emps ?? []).map(emp => {
    const log = logMap.get(emp.id)
    if (log) {
      return {
        ...log,
        employee_name:   emp.name,
        employee_number: emp.employee_number ?? null,
        department:      emp.department      ?? null,
        position:        emp.position        ?? null,
      }
    }
    return {
      id: 0, company_id: ctx.companyId, employee_id: emp.id,
      work_date: date, work_type: 'office', work_note: null,
      check_in_at: null, check_out_at: null,
      check_in_latitude: null, check_in_longitude: null,
      check_out_latitude: null, check_out_longitude: null,
      check_in_distance_m: null, check_out_distance_m: null,
      check_in_accuracy_m: null, check_out_accuracy_m: null,
      status: 'not_started', is_late_entry: false, late_entry_note: null,
      is_impersonated: false, entered_by_user_id: null,
      created_at: '', updated_at: '',
      employee_name: emp.name, employee_number: emp.employee_number ?? null,
      department: emp.department ?? null, position: emp.position ?? null,
    } as AttendanceRow
  })

  return { rows, employees: emps ?? [] }
}

/* ── admin 출퇴근 현황 조회 ───────────────────────────────── */
export async function getAdminAttendanceList(filters: {
  companyId?: number
  date: string
}): Promise<AttendanceRow[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return []

  type LogRow = AttendanceLog & {
    employees: { name: string; employee_number: string | null; department: string | null; position: string | null } | null
    companies:  { name: string } | null
  }

  let query = supabase
    .from('attendance_logs')
    .select('*, employees(name, employee_number, department, position), companies(name)')
    .eq('work_date', filters.date)

  if (filters.companyId) query = query.eq('company_id', filters.companyId)

  const { data } = await query.order('created_at', { ascending: false })

  return (data ?? []).map((row: LogRow) => ({
    ...row,
    employee_name:   row.employees?.name            ?? '',
    employee_number: row.employees?.employee_number ?? null,
    department:      row.employees?.department      ?? null,
    position:        row.employees?.position        ?? null,
    company_name:    row.companies?.name            ?? '',
  }))
}

/* ── 출퇴근 설정 저장 ─────────────────────────────────────── */
export async function saveAttendanceSettings(
  data: Partial<Pick<AttendanceSettings, 'notify_late_entry' | 'notify_late_modified'>>,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const ctx = await getEffectiveManagerContext()
  if (!ctx) return { success: false, error: '권한이 없습니다.' }

  const { error } = await supabase
    .from('attendance_settings')
    .upsert({ company_id: ctx.companyId, ...data }, { onConflict: 'company_id' })

  if (error) return { success: false, error: error.message }
  revalidatePath('/manager/attendance/settings')
  return { success: true }
}

/* ── 출퇴근 설정 조회 ─────────────────────────────────────── */
export async function getAttendanceSettings(): Promise<AttendanceSettings | null> {
  const supabase = createClient()
  const ctx = await getEffectiveManagerContext()
  if (!ctx) return null

  const { data } = await supabase
    .from('attendance_settings')
    .select('*')
    .eq('company_id', ctx.companyId)
    .maybeSingle()

  return (data as AttendanceSettings | null)
}

/* ── 월별 근로시간 집계 ───────────────────────────────────── */
export async function getMonthlyAttendanceSummary(month: string): Promise<MonthlySummaryRow[]> {
  const supabase = createClient()
  const ctx = await getEffectiveManagerContext()
  if (!ctx) return []

  const startDate = `${month}-01`
  const [year, mon] = month.split('-').map(Number)
  const lastDay   = new Date(year, mon, 0).getDate()
  const endDate   = `${month}-${String(lastDay).padStart(2, '0')}`

  const [{ data: emps }, { data: logs }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, name, employee_number, department, position')
      .eq('company_id', ctx.companyId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('attendance_logs')
      .select('employee_id, status, work_type, check_in_at, check_out_at')
      .eq('company_id', ctx.companyId)
      .gte('work_date', startDate)
      .lte('work_date', endDate),
  ])

  const logsByEmp = new Map<number, { status: string; work_type: string; check_in_at: string | null; check_out_at: string | null }[]>()
  for (const log of logs ?? []) {
    const id = log.employee_id as number
    if (!logsByEmp.has(id)) logsByEmp.set(id, [])
    logsByEmp.get(id)!.push(log as { status: string; work_type: string; check_in_at: string | null; check_out_at: string | null })
  }

  return (emps ?? []).map(emp => {
    const empLogs = logsByEmp.get(emp.id) ?? []
    let days_worked = 0
    let days_incomplete = 0
    let total_minutes = 0
    let overtime_minutes = 0
    const work_types = { office: 0, field: 0, remote: 0 }

    for (const log of empLogs) {
      const wt = (log.work_type as WorkType) in work_types ? log.work_type as WorkType : 'office'
      if (log.status === 'checked_out' && log.check_in_at && log.check_out_at) {
        days_worked++
        const mins = calcWorkMinutes(log.check_in_at, log.check_out_at)
        total_minutes    += mins
        overtime_minutes += Math.max(0, mins - 480)
        work_types[wt]++
      } else if (log.status === 'checked_in') {
        days_incomplete++
        work_types[wt]++
      }
    }

    return {
      employee_id:      emp.id,
      employee_name:    emp.name,
      employee_number:  emp.employee_number ?? null,
      department:       emp.department      ?? null,
      position:         emp.position        ?? null,
      days_worked,
      days_incomplete,
      total_minutes,
      overtime_minutes,
      work_types,
    }
  })
}

/* ── 근태 미입력일 조회 (이번달 1일~어제, 근무일 기준) ──────── */
export async function getMissingAttendanceDays(): Promise<string[]> {
  const supabase = createClient()
  const ctx = await getEffectiveEmployeeContext()
  if (!ctx) return []

  const today      = kstToday()
  const monthStart = kstFirstOfMonth()

  const yDate = new Date(today + 'T00:00:00+09:00')
  yDate.setDate(yDate.getDate() - 1)
  const yesterday = yDate.toISOString().slice(0, 10)

  if (yesterday < monthStart) return []

  // API 공휴일 데이터 프리페치 (실패 시 하드코딩 폴백)
  await prefetchHolidaysForYear(parseInt(today.slice(0, 4)))

  const workdays: string[] = []
  const cur = new Date(monthStart + 'T00:00:00+09:00')
  const end = new Date(yesterday + 'T00:00:00+09:00')
  while (cur <= end) {
    const d = cur.toISOString().slice(0, 10)
    if (isWorkday(d)) workdays.push(d)
    cur.setDate(cur.getDate() + 1)
  }

  if (workdays.length === 0) return []

  const { data: logs } = await supabase
    .from('attendance_logs')
    .select('work_date')
    .eq('employee_id', ctx.employeeId)
    .gte('work_date', monthStart)
    .lte('work_date', yesterday)

  const recorded = new Set((logs ?? []).map((l: { work_date: string }) => l.work_date))

  return workdays.filter(d => !recorded.has(d))
}

/* ── 회사 위치 저장 ───────────────────────────────────────── */
export async function saveCompanyLocation(data: {
  latitude:         number
  longitude:        number
  allowed_radius_m: number
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const ctx = await getEffectiveManagerContext()
  if (!ctx) return { success: false, error: '권한이 없습니다.' }

  const { error } = await supabase
    .from('companies')
    .update(data)
    .eq('id', ctx.companyId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/manager/attendance/settings')
  revalidatePath('/manager/company')
  return { success: true }
}
