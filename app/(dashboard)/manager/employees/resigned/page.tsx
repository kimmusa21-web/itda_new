import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { getCompanyEmployees } from '@/lib/supabase/queries/employee'
import ManagerResignedClient from './client'

export const metadata = { title: '퇴사자 관리 | itda' }

export default async function ManagerResignedPage() {
  const ctx = await getEffectiveManagerContext()

  if (!ctx?.companyId) {
    return (
      <div className="card p-10 text-center text-slate-400">
        <p className="text-sm">회사 정보가 연결되지 않았습니다. 어드민에게 문의해주세요.</p>
      </div>
    )
  }

  const { companyId, companyName } = ctx
  const employees = await getCompanyEmployees(companyId, { isActive: false })

  return (
    <ManagerResignedClient
      initialEmployees={employees}
      companyName={companyName}
    />
  )
}
