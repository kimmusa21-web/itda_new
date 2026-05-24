import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { EmployeeForm } from '@/components/employee/employee-form'

export const metadata = { title: '직원 등록' }

export default async function ManagerEmployeeCreatePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getEffectiveManagerContext()

  if (!ctx?.companyId) {
    return (
      <div className="card p-10 text-center text-slate-400">
        <p className="text-sm">회사 정보가 연결되지 않았습니다. 어드민에게 문의해주세요.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <EmployeeForm
        companyId={ctx.companyId}
        companyName={ctx.companyName}
      />
    </div>
  )
}
