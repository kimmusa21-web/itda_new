import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { getManagerAttendanceList }   from '@/lib/actions/attendance-actions'
import { kstToday } from '@/lib/utils/kst'
import { ManagerAttendanceClient } from './client'

export const metadata = { title: '근태관리' }

export default async function ManagerAttendancePage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getEffectiveManagerContext()
  if (!ctx) {
    return <div className="card p-10 text-center text-slate-400 text-sm">회사 정보가 없습니다.</div>
  }

  const date = searchParams.date ?? kstToday()
  const { rows, employees } = await getManagerAttendanceList(date)

  return (
    <ManagerAttendanceClient
      date={date}
      rows={rows}
      employees={employees}
    />
  )
}
