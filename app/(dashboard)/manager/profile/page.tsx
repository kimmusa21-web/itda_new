import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StaffProfileClient } from '@/components/profile/staff-profile-client'

export const metadata = { title: '내 정보 | itda' }

export default async function ManagerProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, role, company_id, department, position')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager') redirect(`/${profile?.role ?? 'login'}`)

  const { data: emp } = await supabase
    .from('employees')
    .select('Tel, birthdate, Sex, Grade, Role, job, "Working place"')
    .eq('user_id', user.id)
    .maybeSingle()

  let companyName = ''
  if (profile.company_id) {
    const { data: co } = await supabase
      .from('companies').select('name').eq('id', profile.company_id).single()
    companyName = co?.name ?? ''
  }

  return (
    <StaffProfileClient
      name={profile.name ?? ''}
      email={profile.email ?? user.email ?? ''}
      role="manager"
      phone={emp?.Tel ?? ''}
      birthdate={emp?.birthdate ?? ''}
      gender={emp?.Sex ?? ''}
      department={profile.department ?? ''}
      position={profile.position ?? ''}
      grade={emp?.Grade ?? ''}
      roleTitle={emp?.Role ?? ''}
      job={emp?.job ?? ''}
      workLocation={emp?.['Working place'] ?? ''}
      companyName={companyName}
    />
  )
}
