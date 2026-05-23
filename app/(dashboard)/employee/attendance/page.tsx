import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveEmployeeContext } from '@/lib/impersonation/get-effective-context'
import { kstToday, kstFirstOfMonth } from '@/lib/utils/kst'
import { getEmployeeAttendanceRange, getMissingAttendanceDays } from '@/lib/actions/attendance-actions'
import { getWeekRange } from '@/lib/utils/work-hours'
import { AttendanceClient } from './client'
import type { AttendanceLog } from '@/types/attendance'

export const metadata = { title: '출퇴근 | itda' }

export default async function EmployeeAttendancePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getEffectiveEmployeeContext()
  if (!ctx) {
    return (
      <div className="card p-10 text-center text-slate-400 text-sm">
        직원 정보를 찾을 수 없습니다.
      </div>
    )
  }

  const today      = kstToday()
  const monthStart = kstFirstOfMonth()
  const weekRange  = getWeekRange(today)
  // 이번 주가 이전 달에 걸칠 경우를 위해 더 이른 날짜부터 조회
  const fetchStart = weekRange.start < monthStart ? weekRange.start : monthStart

  const [{ data: todayLog }, { data: company }, periodLogs, missingDays] = await Promise.all([
    supabase
      .from('attendance_logs')
      .select('*')
      .eq('employee_id', ctx.employeeId)
      .eq('work_date', today)
      .maybeSingle(),
    supabase
      .from('companies')
      .select('latitude, longitude, allowed_radius_m')
      .eq('id', ctx.companyId)
      .single(),
    getEmployeeAttendanceRange(fetchStart, today),
    getMissingAttendanceDays(),
  ])

  return (
    <AttendanceClient
      today={today}
      todayLog={(todayLog as AttendanceLog | null)}
      company={company ?? null}
      isImpersonating={ctx.isImpersonating}
      employeeName={ctx.employeeName}
      periodLogs={periodLogs}
      missingDays={missingDays}
    />
  )
}
