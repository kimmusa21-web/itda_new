import { redirect }             from 'next/navigation'
import { createClient }         from '@/lib/supabase/server'
import { getCompanies }         from '@/lib/payroll-upload'
import { PayrollUploadPage }    from '@/components/payroll-upload/payroll-upload-page'

export const metadata = { title: '급여 CSV 업로드 | itda' }

export default async function AdminPayrollUploadPage() {
  /* 어드민 권한 확인 */
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  /* SSR: 회사 목록 */
  const companies = await getCompanies()

  return (
    <PayrollUploadPage
      companies={companies}
      currentUserId={user.id}
    />
  )
}
