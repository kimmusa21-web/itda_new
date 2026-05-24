import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveEmployeeContext } from '@/lib/impersonation/get-effective-context'
import { ProfileClient } from './client'

export const metadata = { title: '내 정보' }

export default async function EmployeeProfilePage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  if (role !== 'employee' && role !== 'admin' && role !== 'manager') redirect(`/${role ?? 'login'}`)

  const empCtx = await getEffectiveEmployeeContext()

  let companyName = ''
  if (empCtx?.companyId) {
    const { data: co } = await supabase
      .from('companies').select('name').eq('id', empCtx.companyId).single()
    companyName = co?.name ?? ''
  }

  return (
    <ProfileClient
      empId={empCtx?.employeeId ?? null}
      name={empCtx?.employeeName ?? (profile?.email?.split('@')[0] ?? '')}
      email={empCtx?.employeeEmail ?? (profile?.email ?? '')}
      employeeNumber={empCtx?.employeeNumber ?? null}
      phone={empCtx?.phone ?? ''}
      department={empCtx?.department ?? null}
      position={empCtx?.position ?? null}
      joinDate={empCtx?.dateOfJoining ?? null}
      birthdate={empCtx?.birthdate ?? null}
      gender={empCtx?.gender ?? null}
      grade={empCtx?.grade ?? null}
      roleTitle={empCtx?.roleTitle ?? null}
      job={empCtx?.job ?? null}
      workLocation={empCtx?.workLocation ?? null}
      company={companyName}
    />
  )
}
