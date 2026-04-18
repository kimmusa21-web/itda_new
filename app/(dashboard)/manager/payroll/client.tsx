'use client'

import { useState }                      from 'react'
import { useRouter }                     from 'next/navigation'
import { Search, X, BarChart3, ChevronRight, Users, Calendar } from 'lucide-react'
import { createClient }                  from '@/lib/supabase/client'
import type { PayInfoV2 }                from '@/types'
import { mapEarnings, mapDeductions }    from '@/lib/payroll-labels'
import { parsePayslipNote }             from '@/lib/payslip-defaults'
import { PayslipDetailView }             from '@/components/payslip/payslip-detail-v2'
import { SendPayslipButton }             from '@/components/payroll/send-payslip-button'
import { formatKRW, formatAccrualMonth } from '@/lib/payslip-utils'
import { getDaysInMonth, getPayrollPeriod } from '@/lib/payslip-utils'
import type { PayslipDetail }            from '@/types/payslip'
import LoadingState                      from '@/components/ui/loading-state'
import EmployeeHistoryPanel              from '@/components/payroll/employee-history-panel'
import CompanyExportButton              from '@/components/payroll/company-export-button'

interface Props {
  companyId:     number
  companyName:   string
  initialMonths: string[]
  initialMonth:  string
  initialRows:   PayInfoV2[]
}

/* ── PayInfoV2 → PayslipDetail 변환 (클라이언트용) ── */
function rowToDetail(row: PayInfoV2): PayslipDetail {
  const totalEarnings   = Math.round(Number(row.total_earnings   ?? 0))
  const totalDeductions = Math.abs(Math.round(Number(row.total_deductions ?? 0)))
  const netPay          = Math.round(Number(row.net_pay ?? 0))

  const daysInMonth = getDaysInMonth(row.accrual_month)
  const payrollStartDay = (row.companies as any)?.payroll_start_day ?? null
  const { start: payrollPeriodStart, end: payrollPeriodEnd } =
    getPayrollPeriod(row.accrual_month, payrollStartDay)

  return {
    id:           row.id,
    accrualMonth: row.accrual_month,
    paymentDate:  row.payment_date ?? null,
    workDays:     row.work_days != null ? Number(row.work_days) : null,
    overtimeHours: row.overtime_hours != null ? Number(row.overtime_hours) : null,
    startDate:    (row as any).start_date ?? null,
    endDate:      (row as any).end_date   ?? null,
    overTime:                  row.Over_time                   ?? null,
    holidayWorkingHours:       row.Holiday_working_hours       ?? null,
    nightWorkHours:            row.night_work_hours            ?? null,
    remainingAnnualLeaveHours: row.Remaining_annual_leave_hours ?? null,
    earnings:     mapEarnings(row.earnings   ?? {}),
    deductions:   mapDeductions(row.deductions ?? {}),
    totalEarnings,
    totalDeductions,
    netPay,
    calculationNotes: (row.calculation_notes ?? []).length > 0
      ? row.calculation_notes!
      : parsePayslipNote((row.companies as any)?.payslip_note ?? null),
    employee: {
      name:       row.employees?.name       ?? '',
      email:      row.employees?.email      ?? '',
      department: row.employees?.department ?? null,
      position:   row.employees?.position   ?? null,
      joinDate:   row.employees?.Date_of_joining ?? null,
      birthDate:  row.employees?.birthdate  ?? null,
      employeeNo: row.employees?.employee_number ?? `EMP-${String(row.employee_id).padStart(4, '0')}`,
    },
    companyName:       (row.companies as any)?.name ?? '',
    daysInMonth,
    payrollPeriodStart,
    payrollPeriodEnd,
  }
}

