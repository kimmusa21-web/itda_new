import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileClient } from './client'

export const metadata = { title: '내 정보 | itda' }

export default async function EmployeeProfilePage() {
  const supabase = createClient()

  /* ── 인증 확인 ── */
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  /* ── profiles 조회 (role + company_id + email) ── */
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id, email')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'employee') redirect(`/${profile?.role ?? 'login'}`)

  /* ── employees 조회: company_id + email 기준 (중복 매칭 방지) ── */
  const companyId    = profile?.company_id
  const profileEmail = (profile?.email ?? user.email ?? '').toLowerCase()

  let emp: {
    id:             number
    name:           string
    email:          string
    company_id:     number
    department:     string | null
    position:       string | null
    Date_of_joining: string | null
    phone_number:   string | null
  } | null = null

  if (companyId && profileEmail) {
    const { data } = await supabase
      .from('employees')
      .select('id, name, email, company_id, department, position, Date_of_joining, phone_number')
      .eq('company_id', companyId)
      .ilike('email', profileEmail)
      .eq('is_active', true)
      .maybeSingle()
    emp = data ?? null
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
      empId={emp?.id ?? null}
      name={emp?.name ?? user.email?.split('@')[0] ?? ''}
      email={emp?.email ?? profileEmail}
      phoneNumber={emp?.phone_number ?? ''}
      department={emp?.department ?? null}
      position={emp?.position ?? null}
      joinDate={emp?.Date_of_joining ?? null}
      company={companyName}
    />
  )
}
