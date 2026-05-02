import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Upload } from 'lucide-react'

export const metadata = { title: '급여업로드 | itda' }

export default async function ManagerPayrollUploadPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role
  if (role !== 'manager' && role !== 'admin') redirect(`/${role ?? 'employee'}`)

  // admin은 admin 업로드 페이지로 리다이렉트
  if (role === 'admin') redirect('/admin/payroll/upload')

  return (
    <div className="max-w-xl mx-auto mt-20 text-center space-y-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-2">
        <Upload className="w-7 h-7 text-slate-400" />
      </div>
      <h1 className="text-xl font-bold text-slate-800">급여업로드 준비 중</h1>
      <p className="text-sm text-slate-500 leading-relaxed">
        급여 업로드 기능은 현재 준비 중입니다.<br />
        급여 등록이 필요하시면 담당자에게 문의해주세요.
      </p>
      <a
        href="/manager/payroll"
        className="inline-block mt-4 text-sm text-blue-600 hover:underline"
      >
        급여 조회로 돌아가기
      </a>
    </div>
  )
}
