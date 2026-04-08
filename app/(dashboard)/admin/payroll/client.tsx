'use client'

import { useState }                              from 'react'
import { Search, BarChart3, X }                  from 'lucide-react'
import { createClient }                          from '@/lib/supabase/client'
import type { PayInfoRow }                       from '@/lib/supabase/queries/payslip-shared'
import { mapRowToPayslip }                       from '@/lib/supabase/queries/payslip-shared'
import { PayslipInlineDetail }                    from '@/components/payslip/payslip-inline-detail'
import { SendPayslipButton }                     from '@/components/payroll/send-payslip-button'
import { formatKRW, formatAccrualMonth }         from '@/lib/payslip-utils'
import LoadingState                              from '@/components/ui/loading-state'

/* ── 타입 ── */
interface Company { id: number; name: string }

interface Props {
  companies:        Company[]
  initialCompanyId: number | null
  initialMonths:    string[]
  initialMonth:     string
  initialRows:      PayInfoRow[]
  initialSearch:    string
}

/* ── 메인 컴포넌트 ── */
export default function AdminPayrollClient({
  companies,
  initialCompanyId,
  initialMonths,
  initialMonth,
  initialRows,
  initialSearch,
}: Props) {
  const supabase = createClient()

  const [companyId, setCompanyId]   = useState<number | null>(initialCompanyId)
  const [months, setMonths]         = useState<string[]>(initialMonths)
  const [month, setMonth]           = useState<string>(initialMonth)
  const [allRows, setAllRows]       = useState<PayInfoRow[]>(initialRows)
  const [search, setSearch]         = useState<string>(initialSearch)
  const [loading, setLoading]       = useState<boolean>(false)
  const [detailRow, setDetailRow]   = useState<PayInfoRow | null>(null)

  /* ── 회사 변경 → 월 목록 + 데이터 새로 고침 ── */
  async function onCompanyChange(cid: number | null) {
    setCompanyId(cid)
    setLoading(true)
    setSearch('')

    // 해당 회사의 귀속월 목록
    const monthQuery = cid
      ? supabase.from('pay_info').select('accrual_month').eq('company_id', cid).order('accrual_month', { ascending: false })
      : supabase.from('pay_info').select('accrual_month').order('accrual_month', { ascending: false })
    const { data: mData } = await monthQuery
    const newMonths = [...new Set(
      (mData ?? []).map((r: { accrual_month: string }) => r.accrual_month)
    )]
    setMonths(newMonths)

    const newMonth = newMonths[0] ?? ''
    setMonth(newMonth)
    await fetchRows(cid, newMonth, '')
    setLoading(false)
  }

  /* ── 월 변경 ── */
  async function onMonthChange(m: string) {
    setMonth(m)
    setLoading(true)
    await fetchRows(companyId, m, search)
    setLoading(false)
  }

  /* ── 검색 변경 (클라이언트 필터) ── */
  function onSearch(q: string) {
    setSearch(q)
  }

  /* ── 실제 데이터 패치 ── */
  async function fetchRows(cid: number | null, m: string, _q: string) {
    if (!m) {
      setAllRows([])
      return
    }
    const select = '*, employees(name,email,department,position,birthdate,Date_of_joining,quit_date,company_id,companies(name))'
    const { data } = cid
      ? await supabase.from('pay_info').select(select).eq('company_id', cid).eq('accrual_month', m).order('employee_id')
      : await supabase.from('pay_info').select(select).eq('accrual_month', m).order('employee_id')
    setAllRows((data ?? []) as PayInfoRow[])
  }

  /* ── 클라이언트 검색 필터 (이름·이메일) ── */
  const rows = search.trim()
    ? allRows.filter(r => {
        const emp = r.employees as { name?: string; email?: string } | null
        const s   = search.trim().toLowerCase()
        return (
          emp?.name?.toLowerCase().includes(s) ||
          emp?.email?.toLowerCase().includes(s)
        )
      })
    : allRows

  /* ── 요약 통계 ── */
  const totalPay    = rows.reduce((s, r) => s + (parseInt(r.Total_payment    ?? '0') || 0), 0)
  const totalDeduct = rows.reduce((s, r) => s + Math.abs(parseInt(r.Total_deductible ?? '0') || 0), 0)
  const totalNet    = rows.reduce((s, r) => s + (parseInt(r.net_pay          ?? '0') || 0), 0)

  /* ── 상세 뷰 ── */
  if (detailRow) {
    const ps  = mapRowToPayslip(detailRow)
    const emp = detailRow.employees as { name?: string; companies?: { name?: string } | null } | null
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setDetailRow(null)}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            ← 목록으로
          </button>
          <span className="text-xs text-slate-400">
            {emp?.companies?.name ?? ''}{emp?.name ? ` · ${emp.name}` : ''}
          </span>
        </div>
        <PayslipInlineDetail payslip={ps} />
        <button onClick={() => setDetailRow(null)} className="btn-secondary w-full">
          목록으로
        </button>
      </div>
    )
  }

  /* ── 메인 목록 뷰 ── */
  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">급여 조회</h1>
        <p className="text-sm text-slate-500 mt-0.5">전체 회사 급여 데이터를 조회합니다</p>
      </div>

      {/* 필터 영역 */}
      <div className="flex flex-wrap gap-2">
        {/* 회사 필터 (admin only) */}
        <select
          className="input w-44"
          value={companyId ?? ''}
          onChange={e => onCompanyChange(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">전체 회사</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* 월 필터 */}
        <select
          className="input w-44"
          value={month}
          onChange={e => onMonthChange(e.target.value)}
          disabled={months.length === 0}
        >
          {months.length === 0
            ? <option value="">급여 데이터 없음</option>
            : months.map(m => (
                <option key={m} value={m}>{formatAccrualMonth(m)}</option>
              ))
          }
        </select>

        {/* 직원 검색 */}
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="직원명·이메일 검색"
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => onSearch('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 급여명세서 이메일 발송 (회사가 선택된 경우만) */}
        {month && rows.length > 0 && companyId && (
          <SendPayslipButton
            companyId={companyId}
            accrualMonth={month}
            employeeCount={rows.length}
          />
        )}
      </div>

      {/* 요약 통계 */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card rounded-xl">
            <p className="stat-label">총 지급합계</p>
            <p className="text-base font-semibold text-slate-900 mt-1">{formatKRW(totalPay)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{rows.length}명</p>
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
            {months.length === 0
              ? '급여 데이터가 없습니다. CSV 업로드 후 조회하세요.'
              : search ? '검색 결과가 없습니다.' : '해당 조건의 급여 데이터가 없습니다.'}
          </p>
        </div>
      )}

      {/* ── 데스크톱 테이블 (md 이상) ── */}
      {!loading && rows.length > 0 && (
        <div className="hidden md:block card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '680px' }}>
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['직원', '회사', '부서', '귀속월', '지급합계', '공제합계', '실수령액', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(row => {
                  const emp = row.employees as { name?: string; email?: string; department?: string; companies?: { name?: string } | null } | null
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900">{emp?.name ?? '-'}</p>
                        <p className="text-xs text-slate-400">{emp?.email ?? '-'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">{emp?.companies?.name ?? '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs">{emp?.department ?? '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">{formatAccrualMonth(row.accrual_month)}</td>
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
            const emp = row.employees as { name?: string; email?: string; department?: string; companies?: { name?: string } | null } | null
            const netPay  = Number(row.net_pay) || 0
            const grossPay = Number(row.Total_payment) || 0
            const deduct  = Math.abs(Number(row.Total_deductible) || 0)
            return (
              <div key={row.id} className="card p-4 space-y-3">
                {/* 상단: 직원 + 귀속월 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{emp?.name ?? '-'}</p>
                    <p className="text-xs text-slate-400 truncate">{emp?.companies?.name ?? ''}{emp?.department ? ` · ${emp.department}` : ''}</p>
                  </div>
                  <span className="badge badge-blue flex-shrink-0 whitespace-nowrap">
                    {formatAccrualMonth(row.accrual_month)}
                  </span>
                </div>
                {/* 금액 요약 */}
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
