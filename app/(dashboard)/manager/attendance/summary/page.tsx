import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { getMonthlyAttendanceSummary } from '@/lib/actions/attendance-actions'
import { kstToday } from '@/lib/utils/kst'
import { MonthlySummaryClient } from './client'

export const metadata = { title: '월별 근로시간' }

export default async function AttendanceSummaryPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getEffectiveManagerContext()
  if (!ctx) {
    return <div className="card p-10 text-center text-slate-400 text-sm">회사 정보가 없습니다.</div>
  }

  const month = searchParams.month ?? kstToday().slice(0, 7)
  const rows  = await getMonthlyAttendanceSummary(month)

  return <MonthlySummaryClient month={month} rows={rows} />
}
