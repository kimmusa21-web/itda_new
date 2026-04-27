import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { InviteList } from '@/components/manager-request/invite-list'

export const metadata = { title: '초대 내역 | itda' }

export default async function ManagerRequestsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getEffectiveManagerContext()
  if (!ctx?.companyId) {
    return (
      <div className="card p-10 text-center text-slate-400">
        <p className="text-sm">회사 정보가 연결되지 않았습니다. 어드민에게 문의하세요.</p>
      </div>
    )
  }

  const { data: invites } = await supabase
    .from('employees')
    .select('id, name, email, department, position, Date_of_joining, is_active, user_id, created_at')
    .eq('company_id', ctx.companyId)
    .order('created_at', { ascending: false })

  const list = (invites ?? []).map(e => ({
    id:          e.id as number,
    name:        e.name as string,
    email:       e.email as string,
    department:  e.department as string | null,
    position:    e.position as string | null,
    joinDate:    e.Date_of_joining as string | null,
    isActive:    e.is_active as boolean,
    hasAccount:  e.user_id !== null,
    createdAt:   e.created_at as string,
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400 mb-1">직원 관리 › 초대 내역</p>
          <h1 className="text-2xl font-bold text-slate-900">직원 초대 내역</h1>
          <p className="text-sm text-slate-500 mt-1">
            {ctx.companyName} · 등록된 직원 초대 현황입니다.
          </p>
        </div>
        <Link href="/manager/employees/create" className="btn-primary flex-shrink-0">
          + 직원 초대
        </Link>
      </div>

      <InviteList companyId={ctx.companyId} initialList={list} />
    </div>
  )
}
