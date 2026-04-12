'use client'
/**
 * 회사 상세 화면 — 직원목록 (검색 + 상태 필터)
 * pay 데이터 없는 순수 직원 목록용
 */
import { useState } from 'react'
import { Search, Users } from 'lucide-react'
import type { CompanyEmployeeRow } from '@/lib/supabase/queries/company-payroll'
import { StartEmployeeImpersonationButton } from '@/components/impersonation/start-impersonation-button'
import { cn } from '@/lib/utils'

type StatusFilter = 'active' | 'inactive' | 'all'

interface Props {
  initialEmployees:   CompanyEmployeeRow[]
  /** admin 화면에서만 전달: 직원별 점검 버튼 표시용 */
  companyId?:   number
  companyName?: string
}

export function CompanyEmployeeList({ initialEmployees, companyId, companyName }: Props) {
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<StatusFilter>('active')

  const filtered = initialEmployees.filter(e => {
    const s = search.trim().toLowerCase()
    const matchSearch =
      !s ||
      e.name.toLowerCase().includes(s) ||
      e.email.toLowerCase().includes(s) ||
      (e.employee_number ?? '').toLowerCase().includes(s) ||
      (e.department ?? '').toLowerCase().includes(s)
    const matchStatus =
      filter === 'all'      ? true :
      filter === 'active'   ? e.is_active :
                              !e.is_active
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-3">
      {/* 검색 + 필터 */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9 text-sm"
            placeholder="이름, 이메일, 사번, 부서 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {([
            ['active',   '재직중'],
            ['inactive', '퇴직'],
            ['all',      '전체'],
          ] as [StatusFilter, string][]).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filter === v
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* 빈 상태 */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <Users size={28} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-400">
            {search ? '검색 결과가 없습니다' : '등록된 직원이 없습니다'}
          </p>
        </div>
      ) : (
        <>
          {/* 데스크톱 테이블 */}
          <div className="card overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-xs text-slate-500">
                    <th className="text-left px-5 py-3 font-semibold">이름</th>
                    <th className="text-left px-5 py-3 font-semibold">이메일</th>
                    <th className="text-left px-5 py-3 font-semibold">사번</th>
                    <th className="text-left px-5 py-3 font-semibold">부서</th>
                    <th className="text-left px-5 py-3 font-semibold">직급</th>
                    <th className="text-left px-5 py-3 font-semibold">입사일</th>
                    <th className="text-left px-5 py-3 font-semibold">상태</th>
                    {companyId && <th className="px-5 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-slate-900">{e.name}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{e.email}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{e.employee_number ?? '—'}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{e.department ?? '—'}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{e.position ?? '—'}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{e.Date_of_joining ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          'badge text-xs',
                          e.is_active ? 'badge-green' : 'badge-gray',
                        )}>
                          {e.is_active ? '재직중' : '퇴직'}
                        </span>
                      </td>
                      {companyId && (
                        <td className="px-3 py-3">
                          <StartEmployeeImpersonationButton
                            companyId={companyId}
                            companyName={companyName ?? ''}
                            employeeId={e.id}
                            employeeName={e.name}
                            employeeEmail={e.email}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 모바일 카드 */}
          <div className="sm:hidden space-y-2">
            {filtered.map(e => (
              <div key={e.id} className="card p-4">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{e.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{e.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {companyId && (
                      <StartEmployeeImpersonationButton
                        companyId={companyId}
                        companyName={companyName ?? ''}
                        employeeId={e.id}
                        employeeName={e.name}
                        employeeEmail={e.email}
                      />
                    )}
                    <span className={cn(
                      'badge text-xs',
                      e.is_active ? 'badge-green' : 'badge-gray',
                    )}>
                      {e.is_active ? '재직중' : '퇴직'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400 mt-1">
                  {e.employee_number && <span>사번 {e.employee_number}</span>}
                  {e.department      && <span>{e.department}</span>}
                  {e.position        && <span>{e.position}</span>}
                  {e.Date_of_joining && <span>입사 {e.Date_of_joining}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
