import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNotices }   from '@/lib/actions/notices'
import { getMyNotifications } from '@/lib/supabase/queries/notifications'
import { getAllEmployees }    from '@/lib/supabase/queries/employee'
import { getPendingResignees, getMissingPayrollEmployees } from '@/lib/actions/admin-hr-alerts'
import AdminDashboardTabbed from './dashboard-client'

export const metadata = { title: '대시보드/알림 | itda' }

interface Props {
  searchParams: { tab?: string }
}

export default async function AdminDashboard({ searchParams }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role,name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  const initialTab = searchParams.tab === 'notifications' ? 'notifications' : 'dashboard'

  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0]

  const [
    { count: companyCount },
    { count: employeeCount },
    notices,
    { data: recentHires },
    { data: recentResignations },
    pendingResignees,
    missingPayroll,
    // 알림 탭 데이터
    { data: companyRequests },
    notifications,
    resignedEmployees,
    { data: withdrawalRequests },
  ] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
    getNotices(),
    supabase
      .from('employees')
      .select('id, name, job, join_date, company_id, companies(name)')
      .gte('join_date', sixtyDaysAgoStr)
      .eq('is_active', true)
      .order('join_date', { ascending: false })
      .limit(15),
    supabase
      .from('employees')
      .select('id, name, job, quit_date, company_id, companies(name)')
      .gte('quit_date', sixtyDaysAgoStr)
      .eq('is_active', false)
      .not('quit_date', 'is', null)
      .order('quit_date', { ascending: false })
      .limit(15),
    getPendingResignees(),
    getMissingPayrollEmployees(),
    // 알림 탭
    supabase
      .from('company_admin_requests')
      .select('*')
      .order('created_at', { ascending: false }),
    getMyNotifications(50),
    getAllEmployees({ isActive: false }),
    supabase
      .from('company_withdrawal_requests')
      .select(`
        id, status, note, data_downloaded, created_at, reviewed_at,
        companies ( id, name, biz_number, representative ),
        profiles!company_withdrawal_requests_requested_by_fkey ( name, email )
      `)
      .order('created_at', { ascending: false }),
  ])

  const employeeNotifications = notifications.filter(n => n.type === 'new_employee_registered')
  const otherNotifications    = notifications.filter(
    n => !['new_employee_registered', 'employee_resignation', 'new_company_request', 'company_withdrawal_request'].includes(n.type),
  )

  const requests    = companyRequests ?? []
  const withdrawals = (withdrawalRequests ?? []) as any[]

  const pendingCount =
    requests.filter((r: any) => r.status === 'pending').length +
    withdrawals.filter((r: any) => r.status === 'pending').length +
    employeeNotifications.filter(n => !n.is_read).length

  return (
    <AdminDashboardTabbed
      initialTab={initialTab}
      profileName={profile?.name ?? ''}
      companyCount={companyCount ?? 0}
      employeeCount={employeeCount ?? 0}
      notices={notices}
      recentHires={(recentHires ?? []) as any[]}
      recentResignations={(recentResignations ?? []) as any[]}
      pendingResignees={pendingResignees}
      missingPayroll={missingPayroll}
      companyRequests={requests as any[]}
      employeeNotifications={employeeNotifications}
      resignedEmployees={resignedEmployees}
      withdrawalRequests={withdrawals}
      otherNotifications={otherNotifications}
      pendingCount={pendingCount}
    />
  )
}
