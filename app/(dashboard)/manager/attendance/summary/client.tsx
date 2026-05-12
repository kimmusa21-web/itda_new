'use client'

import { useRouter }    from 'next/navigation'
import { ChevronLeft, ChevronRight, Users, Clock, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MonthlySummaryRow } from '@/types/attendance'

interface Props {
  month: string         // "YYYY-MM"
  rows:  MonthlySummaryRow[]
}

function fmtMinutes(m: number): string {
  if (m === 0) return '—'
  const h   = Math.floor(m / 60)
  const min = m % 60
  return min === 0 ? `${h}시간` : `${h}시간 ${min}분`
}

function fmtMonthKo(month: string): string {
  const [y, m] = month.split('-')
  return `${y}년 ${parseInt(m)}월`
}

function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return m === 1
    ? `${y - 1}-12`
    : `${y}-${String(m - 1).padStart(2, '0')}`
}

function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return m === 12
    ? `${y + 1}-01`
    : `${y}-${String(m + 1).padStart(2, '0')}`
}

export function MonthlySummaryClient({ month, rows }: Props) {
  const router   = useRouter()
  const thisMonth = new Date().toISOString().slice(0, 7)

  const totalWorkedDays    = rows.reduce((s, r) => s + r.days_worked, 0)
  const totalMinutes       = rows.reduce((s, r) => s + r.total_minutes, 0)
  const totalOvertimeMins  = rows.reduce((s, r) => s + r.overtime_minutes, 0)
  const activeCount        = rows.filter(r => r.days_worked > 0 || r.days_incomplete > 0).length

  return (
    <div className="space-y-4 max-w-5xl">

      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/manager/attendance/summary?month=${prevMonth(month)}`)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-base font-semibold text-slate-800 w-32 text-center">
            {fmtMonthKo(month)}
          </span>
          <button
            onClick={() => router.push(`/manager/attendance/summary?month=${nextMonth(month)}`)}
            disabled={month >= thisMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <a
          href="/manager/attendance"
          className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          ← 일별 현황
        </a>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Users size={14} className="text-slate-400" />
            <p className="text-xs text-slate-400">출근 직원</p>
          </div>
          <p className="text-2xl font-bold text-slate-700">{activeCount}<span className="text-sm font-normal ml-0.5">명</span></p>
        </div>
        <div className="card px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Clock size={14} className="text-slate-400" />
            <p className="text-xs text-slate-400">총 근무시간</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {Math.floor(totalMinutes / 60)}<span className="text-sm font-normal ml-0.5">시간</span>
          </p>
        </div>
        <div className="card px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingUp size={14} className="text-slate-400" />
            <p className="text-xs text-slate-400">연장근무</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">
            {Math.floor(totalOvertimeMins / 60)}<span className="text-sm font-normal ml-0.5">시간</span>
          </p>
        </div>
      </div>

      {/* 테이블 */}
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">직원 정보가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  {['직원', '부서', '출근일', '미퇴근', '총 근무', '연장근무', '사무실', '외근', '재택'].map(h => (
                    <th key={h} className="text-left px-3 py-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(row => (
                  <tr key={row.employee_id} className="hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-800">{row.employee_name}</p>
                      {row.employee_number && (
                        <p className="text-xs text-slate-400">{row.employee_number}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{row.department ?? '—'}</td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        'font-semibold',
                        row.days_worked > 0 ? 'text-slate-800' : 'text-slate-300',
                      )}>
                        {row.days_worked}일
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {row.days_incomplete > 0
                        ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{row.days_incomplete}일</span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-3 py-3 text-slate-700 font-mono">
                      {fmtMinutes(row.total_minutes)}
                    </td>
                    <td className="px-3 py-3">
                      {row.overtime_minutes > 0
                        ? <span className="text-amber-600 font-mono">{fmtMinutes(row.overtime_minutes)}</span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-3 py-3 text-slate-500">
                      {row.work_types.office > 0 ? `${row.work_types.office}일` : '—'}
                    </td>
                    <td className="px-3 py-3 text-slate-500">
                      {row.work_types.field > 0 ? `${row.work_types.field}일` : '—'}
                    </td>
                    <td className="px-3 py-3 text-slate-500">
                      {row.work_types.remote > 0 ? `${row.work_types.remote}일` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">* 연장근무는 1일 8시간 초과분 기준입니다. 퇴근 기록이 없는 날은 집계에서 제외됩니다.</p>
    </div>
  )
}
