import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CompanyListClient } from './client'

export const metadata = { title: '기업관리 | itda' }

export default async function AdminCompaniesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  // 삭제되지 않은 회사 목록 (직원 수 포함)
  const { data: companies } = await supabase
    .from('companies')
    .select('*, employees(count)')
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">기업관리</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            등록된 기업 {companies?.length ?? 0}개
          </p>
        </div>
        <Link href="/admin/companies/new" className="btn-primary flex-shrink-0">
          <Plus size={16} />
          새 회사 등록
        </Link>
      </div>

      <CompanyListClient initialCompanies={companies ?? []} />
    </div>
  )
}
