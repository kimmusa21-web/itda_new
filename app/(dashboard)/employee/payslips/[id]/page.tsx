import { notFound, redirect } from 'next/navigation'
import { createClient }       from '@/lib/supabase/server'
import { getEffectiveEmployeeContext } from '@/lib/impersonation/get-effective-context'
import {
  getEmployeePayslipById,
} from '@/lib/employee-payslips'
import { PayslipDetailView }  from '@/components/payslip/payslip-detail-v2'

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props) {
  return { title: `급여명세서 #${params.id} | itda` }
}

export default async function EmployeePayslipDetailPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role
  if (role !== 'employee' && role !== 'admin' && role !== 'manager') redirect(`/${role ?? 'admin'}`)

  const id = parseInt(params.id, 10)
  if (isNaN(id)) notFound()

  const empCtx = await getEffectiveEmployeeContext()
  if (!empCtx) redirect('/employee/payslips')

  const detail = await getEmployeePayslipById(id, empCtx.employeeId)
  if (!detail) notFound()

  return <PayslipDetailView detail={detail} />
}
