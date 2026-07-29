import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getImpersonationContext } from '@/lib/impersonation/server'
import { parseFeatures, type CompanyFeatures } from '@/lib/features'
import type { Role } from '@/types'
import { GuideClient } from './client'

export const metadata = { title: '사용 설명서' }

export default async function GuidePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, company_id').eq('id', user.id).maybeSingle()

  const role = (profile?.role ?? 'employee') as Role

  /* ── 점검 모드(빙의) 중이면 대상 역할 기준으로 노출 ── */
  const impersonation = role === 'admin' ? getImpersonationContext() : null
  const validImpersonation = impersonation?.adminUserId === user.id ? impersonation : null
  const effectiveRole: Role = validImpersonation
    ? (validImpersonation.type === 'company_manager' ? 'manager' : 'employee')
    : role

  /* ── 회사 기능 구성 — 사용하지 않는 기능 설명은 숨김 ── */
  let companyId: number | null = validImpersonation?.companyId ?? profile?.company_id ?? null
  if (!companyId && role === 'employee') {
    const { data: emp } = await supabase
      .from('employees').select('company_id').eq('user_id', user.id).eq('is_active', true).maybeSingle()
    companyId = emp?.company_id ?? null
  }

  let features: CompanyFeatures | null = null
  if (companyId) {
    const { data: co } = await supabase
      .from('companies').select('features').eq('id', companyId).maybeSingle()
    features = co ? parseFeatures(co.features as Record<string, boolean> | null) : null
  }

  return <GuideClient role={effectiveRole} features={features} userId={user.id} />
}
