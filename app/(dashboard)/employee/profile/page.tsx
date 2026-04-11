import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileClient } from './client'

export const metadata = { title: '내 정보 | itda' }

export default async function EmployeeProfilePage() {
  const supabase = createClient()

  /* ── 인증 확인 ── */
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'employee') redirect(`/${profile?.role ?? 'login'}`)

  /* ── 직원 정보 조회 (user_id 우선, email fallback) ── */
  let emp: {
    id: number; name: string; email: string; company_id: number
    department: string | null; position: string | null
    Date_of_joining: string | null; birthdate: string | null
  } | null = null

  const { data: byUid } = await supabase
    .from('employees')
    .select('id, name, email, company_id, department, position, Date_of_joining, birthdate')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (byUid) {
    emp = byUid
  } else {
    const { data: byEmail } = await supabase
      .from('employees')
      .select('id, name, email, company_id, department, position, Date_of_joining, birthdate')
      .ilike('email', user.email ?? '')
      .eq('is_active', true)
      .maybeSingle()
    emp = byEmail ?? null
  }

  /* ── 회사 이름 조회 ── */
  let companyName = ''
  if (emp?.company_id) {
    const { data: co } = await supabase
      .from('companies').select('name').eq('id', emp.company_id).single()
    companyName = co?.name ?? ''
  }

  return (
    <ProfileClient
      name={emp?.name ?? user.email?.split('@')[0] ?? ''}
      email={emp?.email ?? user.email ?? ''}
      department={emp?.department ?? null}
      position={emp?.position ?? null}
      joinDate={emp?.Date_of_joining ?? null}
      company={companyName}
    />
  )
}
