import { redirect, notFound }  from 'next/navigation'
import { createClient }         from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { getAdminEmployeePayslipDetail } from '@/lib/employee-payslips'
import { PayslipDetailView }    from '@/components/payslip/payslip-detail-v2'

export async function generateMetadata() {
  return { title: '급여명세서' }
}

interface Props {
  params: { payMonth: string; employeeId: string }
}

export default async function ManagerEmployeePayslipPage({ params }: Props) {
  const payMonth   = params.payMonth
  const employeeId = Number(params.employeeId)

  if (isNaN(employeeId) || !/^\d{4}-\d{2}$/.test(payMonth)) notFound()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role

  // manager 본인 또는 빙의 중인 admin만 허용
  if (role !== 'manager' && role !== 'admin') redirect(`/${role ?? 'employee'}`)

  const ctx = await getEffectiveManagerContext()
  if (!ctx) redirect('/manager')

  const detail = await getAdminEmployeePayslipDetail(ctx.companyId, payMonth, employeeId)
  if (!detail) notFound()

  return (
    <PayslipDetailView
      detail={detail}
      backHref={`/manager/payroll/${payMonth}`}
      backLabel="급여대장"
    />
  )
}
