import { redirect } from 'next/navigation'
import Link         from 'next/link'
import { Bell, Wallet, CalendarDays, FileText, ArrowRight } from 'lucide-react'
import { createClient }      from '@/lib/supabase/server'
import { getEffectiveEmployeeContext } from '@/lib/impersonation/get-effective-context'
import { getEmployeePayslips } from '@/lib/employee-payslips'
import { formatAccrualMonth }  from '@/lib/payslip-utils'
import NoticeCard              from '@/components/common/notice-card'
import { notices as mockNotices } from '@/lib/mock-data'
import { DOCUMENT_TYPE_LABELS } from '@/lib/actions/document-request-actions'
import type { DocumentType }    from '@/lib/actions/document-request-actions'

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

  const hasNotifications = latestPayslip || latestLeave || latestDoc

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-slate-500">{companyName}</p>
        <h1 className="text-xl font-semibold text-slate-900 mt-0.5">
          안녕하세요{empCtx ? `, ${empCtx.employeeName}님` : ''}
        </h1>
      </div>

      {/* 알림 */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">알림</h2>
        <div className="space-y-2.5">
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
