import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CompanyForm } from '@/components/company/company-form'

export const metadata = { title: '회사 수정 | itda' }

interface Props {
  params: { id: string }
}

export default async function AdminCompanyEditPage({ params }: Props) {
  const id = Number(params.id)
  if (isNaN(id)) notFound()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  const { data: company, error } = await supabase
    .from('companies').select('*').eq('id', id).single()

  if (error || !company) notFound()

  return (
    <div className="max-w-2xl">
      <CompanyForm
        mode="edit"
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
