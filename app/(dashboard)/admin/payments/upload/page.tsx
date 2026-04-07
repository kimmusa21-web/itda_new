import { redirect }        from 'next/navigation'
import { createClient }    from '@/lib/supabase/server'
import { PayslipCsvUpload } from '@/components/payslip-csv-upload/payslip-csv-upload'

export const metadata = { title: '급여 업로드 | itda' }

export default async function AdminPaymentsUploadPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  /* 회사 목록 */
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <p className="text-xs text-slate-400 mb-1">어드민 › 급여 관리</p>
        <h1 className="text-2xl font-bold text-slate-900">급여 CSV 업로드</h1>
        <p className="text-sm text-slate-500 mt-1">
          이메일로 직원을 매칭하여 pay_info_v2에 저장합니다.
          같은 귀속월 데이터 재업로드 시 자동으로 덮어씁니다.
        </p>
      </div>

      <PayslipCsvUpload
        role="admin"
        companies={companies ?? []}
      />
    </div>
  )
}
