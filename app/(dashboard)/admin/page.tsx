import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Building2, Users, Upload, BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getRequests } from '@/lib/supabase/queries/company'
import { getAllBatches } from '@/lib/supabase/queries/payslip'
import { getMyNotifications } from '@/lib/supabase/queries/notifications'
import { formatMonth } from '@/lib/utils'
import AdminNotificationsPanel from '@/components/admin/notifications-panel'

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
    pendingRequests,
    recentBatches,
    notifications,
  ] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
    getRequests('pending'),
    getAllBatches(),
    getMyNotifications(30),
  ])

  const pendingCount = pendingRequests.length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">대시보드</h1>
          <p className="text-sm text-slate-500 mt-0.5">안녕하세요, {profile?.name}님</p>
        </div>
        <button className="btn-primary flex-shrink-0">
          <Plus size={16} />공지 등록
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/admin/companies" className="stat-card hover:bg-white hover:border hover:border-slate-200 transition-all rounded-xl">
          <p className="stat-label">등록 기업</p>
          <p className="stat-value">{companyCount ?? 0}</p>
          <div className="flex items-center gap-1 mt-1">
            <Building2 size={11} className="text-slate-400" />
            <span className="text-xs text-slate-400">전체 보기</span>
          </div>
        </Link>
        <Link href="/admin/employees" className="stat-card hover:bg-white hover:border hover:border-slate-200 transition-all rounded-xl">
          <p className="stat-label">재직 직원</p>
          <p className="stat-value">{employeeCount ?? 0}</p>
          <div className="flex items-center gap-1 mt-1">
            <Users size={11} className="text-slate-400" />
            <span className="text-xs text-slate-400">관리</span>
          </div>
        </Link>
        <Link href="/admin/requests" className="stat-card hover:bg-white hover:border hover:border-slate-200 transition-all rounded-xl">
          <p className="stat-label">승인 대기</p>
          <div className="flex items-baseline gap-1">
            <p className={`stat-value ${pendingCount > 0 ? 'text-amber-600' : ''}`}>{pendingCount}</p>
            {pendingCount > 0 && <span className="text-xs text-amber-500 font-medium">건</span>}
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-amber-500">처리 필요</span>
            </div>
          )}
        </Link>
      </div>

      {/* 빠른 이동 CTA */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/admin/payroll/upload"
          className="flex items-center gap-3 bg-[#0f172a] rounded-2xl px-4 py-4 hover:bg-[#1e293b] transition-colors group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Upload size={17} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">급여업로드</p>
            <p className="text-xs text-slate-400 mt-0.5">CSV 파일 등록</p>
          </div>
        </Link>
        <Link href="/admin/payroll"
          className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-4 hover:bg-slate-50 transition-colors group">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <BarChart3 size={17} className="text-slate-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">급여 조회</p>
            <p className="text-xs text-slate-400 mt-0.5">월별 내역 확인</p>
          </div>
        </Link>
      </div>

      {/* Recent batches */}
      {recentBatches.length > 0 && (
        <section>
          <div className="section-header">
            <h2 className="section-title">최근 급여 업로드</h2>
            <Link href="/admin/payroll" className="text-xs text-blue-600 hover:underline">전체 보기</Link>
          </div>
          <div className="card overflow-hidden divide-y divide-slate-50">
            {recentBatches.slice(0, 5).map((b: any) => (
              <div key={b.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{b.companies?.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatMonth(b.accrual_month)} · {b.row_count}명 · {b.file_name}
                  </p>
                </div>
                <span className={`badge ${b.status==='done' ? 'badge-green' : b.status==='error' ? 'badge-red' : 'badge-yellow'}`}>
                  {b.status==='done' ? '완료' : b.status==='error' ? '오류' : '처리중'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 알림 */}
      <AdminNotificationsPanel notifications={notifications} />
    </div>
  )
}
