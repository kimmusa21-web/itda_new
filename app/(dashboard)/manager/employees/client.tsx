'use client'
/* ================================================================
   Manager 직원 목록 — 클라이언트 컴포넌트
   실제 Supabase 데이터 기반 (사번 검색 포함)
================================================================ */

import { useState, useTransition } from 'react'
import { Search, Users, Mail, CalendarDays, Hash, X, Send, Loader2 } from 'lucide-react'
import type { EmployeeRow }     from '@/lib/supabase/queries/employee'
import { formatDateShort, cn, getInitials } from '@/lib/utils'
import { resendEmployeeInvite } from '@/lib/actions/employee-invite-create'

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
  const [filter, setFilter]   = useState<Filter>('active')
  const [search, setSearch]   = useState('')

  const filtered = initialEmployees.filter(e => {
    const matchStatus =
      filter === 'all'      ? true :
      filter === 'active'   ? e.is_active : !e.is_active
    const s = search.toLowerCase()
    const matchSearch =
      !search ||
      (e.name            ?? '').toLowerCase().includes(s) ||
      (e.email           ?? '').toLowerCase().includes(s) ||
      (e.employee_number ?? '').toLowerCase().includes(s) ||
      (e.department      ?? '').includes(search)
    return matchStatus && matchSearch
  })

  return (
    <>
      {/* 검색 + 탭 */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="이름, 이메일, 사번, 부서 검색"
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
        {/* 재직/퇴사 탭 */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl self-start">
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
  const bg       = avatarBg(emp.name ?? '?')
  const initials = getInitials(emp.name ?? '?')
  const isLinked = !!emp.user_id

  // 초대 대기 중 (등록됐지만 아직 가입 미완료)
  const isInvited = !isLinked && !emp.is_active

  const [isPending, startTransition] = useTransition()
  const [resendMsg, setResendMsg]    = useState<{ ok: boolean; text: string } | null>(null)

  function handleResend() {
    setResendMsg(null)
    startTransition(async () => {
      const result = await resendEmployeeInvite(emp.id, emp.company_id)
      setResendMsg(
        result.success
          ? { ok: true,  text: '초대 이메일을 재발송했습니다.' }
          : { ok: false, text: result.error ?? '재발송 실패' },
      )
      // 3초 후 메시지 제거
      setTimeout(() => setResendMsg(null), 3000)
    })
  }

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
          {emp.employee_number && (
            <span className="flex items-center gap-0.5 text-xs text-slate-400 font-mono">
              <Hash size={10} />
              {emp.employee_number}
            </span>
          )}
          {/* 재직/퇴사 뱃지 */}
          {emp.is_active ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
              재직
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500">
              퇴사
            </span>
          )}
          {/* 계정 상태 뱃지 */}
          {isLinked ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
              가입완료
            </span>
          ) : isInvited ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
              초대 대기
            </span>
          ) : null}
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

        {/* 재발송 결과 메시지 */}
        {resendMsg && (
          <p className={cn(
            'mt-1.5 text-xs font-medium',
            resendMsg.ok ? 'text-emerald-600' : 'text-red-500',
          )}>
            {resendMsg.text}
          </p>
        )}
      </div>

      {/* 초대 재발송 버튼 (가입 미완료 직원만 표시) */}
      {!isLinked && (
        <button
          onClick={handleResend}
          disabled={isPending}
          title="초대 이메일 재발송"
          className={cn(
            'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0',
            isPending
              ? 'border-slate-200 text-slate-300 cursor-not-allowed'
              : 'border-blue-200 text-blue-600 hover:bg-blue-50',
          )}
        >
          {isPending
            ? <Loader2 size={13} className="animate-spin" />
            : <Send size={13} />
          }
          재발송
        </button>
      )}
    </div>
  )
}
