import { notFound, redirect }  from 'next/navigation'
import { createClient }        from '@/lib/supabase/server'
import { getCurrentEmployee, getEmployeePayslipById } from '@/lib/employee-payslips'
import { PayslipDetailView }   from '@/components/payslip/payslip-detail-v2'

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props) {
  return { title: `급여명세서 #${params.id} | itda` }
}

export default async function EmployeePayslipDetailPage({ params }: Props) {
  /* ── 인증 ── */
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'employee') redirect(`/${profile?.role ?? 'admin'}`)

  /* ── ID 파싱 ── */
  const id = parseInt(params.id, 10)
  if (isNaN(id)) notFound()

  /* ── 직원 확인 ── */
  const employee = await getCurrentEmployee()
  if (!employee) redirect('/employee/payslips')

  /* ── 상세 조회 (employee_id 검증 포함) ── */
  const detail = await getEmployeePayslipById(id, employee.id)
  if (!detail) notFound()

  return <PayslipDetailView detail={detail} />
}
