import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmployeeForm } from '@/components/employee/employee-form'

export const metadata = { title: '직원 등록 | itda' }

export default async function ManagerEmployeeCreatePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id, companies(name)')
    .eq('id', user.id)
    .single()

  if (!['admin', 'manager'].includes(profile?.role ?? '')) redirect('/employee')

  const companyId   = profile?.company_id ?? 0
  const companyName = (profile?.companies as any)?.name ?? ''

  // 어드민이 manager 화면 대행하는 경우도 지원
  // companyId = 0 이면 접근 불가
  if (!companyId) {
    return (
      <div className="card p-10 text-center text-slate-400">
        <p className="text-sm">회사 정보가 연결되지 않았습니다. 어드민에게 문의해주세요.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <EmployeeForm
        companyId={companyId}
        companyName={companyName}
        useMock={false}   // 실제 Supabase 연동
      />
    </div>
  )
}
