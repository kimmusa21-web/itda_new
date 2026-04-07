import { redirect }            from 'next/navigation'
import Link                    from 'next/link'
import { createClient }        from '@/lib/supabase/server'
import { getManagerRequests }  from '@/lib/employee-requests'
import { ManagerRequestList }  from '@/components/manager-request/manager-request-list'

export const metadata = { title: '직원 등록 신청 내역 | itda' }

export default async function ManagerRequestsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!['admin', 'manager'].includes(profile?.role ?? '')) redirect('/employee')

  const requests = await getManagerRequests()

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400 mb-1">직원 관리 › 신청 내역</p>
          <h1 className="text-2xl font-bold text-slate-900">직원 등록 신청 내역</h1>
          <p className="text-sm text-slate-500 mt-1">
            내가 등록한 직원 가입신청 목록입니다. 어드민 승인 후 계정이 활성화됩니다.
          </p>
        </div>
        <Link
          href="/manager/employees/create"
          className="btn-primary flex-shrink-0"
        >
          + 직원 신청
        </Link>
      </div>

      <ManagerRequestList requests={requests} />
    </div>
  )
}
