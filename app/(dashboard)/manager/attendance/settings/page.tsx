import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { AttendanceSettingsClient } from './client'

export const metadata = { title: '출퇴근 설정' }

export default async function AttendanceSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getEffectiveManagerContext()
  if (!ctx) {
    return <div className="card p-10 text-center text-slate-400 text-sm">회사 정보가 없습니다.</div>
  }

  const [{ data: settings }, { data: company }] = await Promise.all([
    supabase
      .from('attendance_settings')
      .select('*')
      .eq('company_id', ctx.companyId)
      .maybeSingle(),
    supabase
      .from('companies')
      .select('latitude, longitude, allowed_radius_m, address')
      .eq('id', ctx.companyId)
      .single(),
  ])

  return (
    <AttendanceSettingsClient
      settings={settings ?? null}
      company={company ?? null}
      companyAddress={company?.address ?? null}
    />
  )
}
