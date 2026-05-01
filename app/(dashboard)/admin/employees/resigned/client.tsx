'use client'

import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { Search, X, FileDown, UserMinus, AlertTriangle, Clock } from 'lucide-react'
import type { EmployeeRow } from '@/lib/supabase/queries/employee'
import { formatDateShort, cn } from '@/lib/utils'

/* ── 헬퍼 ─────────────────────────────────────────────────────── */
function calcTenure(join: string | null, quit: string | null): string {
  if (!join || !quit) return '-'
  const months =
    (new Date(quit).getFullYear() - new Date(join).getFullYear()) * 12 +
    (new Date(quit).getMonth() - new Date(join).getMonth())
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m}개월`
  if (m === 0) return `${y}년`
  return `${y}년 ${m}개월`
}

function deletionDateStr(quit: string | null): string {
  if (!quit) return '-'
  const d = new Date(quit)
  d.setFullYear(d.getFullYear() + 3)
  return d.toISOString().slice(0, 10)
}

function daysLeft(quit: string | null): number | null {
  if (!quit) return null
  const d = new Date(quit)
  d.setFullYear(d.getFullYear() + 3)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / 86400000)
}

function urgencyClass(days: number | null): string {
  if (days === null) return ''
  if (days <= 90)  return 'bg-red-50 border-red-200'
  if (days <= 365) return 'bg-amber-50 border-amber-200'
  return ''
}

interface Props {
  initialEmployees: EmployeeRow[]
  companies: { id: number; name: string }[]
}

export default function AdminResignedClient({ initialEmployees, companies }: Props) {
  const [search,  setSearch]  = useState('')
  const [company, setCompany] = useState('')

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return initialEmployees.filter(e => {
      const matchSearch = !s ||
        (e.name            ?? '').toLowerCase().includes(s) ||
        (e.email           ?? '').toLowerCase().includes(s) ||
        (e.employee_number ?? '').toLowerCase().includes(s)
      const matchCompany = !company || String(e.company_id) === company
      return matchSearch && matchCompany
    })
  }, [initialEmployees, search, company])

  function downloadExcel() {
    const today = new Date().toISOString().slice(0, 10)
    const rows = filtered.map(e => {
      const co    = (e.companies as { name?: string } | null)?.name ?? ''
      const days  = daysLeft(e.quit_date)
      return {
        '회사명':     co,
        '사번':       e.employee_number ?? '',
        '성명':       e.name ?? '',
        '이메일':     e.email ?? '',
        '부서':       e.department ?? '',
        '직위':       e.position ?? '',
        '입사일':     e.Date_of_joining ?? '',
        '퇴사일':     e.quit_date ?? '',
        '근속기간':   calcTenure(e.Date_of_joining, e.quit_date),
        '삭제 예정일': deletionDateStr(e.quit_date),
        '삭제까지 잔여일': days !== null ? days : '',
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '퇴사자 목록')
    XLSX.writeFile(wb, `퇴사자_관리_${today}.xlsx`)
  }

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">퇴사자 관리</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            총 {initialEmployees.length}명 · 퇴사일 기준 3년 후 자동 삭제
          </p>
        </div>
        <button
          onClick={downloadExcel}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <FileDown size={14} />
          엑셀 다운로드
        </button>
      </div>

      {/* 3년 보존 정책 안내 */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700">
          <span className="font-semibold">데이터 보존 정책:</span> 퇴사일 기준 3년이 경과한 직원 정보는 자동으로 삭제됩니다.
          삭제 예정일이 90일 이내인 항목은 <span className="font-semibold text-red-600">빨간색</span>,
          1년 이내는 <span className="font-semibold text-amber-600">노란색</span>으로 표시됩니다.
        </p>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="이름·이메일·사번 검색"
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
        <select
          className="input sm:w-44"
          value={company}
          onChange={e => setCompany(e.target.value)}
        >
          <option value="">전체 회사</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* 빈 상태 */}
      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <UserMinus size={28} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">
            {search || company ? '검색 결과가 없습니다' : '퇴사 처리된 직원이 없습니다'}
          </p>
        </div>
      )}

      {/* 데스크톱 테이블 */}
      {filtered.length > 0 && (
        <div className="hidden lg:block card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '900px' }}>
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['회사', '사번', '성명', '부서/직위', '입사일', '퇴사일', '근속기간', '삭제 예정일', '잔여일'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(emp => {
                  const days = daysLeft(emp.quit_date)
                  const co   = (emp.companies as { name?: string } | null)?.name
                  return (
                    <tr key={emp.id} className={cn('transition-colors', urgencyClass(days) || 'hover:bg-slate-50')}>
                      <td className="px-4 py-3 text-xs text-slate-600">{co ?? '-'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-400">{emp.employee_number ?? '-'}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{emp.name}</p>
                        <p className="text-xs text-slate-400">{emp.email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <p>{emp.department ?? '-'}</p>
                        <p className="text-slate-400">{emp.position ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {formatDateShort(emp.Date_of_joining)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {formatDateShort(emp.quit_date)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {calcTenure(emp.Date_of_joining, emp.quit_date)}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span className={cn(
                          'font-medium',
                          days !== null && days <= 90  ? 'text-red-600' :
                          days !== null && days <= 365 ? 'text-amber-600' :
                          'text-slate-600'
                        )}>
                          {deletionDateStr(emp.quit_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <DaysLeftBadge days={days} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 모바일 카드 */}
      {filtered.length > 0 && (
        <div className="lg:hidden space-y-2.5">
          {filtered.map(emp => {
            const days = daysLeft(emp.quit_date)
            const co   = (emp.companies as { name?: string } | null)?.name
            return (
              <div key={emp.id} className={cn('card p-4 space-y-3 border', urgencyClass(days) || 'border-slate-200')}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{emp.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{emp.email}</p>
                    {co && <p className="text-xs text-blue-600 mt-0.5">{co}</p>}
                  </div>
                  <DaysLeftBadge days={days} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-t border-slate-100 pt-3">
                  <InfoPair label="사번"   value={emp.employee_number ?? '-'} mono />
                  <InfoPair label="부서"   value={emp.department ?? '-'} />
                  <InfoPair label="입사일" value={formatDateShort(emp.Date_of_joining)} />
                  <InfoPair label="퇴사일" value={formatDateShort(emp.quit_date)} />
                  <InfoPair label="근속"   value={calcTenure(emp.Date_of_joining, emp.quit_date)} />
                  <InfoPair label="삭제 예정" value={deletionDateStr(emp.quit_date)}
                    className={days !== null && days <= 90 ? 'text-red-600 font-semibold' :
                               days !== null && days <= 365 ? 'text-amber-600 font-semibold' : ''} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── 잔여일 배지 ─────────────────────────────────────────────── */
function DaysLeftBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-xs text-slate-400">-</span>
  if (days <= 0)
    return <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">삭제 대상</span>
  if (days <= 90)
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
        <AlertTriangle size={11} />{days}일
      </span>
    )
  if (days <= 365)
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
        <Clock size={11} />{days}일
      </span>
    )
  return <span className="text-xs text-slate-500">{days}일</span>
}

function InfoPair({ label, value, mono, className }: {
  label: string; value: string; mono?: boolean; className?: string
}) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className={cn('text-slate-700 mt-0.5 font-medium', mono && 'font-mono', className)}>{value}</p>
    </div>
  )
}
