import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, LogOut } from 'lucide-react'
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

  // 삭제되지 않고 탈퇴하지 않은 회사 목록 (직원 수 포함)
  const [{ data: companies }, { count: withdrawnCount }] = await Promise.all([
    supabase
      .from('companies')
      .select('*, employees(count)')
      .is('deleted_at', null)
      .neq('status', 'withdrawn')
      .order('name'),
    supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'withdrawn'),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">기업관리</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            운영 기업 {companies?.length ?? 0}개
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {(withdrawnCount ?? 0) > 0 && (
            <Link
              href="/admin/companies/withdrawn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <LogOut size={13} />
              탈퇴 기업 {withdrawnCount}개
            </Link>
          )}
          <Link href="/admin/companies/new" className="btn-primary">
            <Plus size={16} />
            새 회사 등록
          </Link>
        </div>
      </div>

      <CompanyListClient initialCompanies={companies ?? []} />
    </div>
  )
}
