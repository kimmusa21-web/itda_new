'use client'
/**
 * 월별 급여대장 상세 — 직원별 급여 목록
 * 클릭 → 해당 직원 급여명세서 상세 이동
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, ChevronRight } from 'lucide-react'
import type { PayInfoRow } from '@/lib/supabase/queries/payslip-shared'
import { formatKRW } from '@/lib/payslip-utils'

/* 내부 타입: employees join에 employee_number 포함 */
type EmpField = {
  name: string
  email: string
  employee_number?: string | null
  department: string | null
  position: string | null
}

interface Props {
  rows: PayInfoRow[]
  /** 클릭 시 이동할 base path, 이후 /employees/[employeeId] 가 붙음 */
  basePath: string
}

function parseAmt(val: string | null | undefined): number {
  if (!val) return 0
  const n = parseInt(String(val).replace(/[,\s]/g, ''), 10)
  return isNaN(n) ? 0 : Math.abs(n)
}

export function CompanyEmployeePayrollTable({ rows, basePath }: Props) {
  const router  = useRouter()
  const [search, setSearch] = useState('')

  const filtered = rows.filter(r => {
    const emp = r.employees as EmpField | null
    const s   = search.trim().toLowerCase()
    if (!s) return true
    return (
      (emp?.name ?? '').toLowerCase().includes(s) ||
      (emp?.email ?? '').toLowerCase().includes(s) ||
      (emp?.employee_number ?? '').toLowerCase().includes(s) ||
      (emp?.department ?? '').toLowerCase().includes(s)
    )
  })

  if (rows.length === 0) {
    return (
      <div className="card p-10 text-center">
        <Users size={28} className="mx-auto mb-3 text-slate-300" />
        <p className="text-sm text-slate-400">급여 데이터가 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 검색 */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9 text-sm"
          placeholder="이름, 이메일, 사번, 부서"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-400">검색 결과가 없습니다</div>
      ) : (
        <>
          {/* 데스크톱 테이블 */}
          <div className="card overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: '680px' }}>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                    <th className="text-left px-5 py-3 font-semibold">이름</th>
                    <th className="text-left px-5 py-3 font-semibold">사번</th>
                    <th className="text-left px-5 py-3 font-semibold">부서</th>
                    <th className="text-left px-5 py-3 font-semibold">직급</th>
                    <th className="text-right px-5 py-3 font-semibold">기본급</th>
                    <th className="text-right px-5 py-3 font-semibold">공제총액</th>
                    <th className="text-right px-5 py-3 font-semibold">지급총액</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(row => {
                    const emp      = row.employees as EmpField | null
                    const baseSal  = parseAmt(row.base_salary)
                    const deduct   = parseAmt(row.Total_deductible)
                    const net      = parseAmt(row.net_pay)
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                        onClick={() => router.push(`${basePath}/employees/${row.employee_id}`)}
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-slate-900">{emp?.name ?? '—'}</p>
                          <p className="text-xs text-slate-400">{emp?.email ?? ''}</p>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-600">
                          {(emp as any)?.employee_number ?? '—'}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-600">{emp?.department ?? '—'}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-600">{emp?.position ?? '—'}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-700 text-right tabular-nums">
                          {formatKRW(baseSal)}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-red-500 text-right tabular-nums">
                          -{formatKRW(deduct)}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-emerald-600 text-right tabular-nums">
                          {formatKRW(net)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <ChevronRight
                            size={14}
                            className="text-slate-300 group-hover:text-blue-400 transition-colors ml-auto"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 모바일 카드 */}
          <div className="sm:hidden space-y-2.5">
            {filtered.map(row => {
              const emp    = row.employees as EmpField | null
              const deduct = parseAmt(row.Total_deductible)
              const net    = parseAmt(row.net_pay)
              const gross  = parseAmt(row.Total_payment)
              return (
                <button
                  key={row.id}
                  type="button"
                  className="w-full text-left card p-4 hover:bg-blue-50/50 active:bg-blue-100/50 transition-colors space-y-3"
                  onClick={() => router.push(`${basePath}/employees/${row.employee_id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{emp?.name ?? '—'}</p>
                      <p className="text-xs text-slate-400">
                        {[
                          (emp as any)?.employee_number,
                          emp?.department,
                          emp?.position,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 flex-shrink-0 mt-1" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 text-center">
                    <div>
                      <p className="text-[10px] text-slate-400">지급합계</p>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5 tabular-nums">{formatKRW(gross)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">공제합계</p>
                      <p className="text-xs font-semibold text-red-500 mt-0.5 tabular-nums">-{formatKRW(deduct)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">실수령액</p>
                      <p className="text-sm font-bold text-emerald-600 mt-0.5 tabular-nums">{formatKRW(net)}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
