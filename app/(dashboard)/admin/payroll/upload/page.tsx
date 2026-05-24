import { redirect }           from 'next/navigation'
import { createClient }       from '@/lib/supabase/server'
import { getCompanies }       from '@/lib/payroll-upload'
import { AdminUploadTabs }    from './upload-tabs'

export const metadata = { title: '급여업로드' }

export default async function AdminPayrollUploadPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  const companies = await getCompanies()

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* 페이지 헤더 */}
      <div>
        <p className="text-xs text-slate-400 mb-1">어드민 › 급여업로드</p>
        <h1 className="text-2xl font-bold text-slate-900">급여업로드</h1>
        <p className="text-sm text-slate-500 mt-1">
          CSV 파일로 급여 데이터를 등록합니다. 같은 귀속월 재업로드 시 자동으로 덮어씁니다.
        </p>
      </div>

      {/* 탭 업로드 (간편 / 고급) */}
      <AdminUploadTabs companies={companies} currentUserId={user.id} />
    </div>
  )
}
