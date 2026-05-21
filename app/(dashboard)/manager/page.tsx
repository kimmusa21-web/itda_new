import { redirect }   from 'next/navigation'
import Link           from 'next/link'
import { Plus, Users, CalendarDays, FolderOpen, UserPlus, ChevronRight, CalendarX, BookOpen } from 'lucide-react'
import { ManagerViewToggle } from '@/components/layout/ManagerViewToggle'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { getCompanyEmployees }  from '@/lib/supabase/queries/employee'
import { getAvailableMonthsV2 } from '@/lib/supabase/queries/payslip-v2'
import { formatMonth } from '@/lib/utils'
import EmptyState from '@/components/common/empty-state'

export const metadata = { title: '대시보드 | itda' }

const leaveTypeLabel: Record<string, string> = {
  full_day: '연차', half_day_am: '오전반차', half_day_pm: '오후반차', hourly: '시간연차',
}

export default async function ManagerDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getEffectiveManagerContext()
  if (!ctx?.companyId) redirect('/login')

  const companyId   = ctx.companyId
  const companyName = ctx.companyName

  const { data: profile } = await supabase
    .from('profiles').select('name').eq('id', user.id).single()

  /* ── 데이터 병렬 조회 ── */
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [employees, months, pendingLeave, pendingDocs, cancelledLeave] = await Promise.all([
    getCompanyEmployees(companyId),
    getAvailableMonthsV2(companyId),
    supabase
      .from('leave_requests')
      .select('id, leave_type, start_date, end_date, hours_requested, requested_at, employees(name)')
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false }),
    supabase
      .from('document_requests')
      .select('id, document_type, requested_at, employees(name)')
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false }),
    supabase
      .from('leave_requests')
      .select('id, leave_type, start_date, end_date, hours_requested, cancelled_at, employees(name)')
      .eq('company_id', companyId)
      .eq('status', 'cancelled')
      .not('cancelled_at', 'is', null)
      .gte('cancelled_at', sevenDaysAgo)
      .order('cancelled_at', { ascending: false }),
  ])

  const activeEmployees = employees.filter(e => e.is_active)
  const pendingInvites  = employees.filter(e => !e.is_active && !e.user_id)
  const latestMonth     = months[0] ?? null
  const recentEmployees = activeEmployees.slice(0, 4)

  const leaveList     = pendingLeave.data   ?? []
  const docList       = pendingDocs.data    ?? []
  const cancelledList = cancelledLeave.data ?? []

  const totalPending = pendingInvites.length + leaveList.length + docList.length + cancelledList.length

  return (
    <div className="space-y-6">
      {/* 관리자 / 직원 화면 전환 탭 */}
      <ManagerViewToggle currentMode="manager" />

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 font-medium">{companyName}</p>
          <h1 className="text-xl font-semibold text-slate-900 mt-0.5">대시보드</h1>
          <p className="text-sm text-slate-400 mt-0.5">안녕하세요, {profile?.name}님</p>
        </div>
        <Link href="/manager/employees/create" className="btn-primary flex-shrink-0">
          <Plus size={16} />
          직원 등록
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/manager/employees" className="stat-card rounded-xl hover:bg-white hover:border hover:border-slate-200 transition-all">
          <p className="stat-label">재직 직원</p>
          <p className="stat-value">{activeEmployees.length}<span className="text-base font-normal text-slate-400 ml-1">명</span></p>
        </Link>
        <Link href="/manager/payroll" className="stat-card rounded-xl hover:bg-white hover:border hover:border-slate-200 transition-all">
          <p className="stat-label">최근 급여월</p>
          <p className="text-lg font-semibold text-slate-900 mt-1">
            {latestMonth ? formatMonth(latestMonth) : <span className="text-slate-300 text-sm">없음</span>}
          </p>
        </Link>
      </div>


      {/* ── 신청 현황 (통합) ───────────────────────────────────── */}
      <section>
        <div className="section-header">
          <div className="flex items-center gap-2">
            <h2 className="section-title">신청 현황</h2>
            {totalPending > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {totalPending > 99 ? '99+' : totalPending}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">

          {/* 직원 등록 대기 */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <UserPlus size={14} className="text-indigo-600" />
                </div>
                <span className="text-sm font-medium text-slate-800">직원 등록 대기</span>
                {pendingInvites.length > 0 && (
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                    {pendingInvites.length}
                  </span>
                )}
              </div>
              <Link href="/manager/employees" className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-blue-600 transition-colors">
                전체 <ChevronRight size={13} />
              </Link>
            </div>
            {pendingInvites.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">대기 중인 등록 신청이 없습니다</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {pendingInvites.slice(0, 3).map(emp => (
                  <div key={emp.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-semibold text-slate-600 flex-shrink-0">
                      {(emp.name ?? '?').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{emp.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{emp.email}</p>
                    </div>
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full flex-shrink-0">가입 대기</span>
                  </div>
                ))}
                {pendingInvites.length > 3 && (
                  <Link href="/manager/employees" className="flex items-center justify-center py-2 text-xs text-slate-400 hover:text-blue-600 transition-colors">
                    +{pendingInvites.length - 3}명 더 보기
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* 연차 신청 대기 */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CalendarDays size={14} className="text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-slate-800">연차 신청</span>
                {leaveList.length > 0 && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    {leaveList.length}
                  </span>
                )}
              </div>
              <Link href="/manager/leave" className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-blue-600 transition-colors">
                전체 <ChevronRight size={13} />
              </Link>
            </div>
            {leaveList.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">대기 중인 연차 신청이 없습니다</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {leaveList.slice(0, 3).map((req: any) => (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-[10px] font-semibold text-emerald-700 flex-shrink-0">
                      {((req.employees as any)?.name ?? '?').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">
                        {(req.employees as any)?.name ?? '—'}
                        <span className="text-slate-400 ml-1">· {leaveTypeLabel[req.leave_type] ?? req.leave_type}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {req.start_date} ~ {req.end_date} ({req.hours_requested}h)
                      </p>
                    </div>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex-shrink-0">승인 대기</span>
                  </div>
                ))}
                {leaveList.length > 3 && (
                  <Link href="/manager/leave" className="flex items-center justify-center py-2 text-xs text-slate-400 hover:text-blue-600 transition-colors">
                    +{leaveList.length - 3}건 더 보기
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* 연차 취소 알림 (최근 7일) */}
          {cancelledList.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                    <CalendarX size={14} className="text-orange-500" />
                  </div>
                  <span className="text-sm font-medium text-slate-800">연차 취소 알림</span>
                  <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">
                    {cancelledList.length}
                  </span>
                </div>
                <Link href="/manager/leave" className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-blue-600 transition-colors">
                  전체 <ChevronRight size={13} />
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {cancelledList.slice(0, 3).map((req: any) => (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center text-[10px] font-semibold text-orange-600 flex-shrink-0">
                      {((req.employees as any)?.name ?? '?').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">
                        {(req.employees as any)?.name ?? '—'}
                        <span className="text-slate-400 ml-1">· {leaveTypeLabel[req.leave_type] ?? req.leave_type}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {req.start_date} ~ {req.end_date} ({req.hours_requested}h 복원)
                      </p>
                    </div>
                    <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full flex-shrink-0">취소됨</span>
                  </div>
                ))}
                {cancelledList.length > 3 && (
                  <Link href="/manager/leave" className="flex items-center justify-center py-2 text-xs text-slate-400 hover:text-blue-600 transition-colors">
                    +{cancelledList.length - 3}건 더 보기
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* 증명서 신청 대기 */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <FolderOpen size={14} className="text-amber-600" />
                </div>
                <span className="text-sm font-medium text-slate-800">증명서 신청</span>
                {docList.length > 0 && (
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                    {docList.length}
                  </span>
                )}
              </div>
              <Link href="/manager/documents" className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-blue-600 transition-colors">
                전체 <ChevronRight size={13} />
              </Link>
            </div>
            {docList.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">대기 중인 증명서 신청이 없습니다</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {docList.slice(0, 3).map((req: any) => (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-[10px] font-semibold text-amber-700 flex-shrink-0">
                      {((req.employees as any)?.name ?? '?').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">
                        {(req.employees as any)?.name ?? '—'}
                        <span className="text-slate-400 ml-1">· {req.document_type}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(req.requested_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex-shrink-0">처리 대기</span>
                  </div>
                ))}
                {docList.length > 3 && (
                  <Link href="/manager/documents" className="flex items-center justify-center py-2 text-xs text-slate-400 hover:text-blue-600 transition-colors">
                    +{docList.length - 3}건 더 보기
                  </Link>
                )}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* 사용 설명서 */}
      <a
        href="/ModuHR_사용설명서.pdf"
        download="ModuHR_사용설명서.pdf"
        className="flex items-center gap-3 card px-4 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <BookOpen size={17} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">서비스 사용 설명서</p>
          <p className="text-xs text-slate-400 mt-0.5">매니저·직원 기능 안내 PDF 다운로드</p>
        </div>
        <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
      </a>

      {/* 재직 직원 */}
      <section>
        <div className="section-header">
          <h2 className="section-title">
            재직 직원
            <span className="ml-1.5 text-xs font-normal text-slate-400">({activeEmployees.length}명)</span>
          </h2>
          <Link href="/manager/employees" className="text-xs text-blue-600 hover:underline">
            전체 보기
          </Link>
        </div>

        {activeEmployees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="등록된 직원이 없습니다"
            description="직원 등록 버튼으로 직원을 추가하거나 CSV로 대량 등록하세요."
          />
        ) : (
          <div className="space-y-2">
            {recentEmployees.map(emp => (
              <div
                key={emp.id}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-white"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 bg-blue-600">
                  {(emp.name ?? '?').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{emp.name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {[emp.department, emp.position].filter(Boolean).join(' · ') || emp.email}
                  </p>
                </div>
                <span className="badge badge-green flex-shrink-0">재직</span>
              </div>
            ))}
            {activeEmployees.length > 4 && (
              <Link
                href="/manager/employees"
                className="flex items-center justify-center gap-1.5 w-full py-3 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
              >
                +{activeEmployees.length - 4}명 더 보기
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
