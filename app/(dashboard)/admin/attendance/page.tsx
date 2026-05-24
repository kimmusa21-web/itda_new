import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminAttendanceList } from '@/lib/actions/attendance-actions'
import { kstToday } from '@/lib/utils/kst'
import { AdminAttendanceClient } from './client'

export const metadata = { title: '근태관리' }

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: { date?: string; companyId?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/admin')

  const date      = searchParams.date      ?? kstToday()
  const companyId = searchParams.companyId ? Number(searchParams.companyId) : undefined

  const [rows, { data: companies }] = await Promise.all([
    getAdminAttendanceList({ date, companyId }),
    supabase
      .from('companies')
      .select('id, name')
      .eq('status', 'active')
      .order('name'),
  ])

  return (
    <AdminAttendanceClient
      date={date}
      companyId={companyId ?? null}
      rows={rows}
      companies={companies ?? []}
    />
  )
}
