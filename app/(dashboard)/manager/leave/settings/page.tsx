import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { LeaveSettingsClient } from './client'

export const metadata = { title: '연차 정책 설정' }

export default async function LeaveSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getEffectiveManagerContext()
  if (!ctx?.companyId) return (
    <div className="card p-10 text-center text-slate-400 text-sm">회사 정보가 없습니다.</div>
  )

  const { data: policy } = await supabase
    .from('leave_policies')
    .select('*')
    .eq('company_id', ctx.companyId)
    .single()

  return <LeaveSettingsClient policy={policy} companyId={ctx.companyId} />
}
