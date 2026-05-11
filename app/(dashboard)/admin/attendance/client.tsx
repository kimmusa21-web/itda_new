'use client'

import { useState, useMemo } from 'react'
import { useRouter }         from 'next/navigation'
import { cn } from '@/lib/utils'
import { WORK_TYPE_LABELS, STATUS_LABELS } from '@/types/attendance'
import type { AttendanceRow, WorkType, AttendanceStatus } from '@/types/attendance'

interface Props {
  date:      string
  companyId: number | null
  rows:      AttendanceRow[]
  companies: { id: number; name: string }[]
}

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  not_started: 'bg-slate-100 text-slate-500',
  checked_in:  'bg-emerald-100 text-emerald-700',
  checked_out: 'bg-blue-100 text-blue-700',
}

export function AdminAttendanceClient({ date, companyId, rows, companies }: Props) {
  const router              = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<WorkType | 'all'>('all')

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const matchName = r.employee_name.includes(search)
      const matchType = typeFilter === 'all' || r.work_type === typeFilter
      return matchName && matchType
    })
  }, [rows, search, typeFilter])

  function onFilter(nextDate?: string, nextCompany?: number | null) {
    const d = nextDate    ?? date
    const c = nextCompany !== undefined ? nextCompany : companyId
    const params = new URLSearchParams({ date: d })
    if (c) params.set('companyId', String(c))
    router.push(`/admin/attendance?${params.toString()}`)
  }

  return (
    <div className="space-y-4 max-w-6xl">

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={e => onFilter(e.target.value)}
          className="input text-sm"
        />
        <select
          value={companyId ?? ''}
          onChange={e => onFilter(undefined, e.target.value ? Number(e.target.value) : null)}
          className="input text-sm w-44"
        >
          <option value="">전체 회사</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="직원 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input text-sm w-36"
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as WorkType | 'all')}
          className="input text-sm"
        >
          <option value="all">전체 유형</option>
          {(['office', 'field', 'remote'] as WorkType[]).map(t => (
            <option key={t} value={t}>{WORK_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400 ml-2">{filtered.length}건</span>
      </div>

      {/* 테이블 */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">해당 조건에 맞는 기록이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  {['회사', '직원', '사번', '부서', '유형', '출근', '퇴근', '상태', '출근거리', '퇴근거리', '사유'].map(h => (
                    <th key={h} className="text-left px-3 py-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row, i) => (
                  <tr key={`${row.employee_id}-${i}`} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{row.company_name ?? '—'}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-800">{row.employee_name}</span>
                        {row.is_impersonated && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">관리자</span>
                        )}
                        {row.is_late_entry && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">소급</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{row.employee_number ?? '—'}</td>
                    <td className="px-3 py-3 text-slate-500">{row.department ?? '—'}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {row.status !== 'not_started' ? WORK_TYPE_LABELS[row.work_type] : '—'}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-700">{fmtTime(row.check_in_at)}</td>
                    <td className="px-3 py-3 font-mono text-slate-700">{fmtTime(row.check_out_at)}</td>
                    <td className="px-3 py-3">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[row.status])}>
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-xs">
                      {row.check_in_distance_m  != null ? `${row.check_in_distance_m}m`  : '—'}
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-xs">
                      {row.check_out_distance_m != null ? `${row.check_out_distance_m}m` : '—'}
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-xs max-w-[130px] truncate">
                      {row.work_note ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
