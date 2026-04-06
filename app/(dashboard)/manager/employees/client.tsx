'use client'
/* ================================================================
   Manager 직원 목록 — 클라이언트 컴포넌트
   실제 Supabase 데이터 기반 (mock-data 제거)
================================================================ */

import { useState } from 'react'
import { Search, Users, Mail, CalendarDays, ChevronRight } from 'lucide-react'
import type { EmployeeRow } from '@/lib/supabase/queries/employee'
import { formatDateShort, cn, getInitials } from '@/lib/utils'

type Filter = 'active' | 'inactive' | 'all'

/* 아바타 배경색 (이름 해시 기반) */
const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#6366f1',
]
function avatarBg(name: string): string {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

interface Props {
  initialEmployees: EmployeeRow[]
  companyName: string
}

export function ManagerEmployeesClient({ initialEmployees, companyName }: Props) {
  const [filter, setFilter] = useState<Filter>('active')
  const [search, setSearch] = useState('')

  const filtered = initialEmployees.filter(e => {
    const matchStatus =
      filter === 'all' ? true :
      filter === 'active' ? e.is_active : !e.is_active
    const matchSearch =
      !search ||
      (e.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.department ?? '').includes(search)
    return matchStatus && matchSearch
  })

  return (
    <>
      {/* 검색 */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="이름, 이메일, 부서 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['active', '재직중'], ['inactive', '퇴사'], ['all', '전체']] as [Filter, string][]).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              filter === v
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <Users size={28} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">
            {search ? '검색 결과가 없습니다' : '직원이 없습니다'}
          </p>
          {!search && filter === 'active' && (
            <p className="text-xs text-slate-400 mt-1">
              상단의 &apos;등록 요청&apos; 버튼으로 직원을 등록하세요
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(emp => (
            <EmployeeListItem key={emp.id} emp={emp} />
          ))}
        </div>
      )}
    </>
  )
}

function EmployeeListItem({ emp }: { emp: EmployeeRow }) {
  const bg = avatarBg(emp.name ?? '?')
  const initials = getInitials(emp.name ?? '?')
  const isLinked = !!emp.user_id

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all">
      {/* 아바타 */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
        style={{ backgroundColor: bg }}
      >
        {initials}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-900">{emp.name}</span>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium',
            emp.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
          )}>
            {emp.is_active ? '재직' : '퇴사'}
          </span>
          {/* 계정 연결 여부 */}
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium',
            isLinked ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700',
          )}>
            {isLinked ? '계정 연결됨' : '인증 대기'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-xs text-slate-500">
          {emp.department && <span>{emp.department}</span>}
          {emp.department && emp.position && <span className="text-slate-300">·</span>}
          {emp.position   && <span>{emp.position}</span>}
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
          {emp.email && (
            <span className="flex items-center gap-1">
              <Mail size={10} />{emp.email}
            </span>
          )}
          {emp.Date_of_joining && (
            <span className="flex items-center gap-1">
              <CalendarDays size={10} />{formatDateShort(emp.Date_of_joining)} 입사
            </span>
          )}
        </div>
      </div>

      <ChevronRight size={15} className="text-slate-400 flex-shrink-0" />
    </div>
  )
}
