import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { ManagerDocumentsClient } from './client'

export const metadata = { title: '서류관리' }

export default async function ManagerDocumentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getEffectiveManagerContext()
  if (!ctx?.companyId) {
    return (
      <div className="card p-10 text-center text-slate-400 text-sm">
        회사 정보가 연결되지 않았습니다. 어드민에게 문의하세요.
      </div>
    )
  }

  const { data: requests } = await supabase
    .from('document_requests')
    .select(`
      id, document_type, purpose, address, note, status,
      rejection_reason, requested_at, approved_at, rejected_at,
      employees(id, name, email, department, position)
    `)
    .eq('company_id', ctx.companyId)
    .order('requested_at', { ascending: false })

  // 세무사 정보 확인
  const { data: company } = await supabase
    .from('companies')
    .select('tax_accountant_company, tax_accountant_name, tax_accountant_email')
    .eq('id', ctx.companyId)
    .single()

  return (
    <ManagerDocumentsClient
      requests={requests ?? []}
      hasTaxAccountant={!!company?.tax_accountant_email}
    />
  )
}
