'use client'

import { useState }                   from 'react'
import { Search, X, BarChart3 }       from 'lucide-react'
import { createClient }               from '@/lib/supabase/client'
import { mapRowToPayslip, type PayInfoRow } from '@/lib/supabase/queries/payslip-shared'
import { formatKRW, formatAccrualMonth }    from '@/lib/payslip-utils'
import { PayslipInlineDetail }        from '@/components/payslip/payslip-inline-detail'
import { SendPayslipButton }          from '@/components/payroll/send-payslip-button'
import LoadingState                   from '@/components/ui/loading-state'

interface Props {
  companyId:    number
  companyName:  string
  initialMonths: string[]
  initialMonth:  string
  initialRows:   PayInfoRow[]
}

export default function ManagerPayrollClient({
  companyId, companyName, initialMonths, initialMonth, initialRows,
}: Props) {
  const supabase                      = createClient()
  const [month, setMonth]             = useState(initialMonth)
  const [allRows, setAllRows]         = useState(initialRows)
  const [search, setSearch]           = useState('')
  const [loading, setLoading]         = useState(false)
  const [detailRow, setDetailRow]     = useState<PayInfoRow | null>(null)

  /* ── 월 변경 ── */
  async function onMonthChange(m: string) {
    setMonth(m)
    setLoading(true)
    setSearch('')
    const { data } = await supabase
      .from('pay_info')
      .select('*, employees(name,email,department,position,birthdate,Date_of_joining,quit_date,company_id,companies(name))')
      .eq('company_id', companyId)
      .eq('accrual_month', m)
      .order('employee_id')
    setAllRows((data ?? []) as PayInfoRow[])
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
  const totalPay    = rows.reduce((s, r) => s + (parseInt(r.Total_payment    ?? '0') || 0), 0)
  const totalDeduct = rows.reduce((s, r) => s + Math.abs(parseInt(r.Total_deductible ?? '0') || 0), 0)
  const totalNet    = rows.reduce((s, r) => s + (parseInt(r.net_pay          ?? '0') || 0), 0)

  /* ── 상세 뷰 ── */
  if (detailRow) {
    const ps = mapRowToPayslip(detailRow)
    return (
      <div className="space-y-4">
        <button onClick={() => setDetailRow(null)}
          className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          ← 목록으로
        </button>
        <PayslipInlineDetail payslip={ps} />
        <button onClick={() => setDetailRow(null)} className="btn-secondary w-full">목록으로</button>
      </div>
    )
  }

  /* ── 메인 목록 ── */
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-slate-500">{companyName}</p>
        <h1 className="text-xl font-semibold text-slate-900 mt-0.5">급여 조회</h1>
      </div>

      {/* 필터 */}
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

        {month && allRows.length > 0 && (
          <SendPayslipButton
            companyId={companyId}
            accrualMonth={month}
            employeeCount={allRows.length}
          />
        )}
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
                      <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">{formatKRW(Number(row.Total_payment) || 0)}</td>
                      <td className="px-4 py-3.5 text-red-500 whitespace-nowrap">-{formatKRW(Math.abs(Number(row.Total_deductible) || 0))}</td>
                      <td className="px-4 py-3.5 font-semibold text-blue-600 whitespace-nowrap">{formatKRW(Number(row.net_pay) || 0)}</td>
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
            const emp = row.employees as { name?: string; email?: string; department?: string } | null
            const netPay   = Number(row.net_pay) || 0
            const grossPay = Number(row.Total_payment) || 0
            const deduct   = Math.abs(Number(row.Total_deductible) || 0)
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
    </div>
  )
}
