import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyNotifications } from '@/lib/supabase/queries/notifications'
import { getAllEmployees } from '@/lib/supabase/queries/employee'
import AdminRequestsClient from './client'

export const metadata = { title: '기업신청 | itda' }

export default async function AdminRequestsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  const [
    { data: companyRequests },
    notifications,
    resignedEmployees,
    { data: withdrawalRequests },
  ] = await Promise.all([
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

  // 직원 등록 알림
  const employeeNotifications = notifications.filter(
    n => n.type === 'new_employee_registered',
  )

  // 그 외 알림 (기업신청/직원등록/퇴사/탈퇴 알림 제외 — 탭으로 이미 표시됨)
  const otherNotifications = notifications.filter(
    n => !['new_employee_registered', 'employee_resignation', 'new_company_request', 'company_withdrawal_request'].includes(n.type),
  )

  return (
    <AdminRequestsClient
      companyRequests={companyRequests ?? []}
      employeeNotifications={employeeNotifications}
      resignedEmployees={resignedEmployees}
      withdrawalRequests={(withdrawalRequests ?? []) as any}
      otherNotifications={otherNotifications}
    />
  )
}
