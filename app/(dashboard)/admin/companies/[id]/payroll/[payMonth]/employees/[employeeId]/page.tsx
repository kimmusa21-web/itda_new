import { redirect, notFound }  from 'next/navigation'
import { createClient }         from '@/lib/supabase/server'
import { getAdminEmployeePayslipDetail } from '@/lib/employee-payslips'
import { PayslipDetailView }    from '@/components/payslip/payslip-detail-v2'

export async function generateMetadata({ params }: Props) {
  return { title: '급여명세서' }
}

interface Props {
  params: { id: string; payMonth: string; employeeId: string }
}

export default async function AdminEmployeePayslipPage({ params }: Props) {
  const companyId  = Number(params.id)
  const payMonth   = params.payMonth
  const employeeId = Number(params.employeeId)

  if (isNaN(companyId) || isNaN(employeeId) || !/^\d{4}-\d{2}$/.test(payMonth)) notFound()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  const detail = await getAdminEmployeePayslipDetail(companyId, payMonth, employeeId)
  if (!detail) notFound()

  return (
    <PayslipDetailView
      detail={detail}
      backHref={`/admin/companies/${companyId}/payroll/${payMonth}`}
      backLabel="급여대장"
    />
  )
}
