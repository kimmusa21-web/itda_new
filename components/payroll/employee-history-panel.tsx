'use client'
/* ================================================================
   ModuHR — 직원별 급여내역 조회 패널
   admin/manager 급여조회 화면의 "직원별 조회" 탭에서 사용
================================================================ */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Download, User, X } from 'lucide-react'
import {
  getEmployeesForHistory,
  getEmployeePayrollHistory,
  type EmployeeSearchItem,
} from '@/lib/supabase/queries/employee-payroll-history'
import type { PayInfoV2Row } from '@/types/payslip'
import { formatKRW, formatDateDot, cn } from '@/lib/utils'
import { toAccrualMonth } from '@/lib/payslip-utils'

interface Props {
  /** admin: 선택된 회사 ID (null이면 전체). manager: 고정 회사 ID */
  companyId?: number | null
}

export default function EmployeeHistoryPanel({ companyId }: Props) {
  const [employees,      setEmployees]      = useState<EmployeeSearchItem[]>([])
  const [search,         setSearch]         = useState('')
  const [showDropdown,   setShowDropdown]   = useState(false)
  const [selected,       setSelected]       = useState<EmployeeSearchItem | null>(null)
  const [history,        setHistory]        = useState<PayInfoV2Row[]>([])
  const [loadingEmps,    setLoadingEmps]    = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyError,   setHistoryError]   = useState<string | null>(null)
  const [downloading,    setDownloading]    = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  /* ── 직원 목록 로드 (companyId 변경 시 재요청) ── */
  useEffect(() => {
    setLoadingEmps(true)
    setSelected(null)
    setSearch('')
    setHistory([])
    setHistoryError(null)
    getEmployeesForHistory(companyId).then(res => {
      setEmployees(res.employees)
      setLoadingEmps(false)
    })
  }, [companyId])

  /* ── 드롭다운 외부 클릭 시 닫기 ── */
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  /* ── 검색어 기반 필터링 ── */
  const filtered = employees.filter(e => {
    if (!search.trim()) return true
    const s = search.trim().toLowerCase()
    return (
      e.name.toLowerCase().includes(s) ||
      e.email.toLowerCase().includes(s) ||
      (e.employee_number ?? '').toLowerCase().includes(s)
    )
  })

  /* ── 직원 선택 → 이력 로드 ── */
  const selectEmployee = useCallback(async (emp: EmployeeSearchItem) => {
    setSelected(emp)
    setSearch(emp.name)
    setShowDropdown(false)
    setHistory([])
    setHistoryError(null)
    setLoadingHistory(true)
    const res = await getEmployeePayrollHistory(emp.id)
    setHistory(res.rows)
    if (res.error) setHistoryError(res.error)
    setLoadingHistory(false)
  }, [])

  /* ── 직원 초기화 ── */
  function clearSelection() {
    setSelected(null)
    setSearch('')
    setHistory([])
    setHistoryError(null)
    setShowDropdown(false)
  }

  /* ── CSV 다운로드 ── */
  async function handleDownload() {
    if (!selected) return
    setDownloading(true)
    try {
      const res = await fetch(`/api/payroll/employee-export?employeeId=${selected.id}`)
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || '다운로드 실패')
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      const today = new Date().toISOString().slice(0, 10)
      a.href     = url
      a.download = `employee_payroll_${selected.name}_${today}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('CSV 다운로드 중 오류가 발생했습니다: ' + (e instanceof Error ? e.message : String(e)))
    }
    setDownloading(false)
  }

  return (
    <div className="space-y-4">

      {/* ── 직원 검색 ── */}
      <div ref={wrapRef} className="relative">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className="input pl-9 pr-9"
            placeholder={loadingEmps ? '직원 목록 로딩중...' : '이름, 이메일, 사번으로 검색'}
            value={search}
            disabled={loadingEmps}
            onChange={e => {
              setSearch(e.target.value)
              setShowDropdown(true)
              if (!e.target.value) clearSelection()
            }}
            onFocus={() => { if (search) setShowDropdown(true) }}
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={clearSelection}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 드롭다운 */}
        {showDropdown && search.trim() && filtered.length > 0 && (
          <div className="absolute z-30 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-xl max-h-64 overflow-y-auto">
            {filtered.slice(0, 30).map(emp => (
              <button
                key={emp.id}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                onMouseDown={e => e.preventDefault()} // blur 전 클릭 처리
                onClick={() => selectEmployee(emp)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{emp.name}</p>
                    <p className="text-xs text-slate-400 truncate">{emp.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {emp.employee_number && (
                      <p className="text-xs font-mono text-slate-500">{emp.employee_number}</p>
                    )}
                    {emp.department && (
                      <p className="text-xs text-slate-400">{emp.department}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {filtered.length > 30 && (
              <p className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
                검색 결과 {filtered.length}건 중 30건만 표시됩니다
              </p>
            )}
          </div>
        )}

        {showDropdown && search.trim() && filtered.length === 0 && !loadingEmps && (
          <div className="absolute z-30 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-xl">
            <p className="px-4 py-3 text-sm text-slate-400">검색 결과가 없습니다</p>
          </div>
        )}
      </div>

      {/* ── 선택된 직원 카드 ── */}
      {selected && (
        <div className="card p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{selected.name}</p>
                <p className="text-xs text-slate-400 truncate">{selected.email}</p>
              </div>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading || loadingHistory || history.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Download size={13} />
              {downloading ? 'CSV 생성중...' : 'CSV 다운로드'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
            <InfoChip label="사번"  value={selected.employee_number ?? '-'} mono />
            <InfoChip label="부서"  value={selected.department     ?? '-'} />
            <InfoChip label="직급"  value={selected.position       ?? '-'} />
            <InfoChip label="회사"  value={selected.company_name} />
          </div>
        </div>
      )}

      {/* ── 에러 ── */}
      {historyError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {historyError}
        </div>
      )}

      {/* ── 급여내역 ── */}
      {selected && (
        <>
          {loadingHistory ? (
            <div className="card p-10 text-center text-slate-400 text-sm">불러오는 중...</div>
          ) : !historyError && history.length === 0 ? (
            <div className="card p-10 text-center text-slate-400 text-sm">
              <p className="font-medium">급여 내역이 없습니다</p>
              <p className="text-xs mt-1">이 직원의 급여 데이터가 아직 등록되지 않았습니다</p>
            </div>
          ) : history.length > 0 ? (
            <>
              {/* 건수 헤더 */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">{selected.name}</span>님의 급여내역
                  <span className="ml-2 text-xs text-slate-400">총 {history.length}건</span>
                </p>
              </div>

              {/* ── 데스크톱 테이블 ── */}
              <div className="hidden md:block card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: '640px' }}>
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['귀속월', '급여지급일', '근무일수', '총지급액', '총공제액', '실지급액'].map(h => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {history.map(row => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                            {toAccrualMonth(row.accrual_month)}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                            {row.payment_date ? formatDateDot(row.payment_date) : '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {row.work_days != null ? `${row.work_days}일` : '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-800 text-right tabular-nums whitespace-nowrap">
                            {formatKRW(Math.round(Number(row.total_earnings ?? 0)))}
                          </td>
                          <td className="px-4 py-3 text-red-500 text-right tabular-nums whitespace-nowrap">
                            -{formatKRW(Math.abs(Math.round(Number(row.total_deductions ?? 0))))}
                          </td>
                          <td className="px-4 py-3 text-blue-700 font-semibold text-right tabular-nums whitespace-nowrap">
                            {formatKRW(Math.round(Number(row.net_pay ?? 0)))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* 합계 행 */}
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                      <tr>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-600" colSpan={3}>
                          합계
                        </td>
                        <td className="px-4 py-3 text-slate-900 font-semibold text-right tabular-nums whitespace-nowrap">
                          {formatKRW(history.reduce((s, r) => s + Math.round(Number(r.total_earnings ?? 0)), 0))}
                        </td>
                        <td className="px-4 py-3 text-red-600 font-semibold text-right tabular-nums whitespace-nowrap">
                          -{formatKRW(history.reduce((s, r) => s + Math.abs(Math.round(Number(r.total_deductions ?? 0))), 0))}
                        </td>
                        <td className="px-4 py-3 text-blue-700 font-bold text-right tabular-nums whitespace-nowrap">
                          {formatKRW(history.reduce((s, r) => s + Math.round(Number(r.net_pay ?? 0)), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* ── 모바일 카드 ── */}
              <div className="md:hidden space-y-2.5">
                {history.map(row => (
                  <div key={row.id} className="card p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-900">{toAccrualMonth(row.accrual_month)}</p>
                      <div className="text-right">
                        {row.payment_date && (
                          <p className="text-xs text-slate-400">{formatDateDot(row.payment_date)} 지급</p>
                        )}
                        {row.work_days != null && (
                          <p className="text-xs text-slate-400">{row.work_days}일 근무</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 text-center">
                      <div>
                        <p className="text-[10px] text-slate-400">총지급액</p>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5 tabular-nums">
                          {formatKRW(Math.round(Number(row.total_earnings ?? 0)))}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">총공제액</p>
                        <p className="text-xs font-semibold text-red-500 mt-0.5 tabular-nums">
                          -{formatKRW(Math.abs(Math.round(Number(row.total_deductions ?? 0))))}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">실지급액</p>
                        <p className="text-sm font-bold text-blue-600 mt-0.5 tabular-nums">
                          {formatKRW(Math.round(Number(row.net_pay ?? 0)))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}

      {/* ── 미선택 안내 ── */}
      {!selected && !loadingEmps && (
        <div className="card p-10 text-center text-slate-400 text-sm">
          <User size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium">직원을 검색하여 선택하세요</p>
          <p className="text-xs mt-1">선택한 직원의 월별 급여내역 전체를 조회합니다</p>
        </div>
      )}
    </div>
  )
}

function InfoChip({
  label, value, mono,
}: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={cn('text-sm text-slate-700 font-medium mt-0.5 truncate', mono && 'font-mono')}>
        {value}
      </p>
    </div>
  )
}
