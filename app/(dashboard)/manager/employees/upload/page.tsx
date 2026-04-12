import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { EmployeeCsvUpload } from '@/components/employee-upload/employee-csv-upload'

export const metadata = { title: '직원 CSV 대량 등록 | itda' }

export default async function ManagerEmployeeUploadPage() {
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
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-start gap-4">
        <Link
          href="/manager/employees"
          className="mt-0.5 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Users size={20} className="text-slate-400" />
            직원 CSV 대량 등록
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {companyName} · CSV 파일로 여러 직원을 한 번에 등록합니다.
          </p>
        </div>
      </div>

      <div className="card p-6">
        <EmployeeCsvUpload
          role="manager"
          defaultCompanyId={companyId}
        />
      </div>
    </div>
  )
}
