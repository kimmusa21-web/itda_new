import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveEmployeeContext } from '@/lib/impersonation/get-effective-context'
import { DocumentsClient } from './client'

export const metadata = { title: '서류신청 | itda' }

export default async function EmployeeDocumentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const empCtx = await getEffectiveEmployeeContext()
  if (!empCtx) {
    return (
      <div className="card p-10 text-center text-slate-400 text-sm">
        직원 정보가 연결되지 않았습니다. 관리자에게 문의하세요.
      </div>
    )
  }

  const { data: requests } = await supabase
    .from('document_requests')
    .select('id, document_type, purpose, address, note, status, rejection_reason, requested_at, approved_at, rejected_at')
    .eq('employee_id', empCtx.employeeId)
    .order('requested_at', { ascending: false })

  return (
    <DocumentsClient
      requests={requests ?? []}
      employeeName={empCtx.employeeName}
    />
  )
}
