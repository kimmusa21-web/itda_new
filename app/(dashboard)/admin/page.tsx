import { redirect }    from 'next/navigation'
import Link           from 'next/link'
import { Building2, Users, Upload, BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getNotices }   from '@/lib/actions/notices'
import NoticesPanel     from '@/components/admin/notices-panel'

export default async function AdminDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role,name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  const [
    { count: companyCount },
    { count: employeeCount },
    notices,
  ] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
    getNotices(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">대시보드</h1>
        <p className="text-sm text-slate-500 mt-0.5">안녕하세요, {profile?.name}님</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/admin/companies"
          className="stat-card hover:bg-white hover:border hover:border-slate-200 transition-all rounded-xl">
          <p className="stat-label">등록 기업</p>
          <p className="stat-value">{companyCount ?? 0}</p>
          <div className="flex items-center gap-1 mt-1">
            <Building2 size={11} className="text-slate-400" />
            <span className="text-xs text-slate-400">전체 보기</span>
          </div>
        </Link>
        <Link href="/admin/employees"
          className="stat-card hover:bg-white hover:border hover:border-slate-200 transition-all rounded-xl">
          <p className="stat-label">재직 직원</p>
          <p className="stat-value">{employeeCount ?? 0}</p>
          <div className="flex items-center gap-1 mt-1">
            <Users size={11} className="text-slate-400" />
            <span className="text-xs text-slate-400">관리</span>
          </div>
        </Link>
      </div>

      {/* 빠른 이동 */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/admin/payroll/upload"
          className="flex items-center gap-3 bg-[#0f172a] rounded-2xl px-4 py-4 hover:bg-[#1e293b] transition-colors">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Upload size={17} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">급여업로드</p>
            <p className="text-xs text-slate-400 mt-0.5">CSV 파일 등록</p>
          </div>
        </Link>
        <Link href="/admin/payroll"
          className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-4 hover:bg-slate-50 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <BarChart3 size={17} className="text-slate-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">급여 조회</p>
            <p className="text-xs text-slate-400 mt-0.5">월별 내역 확인</p>
          </div>
        </Link>
      </div>

      {/* 공지사항 */}
      <NoticesPanel initialNotices={notices} />
    </div>
  )
}
