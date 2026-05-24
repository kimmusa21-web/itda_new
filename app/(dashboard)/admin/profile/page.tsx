import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StaffProfileClient } from '@/components/profile/staff-profile-client'

export const metadata = { title: '내 정보' }

export default async function AdminProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, role, company_id, department, position')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'login'}`)

  const { data: emp } = await supabase
    .from('employees')
    .select('Tel, birthdate, Sex, Grade, Role, job, "Working place"')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <StaffProfileClient
      name={profile.name ?? ''}
      email={profile.email ?? user.email ?? ''}
      role="admin"
      phone={emp?.Tel ?? ''}
      birthdate={emp?.birthdate ?? ''}
      gender={emp?.Sex ?? ''}
      department={profile.department ?? ''}
      position={profile.position ?? ''}
      grade={emp?.Grade ?? ''}
      roleTitle={emp?.Role ?? ''}
      job={emp?.job ?? ''}
      workLocation={emp?.['Working place'] ?? ''}
      companyName=""
    />
  )
}
