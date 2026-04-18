import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Upload } from 'lucide-react'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { getCompanyEmployees } from '@/lib/supabase/queries/employee'
import { ManagerEmployeesClient } from './client'
import EmployeeExportButton from '@/components/employees/employee-export-button'

export const metadata = { title: '직원관리 | itda' }

export default async function ManagerEmployeesPage() {
  const ctx = await getEffectiveManagerContext()

  if (!ctx?.companyId) {
    return (
      <div className="card p-10 text-center text-slate-400">
        <p className="text-sm">회사 정보가 연결되지 않았습니다. 어드민에게 문의해주세요.</p>
      </div>
    )
  }

  const { companyId, companyName } = ctx
  const employees = await getCompanyEmployees(companyId)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">직원 관리</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {companyName} · 재직 {employees.filter(e => e.is_active).length}명
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
          <EmployeeExportButton companyId={companyId} companyName={companyName} />
          <Link href="/manager/employees/upload" className="btn-secondary">
            <Upload size={15} />
            CSV 대량 등록
          </Link>
          <Link href="/manager/employees/create" className="btn-primary">
            <Plus size={16} />
            등록 요청
          </Link>
        </div>
      </div>

      <ManagerEmployeesClient initialEmployees={employees} companyName={companyName} />
    </div>
  )
}
