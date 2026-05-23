'use client'

import { useState }   from 'react'
import { useRouter }  from 'next/navigation'
import Link           from 'next/link'
import {
  Home, Bell, Building2, Users, Upload, BarChart3,
  UserPlus, UserMinus, ChevronRight,
} from 'lucide-react'
import { cn }               from '@/lib/utils'
import NoticesPanel         from '@/components/admin/notices-panel'
import ResignAlertPanel     from '@/components/admin/resign-alert-panel'
import AdminRequestsClient  from '@/app/(dashboard)/admin/requests/client'
import type { PendingResignee, MissingPayrollEmployee } from '@/lib/actions/admin-hr-alerts'
import type { Notice }       from '@/lib/actions/notices'
import type { Notification } from '@/types'
import type { EmployeeRow }  from '@/lib/supabase/queries/employee'
import type { WithdrawalRequest } from '@/app/(dashboard)/admin/requests/client'

interface CompanyRequest {
  id: number
  created_at: string
  company_name: string | null
  biz_number: string | null
  representative: string | null
  business_type: string | null
  industry: string | null
  telephone: string | null
  address: string | null
  admin_name: string | null
  admin_email: string | null
  admin_phone: string | null
  biz_doc_url: string | null
  requested_features?: Record<string, boolean> | null
  status: 'pending' | 'approved' | 'rejected'
  reviewed_at: string | null
  reject_reason: string | null
}

interface RecentEmployee {
  id: number
  name: string
  job?: string | null
  join_date?: string | null
  quit_date?: string | null
  company_id: number
  companies: { name: string } | null
}

interface Props {
  initialTab:       'dashboard' | 'notifications'
  profileName:      string
  companyCount:     number
  employeeCount:    number
  notices:          Notice[]
  recentHires:      RecentEmployee[]
  recentResignations: RecentEmployee[]
  pendingResignees: PendingResignee[]
  missingPayroll:   MissingPayrollEmployee[]
  // 알림 탭
  companyRequests:       CompanyRequest[]
  employeeNotifications: Notification[]
  resignedEmployees:     EmployeeRow[]
  withdrawalRequests:    WithdrawalRequest[]
  otherNotifications:    Notification[]
  pendingCount:          number
}

export default function AdminDashboardTabbed({
  initialTab,
  profileName,
  companyCount,
  employeeCount,
  notices,
  recentHires,
  recentResignations,
  pendingResignees,
  missingPayroll,
  companyRequests,
  employeeNotifications,
  resignedEmployees,
  withdrawalRequests,
  otherNotifications,
  pendingCount,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'dashboard' | 'notifications'>(initialTab)

  function switchTab(t: 'dashboard' | 'notifications') {
    setTab(t)
    router.replace(t === 'notifications' ? '/admin?tab=notifications' : '/admin', { scroll: false })
  }

  const hasHrChanges = recentHires.length > 0 || recentResignations.length > 0

  return (
    <div className="space-y-5">
      {/* 페이지 헤더 + 탭 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">대시보드/알림</h1>
          <p className="text-sm text-slate-500 mt-0.5">안녕하세요, {profileName}님</p>
        </div>

        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl flex-shrink-0">
          <button
            onClick={() => switchTab('dashboard')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              tab === 'dashboard'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <Home size={13} />
            대시보드
          </button>
          <button
            onClick={() => switchTab('notifications')}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              tab === 'notifications'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <Bell size={13} />
            알림
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── 대시보드 탭 ── */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/admin/companies"
              className="stat-card hover:bg-white hover:border hover:border-slate-200 transition-all rounded-xl">
              <p className="stat-label">등록 기업</p>
              <p className="stat-value">{companyCount}</p>
              <div className="flex items-center gap-1 mt-1">
                <Building2 size={11} className="text-slate-400" />
                <span className="text-xs text-slate-400">전체 보기</span>
              </div>
            </Link>
            <Link href="/admin/employees"
              className="stat-card hover:bg-white hover:border hover:border-slate-200 transition-all rounded-xl">
              <p className="stat-label">재직 직원</p>
              <p className="stat-value">{employeeCount}</p>
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

              {recentHires.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <UserPlus size={13} className="text-emerald-600" />
                    </div>
                    <span className="text-sm font-semibold text-emerald-700">
                      신규 입사 {recentHires.length}명
                    </span>
                  </div>
                  <div className="space-y-2">
                    {recentHires.map(emp => (
                      <Link
                        key={emp.id}
                        href={`/admin/companies/${emp.company_id}`}
                        className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 hover:bg-emerald-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {emp.companies?.name ?? '미지정'} · {emp.job ?? '직무미정'} · 입사 {emp.join_date}
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-slate-400 flex-shrink-0 ml-2" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {recentResignations.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
                      <UserMinus size={13} className="text-red-600" />
                    </div>
                    <span className="text-sm font-semibold text-red-700">
                      퇴사 처리 {recentResignations.length}명
                    </span>
                  </div>
                  <div className="space-y-2">
                    {recentResignations.map(emp => (
                      <Link
                        key={emp.id}
                        href={`/admin/companies/${emp.company_id}`}
                        className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 hover:bg-red-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {emp.companies?.name ?? '미지정'} · {emp.job ?? '직무미정'} · 퇴사 {emp.quit_date}
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
      )}

      {/* ── 알림 탭 ── */}
      {tab === 'notifications' && (
        <AdminRequestsClient
          companyRequests={companyRequests}
          employeeNotifications={employeeNotifications}
          resignedEmployees={resignedEmployees}
          withdrawalRequests={withdrawalRequests}
          otherNotifications={otherNotifications}
          hideTitle
        />
      )}
    </div>
  )
}
