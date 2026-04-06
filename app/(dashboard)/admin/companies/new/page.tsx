import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CompanyForm } from '@/components/company/company-form'

export const metadata = { title: '회사 등록 | itda' }

export default async function AdminCompanyNewPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  return (
    <div className="max-w-2xl">
      <CompanyForm mode="create" />
    </div>
  )
}
