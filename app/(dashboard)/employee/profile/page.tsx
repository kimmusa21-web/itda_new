import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveEmployeeContext } from '@/lib/impersonation/get-effective-context'
import { ProfileClient } from './client'

export const metadata = { title: '내 정보 | itda' }

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
  if (role !== 'employee' && role !== 'admin') redirect(`/${role ?? 'login'}`)

  // 유효 직원 컨텍스트 조회
  const empCtx = await getEffectiveEmployeeContext()

  // 회사 이름 조회
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
      phoneNumber={''}
      department={empCtx?.department ?? null}
      position={empCtx?.position ?? null}
      joinDate={empCtx?.dateOfJoining ?? null}
      company={companyName}
    />
  )
}
