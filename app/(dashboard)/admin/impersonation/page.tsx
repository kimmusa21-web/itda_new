import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ImpersonationPanel } from './panel'

export const metadata = { title: '점검 모드' }

export default async function AdminImpersonationPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  /* ── 회사 목록 ── */
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, biz_number, representative, status')
    .eq('status', 'active')
    .order('name')

  /* ── 직원 목록 (회사명 join) ── */
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, email, company_id, department, position, is_active, companies(name)')
    .eq('is_active', true)
    .order('name')

  return (
    <ImpersonationPanel
      companies={companies ?? []}
      employees={(employees ?? []).map(e => ({
        id:          e.id,
        name:        e.name,
        email:       e.email,
        companyId:   e.company_id,
        companyName: (e.companies as { name?: string } | null)?.name ?? '',
        department:  e.department,
        position:    e.position,
      }))}
    />
  )
}
