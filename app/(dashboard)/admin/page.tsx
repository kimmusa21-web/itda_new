import { redirect }    from 'next/navigation'
import Link           from 'next/link'
import { Building2, Users, Upload, BarChart3, UserPlus, UserMinus, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getNotices }   from '@/lib/actions/notices'
import NoticesPanel     from '@/components/admin/notices-panel'
import ResignAlertPanel from '@/components/admin/resign-alert-panel'
import { getPendingResignees, getMissingPayrollEmployees } from '@/lib/actions/admin-hr-alerts'

export default async function AdminDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role,name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0]

  const [
    { count: companyCount },
    { count: employeeCount },
    notices,
    { data: recentHires },
    { data: recentResignations },
    pendingResignees,
    missingPayroll,
  ] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
    getNotices(),
    supabase
      .from('employees')
      .select('id, name, job, join_date, company_id, companies(name)')
      .gte('join_date', sixtyDaysAgoStr)
      .eq('is_active', true)
      .order('join_date', { ascending: false })
      .limit(15),
    supabase
      .from('employees')
      .select('id, name, job, quit_date, company_id, companies(name)')
      .gte('quit_date', sixtyDaysAgoStr)
      .eq('is_active', false)
      .not('quit_date', 'is', null)
      .order('quit_date', { ascending: false })
      .limit(15),
    getPendingResignees(),
    getMissingPayrollEmployees(),
  ])

  const hasHrChanges = (recentHires?.length ?? 0) > 0 || (recentResignations?.length ?? 0) > 0

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

      {/* 퇴사 처리 / 급여 누락 알림 */}
      <ResignAlertPanel pendingResignees={pendingResignees} missingPayroll={missingPayroll} />

      {/* 이달의 인사 처리사항 */}
      {hasHrChanges && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">이달의 인사 처리사항</h2>
            <span className="text-xs text-slate-400">최근 60일</span>
          </div>

          {(recentHires?.length ?? 0) > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <UserPlus size={13} className="text-emerald-600" />
                </div>
                <span className="text-sm font-semibold text-emerald-700">
                  신규 입사 {recentHires!.length}명
                </span>
              </div>
              <div className="space-y-2">
                {recentHires!.map((emp) => (
                  <Link
                    key={emp.id}
                    href={`/admin/companies/${emp.company_id}`}
                    className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 hover:bg-emerald-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {(emp.companies as unknown as { name: string } | null)?.name ?? '미지정'} · {emp.job ?? '직무미정'} · 입사 {emp.join_date}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 flex-shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(recentResignations?.length ?? 0) > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
                  <UserMinus size={13} className="text-red-600" />
                </div>
                <span className="text-sm font-semibold text-red-700">
                  퇴사 처리 {recentResignations!.length}명
                </span>
              </div>
              <div className="space-y-2">
                {recentResignations!.map((emp) => (
                  <Link
                    key={emp.id}
                    href={`/admin/companies/${emp.company_id}`}
                    className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 hover:bg-red-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {(emp.companies as unknown as { name: string } | null)?.name ?? '미지정'} · {emp.job ?? '직무미정'} · 퇴사 {emp.quit_date}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 flex-shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
