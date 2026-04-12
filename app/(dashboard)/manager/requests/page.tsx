import { redirect }            from 'next/navigation'
import Link                    from 'next/link'
import { createClient }        from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { getImpersonationContext }    from '@/lib/impersonation/server'
import { getManagerRequests, getCompanyEmployeeRequests } from '@/lib/employee-requests'
import { ManagerRequestList }  from '@/components/manager-request/manager-request-list'

export const metadata = { title: '직원 등록 신청 내역 | itda' }

export default async function ManagerRequestsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx          = await getEffectiveManagerContext()
  const impersonation = getImpersonationContext()
  const isImpersonating = impersonation?.adminUserId === user.id

  // 빙의 중: 해당 회사의 전체 신청 목록 조회
  // 실제 manager: 본인이 등록한 신청 목록 조회
  const requests = isImpersonating && ctx?.companyId
    ? await getCompanyEmployeeRequests(ctx.companyId)
    : await getManagerRequests()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400 mb-1">직원 관리 › 신청 내역</p>
          <h1 className="text-2xl font-bold text-slate-900">직원 등록 신청 내역</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isImpersonating
              ? `${ctx?.companyName ?? ''} 회사의 직원 가입신청 목록입니다.`
              : '내가 등록한 직원 가입신청 목록입니다. 어드민 승인 후 계정이 활성화됩니다.'}
          </p>
        </div>
        <Link href="/manager/employees/create" className="btn-primary flex-shrink-0">
          + 직원 신청
        </Link>
      </div>

      <ManagerRequestList requests={requests} />
    </div>
  )
}
