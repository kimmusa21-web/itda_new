import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCompanyEmployees } from '@/lib/supabase/queries/employee'
import { ManagerEmployeesClient } from './client'

export const metadata = { title: '직원관리 | itda' }

export default async function ManagerEmployeesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id, companies(name)')
    .eq('id', user.id)
    .single()

  if (!['admin', 'manager'].includes(profile?.role ?? '')) redirect('/employee')

  const companyId   = profile?.company_id
  const companyName = (profile?.companies as any)?.name ?? ''

  if (!companyId) {
    return (
      <div className="card p-10 text-center text-slate-400">
        <p className="text-sm">회사 정보가 연결되지 않았습니다. 어드민에게 문의해주세요.</p>
      </div>
    )
  }

  const employees = await getCompanyEmployees(companyId)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">직원 관리</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {companyName} · 재직 {employees.filter(e => e.is_active).length}명
          </p>
        </div>
        <Link href="/manager/employees/create" className="btn-primary flex-shrink-0">
          <Plus size={16} />
          등록 요청
        </Link>
      </div>

      <ManagerEmployeesClient initialEmployees={employees} companyName={companyName} />
    </div>
  )
}
