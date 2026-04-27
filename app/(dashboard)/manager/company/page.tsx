import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { CompanyForm } from '@/components/company/company-form'

export const metadata = { title: '기업관리 | itda' }

export default async function ManagerCompanyPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getEffectiveManagerContext()
  if (!ctx?.companyId) {
    return (
      <div className="card p-10 text-center text-slate-400">
        <p className="text-sm">회사 정보가 연결되지 않았습니다. 어드민에게 문의하세요.</p>
      </div>
    )
  }

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', ctx.companyId)
    .single()

  if (!company) {
    return (
      <div className="card p-10 text-center text-slate-400">
        <p className="text-sm">회사 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <CompanyForm
        mode="edit"
        managerMode
        hideStatusField
        successHref="/manager/company"
        cancelHref="/manager/company"
        initialData={{
          id:                  company.id,
          name:                company.name,
          biz_number:          company.biz_number ?? '',
          representative:      company.representative ?? '',
          contact_name:        company.contact_name ?? '',
          contact_email:       company.contact_email ?? '',
          'Business type':     company['Business type'] ?? '',
          Industry:            company.Industry ?? '',
          Telephone:           company.Telephone ?? '',
          address:             company.address ?? '',
          'tax invoice email': company['tax invoice email'] ?? '',
          status:              company.status ?? 'active',
          payslip_note:            company.payslip_note ?? null,
          payslip_note_overrides:  (company as any).payslip_note_overrides ?? null,
          payroll_day:             (company as any).payroll_day ?? null,
          payroll_start_day:       (company as any).payroll_start_day ?? null,
        }}
      />
    </div>
  )
}
