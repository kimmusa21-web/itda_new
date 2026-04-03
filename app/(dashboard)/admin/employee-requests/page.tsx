import { redirect }              from 'next/navigation'
import { createClient }          from '@/lib/supabase/server'
import { getEmployeeRequests }   from '@/lib/employee-requests'
import { RequestPage }           from '@/components/employee-request/request-page'

export const metadata = { title: '직원 가입신청 승인 | itda' }

/**
 * 어드민 직원 가입신청 관리 페이지
 * - SSR로 초기 데이터 fetch (새로고침 후 상태 유지)
 * - 승인/거절은 Client에서 Server Action 호출
 */
export default async function AdminEmployeeRequestsPage() {
  /* 어드민 권한 확인 */
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  /* SSR: 초기 목록 (pending 기본) */
  const initialRequests = await getEmployeeRequests({ status: 'pending' })

  return (
    <RequestPage
      initialRequests={initialRequests}
      currentUserId={user.id}
    />
  )
}
