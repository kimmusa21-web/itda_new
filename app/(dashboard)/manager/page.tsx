import { redirect }            from 'next/navigation'
import Link                    from 'next/link'
import { Plus, BarChart3, Users, Upload } from 'lucide-react'
import { createClient }        from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { getCompanyEmployees } from '@/lib/supabase/queries/employee'
import { getAvailableMonthsV2 } from '@/lib/supabase/queries/payslip-v2'
import { formatMonth }         from '@/lib/utils'
import EmptyState              from '@/components/common/empty-state'
import { InviteList }          from '@/components/manager-request/invite-list'

export const metadata = { title: '대시보드 | itda' }

export default async function ManagerDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getEffectiveManagerContext()
  if (!ctx?.companyId) redirect('/login')

  const companyId   = ctx.companyId
  const companyName = ctx.companyName

  // admin 본인 프로필 이름 조회 (greeting용)
  const { data: profile } = await supabase
    .from('profiles').select('name').eq('id', user.id).single()

  /* ── 데이터 병렬 조회 ── */
  const [employees, months, invitesResult] = await Promise.all([
    getCompanyEmployees(companyId),
    getAvailableMonthsV2(companyId),
    supabase
      .from('employees')
      .select('id, name, email, department, position, Date_of_joining, is_active, user_id, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
  ])

  const activeEmployees = employees.filter(e => e.is_active)
  const latestMonth     = months[0] ?? null

  const recentEmployees = activeEmployees.slice(0, 4)

  const inviteList = (invitesResult.data ?? []).map(e => ({
    id:         e.id as number,
    name:       e.name as string,
    email:      e.email as string,
    department: e.department as string | null,
    position:   e.position as string | null,
    joinDate:   e.Date_of_joining as string | null,
    isActive:   e.is_active as boolean,
    hasAccount: e.user_id !== null,
    createdAt:  e.created_at as string,
  }))

  return (
    <div className="space-y-6">
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

      {/* 빠른 이동 */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/manager/payroll"
          className="flex items-center gap-3 bg-[#0f172a] rounded-2xl px-4 py-4 hover:bg-[#1e293b] transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <BarChart3 size={17} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">급여 조회</p>
            <p className="text-xs text-slate-500 mt-0.5">월별 확인 →</p>
          </div>
        </Link>
        <Link
          href="/manager/payroll/upload"
          className="flex items-center gap-3 card rounded-2xl px-4 py-4 hover:bg-slate-50 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Upload size={17} className="text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">급여업로드</p>
            <p className="text-xs text-slate-400 mt-0.5">CSV 등록 →</p>
          </div>
        </Link>
      </div>

      {/* 직원 목록 */}
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
            description="'직원 등록 요청' 버튼으로 직원을 추가하거나 CSV로 대량 등록하세요."
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

      {/* 빠른 메뉴 */}
      <section>
        <h2 className="section-title mb-3">빠른 메뉴</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: '/manager/employees/create', icon: Plus,          label: '직원 등록',     sub: '개별 등록' },
            { href: '/manager/employees/upload', icon: Upload,        label: '직원 CSV 등록', sub: '대량 등록' },
            { href: '/manager/employees',        icon: Users,         label: '직원관리',      sub: '목록 보기' },
            { href: '/manager/payroll/upload',   icon: Upload,        label: '급여업로드',    sub: 'CSV 등록'  },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <item.icon size={15} className="text-slate-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{item.label}</p>
                <p className="text-[10px] text-slate-400">{item.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 초대 내역 */}
      <section>
        <div className="section-header">
          <h2 className="section-title">초대 내역</h2>
          <Link href="/manager/requests" className="text-xs text-blue-600 hover:underline">
            전체 보기
          </Link>
        </div>
        <InviteList companyId={companyId} initialList={inviteList} />
      </section>
    </div>
  )
}
