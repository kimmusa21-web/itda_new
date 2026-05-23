import { redirect } from 'next/navigation'
import Link         from 'next/link'
import { Bell, Wallet, CalendarDays, FileText, ArrowRight, Clock, LogIn, LogOut, BookOpen, ChevronRight, TriangleAlert } from 'lucide-react'
import { createClient }      from '@/lib/supabase/server'
import { getEffectiveEmployeeContext } from '@/lib/impersonation/get-effective-context'
import { getEmployeePayslips } from '@/lib/employee-payslips'
import { formatAccrualMonth }  from '@/lib/payslip-utils'
import NoticeCard              from '@/components/common/notice-card'
import { notices as mockNotices } from '@/lib/mock-data'
import { DOCUMENT_TYPE_LABELS, type DocumentType } from '@/lib/document-types'
import { kstToday } from '@/lib/utils/kst'
import { cn } from '@/lib/utils'
import { STATUS_LABELS, WORK_TYPE_LABELS } from '@/types/attendance'
import type { AttendanceLog } from '@/types/attendance'
import { getMissingAttendanceDays } from '@/lib/actions/attendance-actions'

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })
}

export default async function EmployeeDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, companies(name)').eq('id', user.id).single()

  const role = profile?.role
  if (role !== 'employee' && role !== 'admin' && role !== 'manager') redirect(`/${role ?? 'login'}`)

  const empCtx = await getEffectiveEmployeeContext()

  let companyName = (profile?.companies as any)?.name ?? ''
  if (empCtx?.companyId) {
    const { data: co } = await supabase
      .from('companies').select('name').eq('id', empCtx.companyId).single()
    if (co?.name) companyName = co.name
  }

  const today = kstToday()

  // 오늘 출퇴근 기록
  const { data: todayLog } = empCtx
    ? await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', empCtx.employeeId)
        .eq('work_date', today)
        .maybeSingle()
    : { data: null }

  const log = todayLog as AttendanceLog | null
  const attendanceStatus = log?.status ?? 'not_started'

  // 최신 급여명세서
  const payslips     = empCtx ? await getEmployeePayslips(empCtx.employeeId) : []
  const latestPayslip = payslips[0] ?? null

  // 최신 승인 연차
  const { data: latestLeave } = empCtx
    ? await supabase
        .from('leave_requests')
        .select('id, leave_type, start_date, end_date')
        .eq('employee_id', empCtx.employeeId)
        .eq('status', 'approved')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  // 최신 승인 서류
  const { data: latestDoc } = empCtx
    ? await supabase
        .from('document_requests')
        .select('id, document_type')
        .eq('employee_id', empCtx.employeeId)
        .eq('status', 'approved')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  // 근태 미입력일
  const missingDays = empCtx ? await getMissingAttendanceDays() : []

  const hasNotifications = latestPayslip || latestLeave || latestDoc || missingDays.length > 0

  const statusColor = {
    not_started: 'bg-slate-100 text-slate-500',
    checked_in:  'bg-[#dde8f5] text-[#003366]',
    checked_out: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-slate-500">{companyName}</p>
        <h1 className="text-xl font-semibold text-slate-900 mt-0.5">
          안녕하세요{empCtx ? `, ${empCtx.employeeName}님` : ''}
        </h1>
      </div>

      {/* 출퇴근 위젯 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">출퇴근</h2>
          <Link href="/employee/attendance" className="text-xs text-slate-400 hover:text-slate-600">
            상세보기 →
          </Link>
        </div>
        <div className="card px-5 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-slate-400" />
              <span className="text-xs text-slate-500">
                {new Date(today + 'T00:00:00+09:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' })}
              </span>
            </div>
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', statusColor[attendanceStatus])}>
              {STATUS_LABELS[attendanceStatus]}
            </span>
          </div>

          {log && attendanceStatus !== 'not_started' && (
            <div className="flex items-center gap-6 text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-slate-400 mb-0.5">출근</p>
                <p className="font-mono font-medium text-slate-700">{fmtTime(log.check_in_at)}</p>
              </div>
              {attendanceStatus === 'checked_out' && (
                <div>
                  <p className="text-slate-400 mb-0.5">퇴근</p>
                  <p className="font-mono font-medium text-slate-700">{fmtTime(log.check_out_at)}</p>
                </div>
              )}
              <div>
                <p className="text-slate-400 mb-0.5">유형</p>
                <p className="font-medium text-slate-700">{WORK_TYPE_LABELS[log.work_type]}</p>
              </div>
            </div>
          )}

          <Link
            href="/employee/attendance"
            className={cn(
              'flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-base transition-colors',
              attendanceStatus === 'not_started'
                ? 'bg-[#003366] text-white hover:bg-[#002244]'
                : attendanceStatus === 'checked_in'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {attendanceStatus === 'not_started' && <><LogIn size={18} /> 출근하기</>}
            {attendanceStatus === 'checked_in'  && <><LogOut size={18} /> 퇴근하기</>}
            {attendanceStatus === 'checked_out' && <>오늘 기록 확인</>}
          </Link>
        </div>
      </section>

      {/* 알림 */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">알림</h2>
        <div className="space-y-2.5">
          {missingDays.length > 0 && (
            <Link
              href="/employee/attendance"
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <TriangleAlert size={16} className="text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-700">근태 미입력 {missingDays.length}일</p>
                <p className="text-xs text-red-500 mt-0.5">
                  {missingDays[0]}
                  {missingDays.length > 1 && ` 외 ${missingDays.length - 1}일`}
                  {' '}출퇴근 기록을 입력해주세요
                </p>
              </div>
              <ArrowRight size={15} className="text-red-400 flex-shrink-0" />
            </Link>
          )}

          {latestPayslip && (
            <Link
              href={`/employee/payslips/${latestPayslip.id}`}
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Wallet size={16} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">급여명세서 발급</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatAccrualMonth(latestPayslip.accrualMonth)} 명세서가 발급되었습니다
                </p>
              </div>
              <ArrowRight size={15} className="text-slate-400 flex-shrink-0" />
            </Link>
          )}

          {latestLeave && (
            <Link
              href="/employee/leave"
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <CalendarDays size={16} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">연차 신청 승인</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {latestLeave.start_date}
                  {latestLeave.start_date !== latestLeave.end_date && ` ~ ${latestLeave.end_date}`}
                  {' '}연차가 승인되었습니다
                </p>
              </div>
              <ArrowRight size={15} className="text-slate-400 flex-shrink-0" />
            </Link>
          )}

          {latestDoc && (
            <Link
              href="/employee/documents"
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                <FileText size={16} className="text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">서류 신청 승인</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {DOCUMENT_TYPE_LABELS[latestDoc.document_type as DocumentType] ?? latestDoc.document_type} 발급이 처리되었습니다
                </p>
              </div>
              <ArrowRight size={15} className="text-slate-400 flex-shrink-0" />
            </Link>
          )}

          {!hasNotifications && (
            <div className="card p-10 text-center text-slate-400">
              <Bell size={28} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">새로운 알림이 없습니다</p>
            </div>
          )}
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
          <p className="text-xs text-slate-400 mt-0.5">직원 기능 안내 PDF 다운로드</p>
        </div>
        <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
      </a>

      {/* 공지사항 */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">공지사항</h2>
        <div className="space-y-2.5">
          {mockNotices.slice(0, 3).map(n => (
            <NoticeCard key={n.id} notice={n} />
          ))}
        </div>
      </section>
    </div>
  )
}