export default function ManagerPayrollClient({
  companyId, companyName, initialMonths, initialMonth, initialRows,
}: Props) {
  const supabase                      = createClient()
  const router                        = useRouter()
  const [month, setMonth]             = useState(initialMonth)
  const [allRows, setAllRows]         = useState(initialRows)
  const [search, setSearch]           = useState('')
  const [loading, setLoading]         = useState(false)
  const [detailRow, setDetailRow]     = useState<PayInfoV2 | null>(null)
  const [view, setView]               = useState<'monthly' | 'employee'>('monthly')

  /* ── 월 변경 ── */
  async function onMonthChange(m: string) {
    setMonth(m)
    setLoading(true)
    setSearch('')
    const select = '*, employees(name,email,employee_number,department,position,birthdate,Date_of_joining,quit_date,company_id,companies(name,payslip_note,payroll_start_day))'
    const { data } = await supabase
      .from('pay_info_v2')
      .select(select)
      .eq('company_id', companyId)
      .eq('accrual_month', m)
      .order('employee_id')
    setAllRows((data ?? []) as PayInfoV2[])
    setLoading(false)
  }

  /* ── 클라이언트 검색 필터 ── */
  const rows = search.trim()
    ? allRows.filter(r => {
        const emp = r.employees as { name?: string; email?: string } | null
        const s   = search.trim().toLowerCase()
        return emp?.name?.toLowerCase().includes(s) || emp?.email?.toLowerCase().includes(s)
      })
    : allRows

  /* ── 요약 통계 ── */
  const totalPay    = rows.reduce((s, r) => s + Math.round(Number(r.total_earnings   ?? 0)), 0)
  const totalDeduct = rows.reduce((s, r) => s + Math.abs(Math.round(Number(r.total_deductions ?? 0))), 0)
  const totalNet    = rows.reduce((s, r) => s + Math.round(Number(r.net_pay          ?? 0)), 0)

  /* ── 상세 뷰 ── */
  if (detailRow) {
    const detail = rowToDetail(detailRow)
    return (
      <PayslipDetailView
        detail={detail}
        backLabel="목록으로"
        onBack={() => setDetailRow(null)}
      />
    )
  }

  /* ── 메인 목록 ── */
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">{companyName}</p>
          <h1 className="text-xl font-semibold text-slate-900 mt-0.5">급여 조회</h1>
        </div>

        {/* 조회 모드 탭 */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl flex-shrink-0">
          <button
            onClick={() => setView('monthly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              view === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Calendar size={13} />
            월별 조회
          </button>
          <button
            onClick={() => setView('employee')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              view === 'employee' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Users size={13} />
            직원별 조회
          </button>
        </div>
      </div>

      {/* ── 직원별 조회 패널 ── */}
      {view === 'employee' && (
        <EmployeeHistoryPanel companyId={companyId} />
      )}

      {/* 필터 (월별 조회 전용) */}
      {view === 'monthly' && (<>
      <div className="flex flex-wrap items-center gap-3">
        {/* 월 선택 */}
        <select
          className="input w-44"
          value={month}
          onChange={e => onMonthChange(e.target.value)}
          disabled={initialMonths.length === 0}
        >
          {initialMonths.length === 0
            ? <option value="">급여 데이터 없음</option>
            : initialMonths.map(m => (
                <option key={m} value={m}>{formatAccrualMonth(m)}</option>
              ))
          }
        </select>

        {/* 직원 검색 */}
        <div className="relative flex-1 min-w-40">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="직원명·이메일 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => setSearch('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <span className="text-sm text-slate-500">{rows.length}명</span>

        {/* 상세 급여대장 페이지 이동 */}
        {month && (
          <button
            onClick={() => router.push(`/manager/payroll/${month}`)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline whitespace-nowrap"
          >
            상세 급여대장 <ChevronRight size={12} />
          </button>
        )}

        {month && allRows.length > 0 && (
          <SendPayslipButton
            companyId={companyId}
            accrualMonth={month}
            employeeCount={allRows.length}
          />
        )}

        {/* 전직원 CSV 내보내기 */}
        <CompanyExportButton
          companyId={companyId}
          companyName={companyName}
          availableMonths={initialMonths}
          currentMonth={month}
        />
      </div>

      {/* 요약 통계 */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card rounded-xl">
            <p className="stat-label">총 지급합계</p>
            <p className="text-base font-semibold text-slate-900 mt-1">{formatKRW(totalPay)}</p>
          </div>
          <div className="stat-card rounded-xl">
            <p className="stat-label">총 공제합계</p>
            <p className="text-base font-semibold text-red-500 mt-1">-{formatKRW(totalDeduct)}</p>
          </div>
          <div className="stat-card rounded-xl">
            <p className="stat-label">총 실수령액</p>
            <p className="text-base font-semibold text-blue-600 mt-1">{formatKRW(totalNet)}</p>
          </div>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="card">
          <LoadingState />
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && rows.length === 0 && (
        <div className="card p-10 text-center text-slate-400">
          <BarChart3 size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm">
            {search ? '검색 결과가 없습니다'
              : initialMonths.length === 0 ? '급여 데이터가 없습니다. 관리자에게 문의하세요.'
              : '해당 월의 급여 데이터가 없습니다'}
          </p>
        </div>
      )}

      {/* ── 데스크톱 테이블 (md 이상) ── */}
      {!loading && rows.length > 0 && (
        <div className="hidden md:block card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '480px' }}>
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['직원', '부서', '지급합계', '공제합계', '실수령액', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(row => {
                  const emp = row.employees as { name?: string; email?: string; department?: string } | null
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900">{emp?.name ?? '-'}</p>
                        <p className="text-xs text-slate-400">{emp?.email ?? '-'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs">{emp?.department ?? '-'}</td>
                      <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">{formatKRW(Math.round(Number(row.total_earnings ?? 0)))}</td>
                      <td className="px-4 py-3.5 text-red-500 whitespace-nowrap">-{formatKRW(Math.abs(Math.round(Number(row.total_deductions ?? 0))))}</td>
                      <td className="px-4 py-3.5 font-semibold text-blue-600 whitespace-nowrap">{formatKRW(Math.round(Number(row.net_pay ?? 0)))}</td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => setDetailRow(row)} className="text-xs text-blue-600 hover:underline whitespace-nowrap">명세서 보기</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 모바일 카드 (md 미만) ── */}
      {!loading && rows.length > 0 && (
        <div className="md:hidden space-y-2.5">
          {rows.map(row => {
            const emp      = row.employees as { name?: string; email?: string; department?: string } | null
            const netPay   = Math.round(Number(row.net_pay ?? 0))
            const grossPay = Math.round(Number(row.total_earnings ?? 0))
            const deduct   = Math.abs(Math.round(Number(row.total_deductions ?? 0)))
            return (
              <div key={row.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{emp?.name ?? '-'}</p>
                    <p className="text-xs text-slate-400 truncate">{emp?.department ? `${emp.department} · ` : ''}{emp?.email ?? ''}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400">지급합계</p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5 tabular-nums">{formatKRW(grossPay)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">공제합계</p>
                    <p className="text-xs font-semibold text-red-500 mt-0.5 tabular-nums">-{formatKRW(deduct)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">실수령액</p>
                    <p className="text-sm font-bold text-blue-600 mt-0.5 tabular-nums">{formatKRW(netPay)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailRow(row)}
                  className="w-full text-xs font-medium text-blue-600 hover:text-blue-700 py-1 border-t border-slate-100"
                >
                  명세서 상세 보기 →
                </button>
              </div>
            )
          })}
        </div>
      )}
      </>)}
    </div>
  )
}
