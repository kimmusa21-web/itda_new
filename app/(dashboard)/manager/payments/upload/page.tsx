import { redirect }         from 'next/navigation'
import { createClient }     from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { PayslipCsvUpload } from '@/components/payslip-csv-upload/payslip-csv-upload'

export const metadata = { title: '급여 업로드 | itda' }

export default async function ManagerPaymentsUploadPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getEffectiveManagerContext()

  if (!ctx?.companyId) {
    return (
      <div className="card p-10 text-center text-slate-400">
        <p className="text-sm">회사 정보가 연결되지 않았습니다. 어드민에게 문의해주세요.</p>
      </div>
    )
  }

  const { companyId, companyName } = ctx

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <p className="text-xs text-slate-400 mb-1">{companyName} › 급여 관리</p>
        <h1 className="text-2xl font-bold text-slate-900">급여 CSV 업로드</h1>
        <p className="text-sm text-slate-500 mt-1">
          이메일로 직원을 매칭하여 급여 데이터를 저장합니다.
          같은 귀속월 데이터 재업로드 시 자동으로 덮어씁니다.
        </p>
      </div>

      <PayslipCsvUpload
        role="manager"
        defaultCompanyId={companyId}
      />
    </div>
  )
}
