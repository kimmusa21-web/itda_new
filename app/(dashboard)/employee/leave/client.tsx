'use client'

import { useState } from 'react'
import {
  Calendar, CheckCircle, XCircle, Clock,
  Info, Loader2, Plus, Minus,
  ChevronDown, ChevronUp, TrendingUp, TrendingDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { requestLeave, cancelLeaveRequest } from '@/lib/actions/leave-actions'
import { dailyHours, countWeekdays }        from '@/lib/leave-calculator'
import { LEAVE_TYPE_LABELS }               from '@/types/leave'
import type {
  LeaveType, LeaveRequest, LeaveAdjustment,
  LeaveBalance, LeavePolicy, SpecialLeaveGrant,
} from '@/types/leave'

interface Employee {
  id: number; name: string
  weekly_work_hours: number | null
  Date_of_joining: string | null
}

interface Props {
  employee:      Employee
  policy:        LeavePolicy | null
  balances:      LeaveBalance[]
  requests:      LeaveRequest[]
  adjustments:   LeaveAdjustment[]
  specialGrants: SpecialLeaveGrant[]
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:   { label: '대기중',  cls: 'bg-amber-50 text-amber-700 border-amber-200'  },
  approved:  { label: '승인',   cls: 'bg-green-50 text-green-700 border-green-200'  },
  rejected:  { label: '반려',   cls: 'bg-red-50 text-red-700 border-red-200'        },
  cancelled: { label: '취소',   cls: 'bg-slate-100 text-slate-500 border-slate-200' },
}

export function EmployeeLeaveClient({
  employee, policy, balances, requests: initReqs, adjustments, specialGrants,
}: Props) {
  const dh = dailyHours(employee.weekly_work_hours)

  const totalHours = balances.reduce((s, b) => s + b.total_hours, 0)
  const usedHours  = balances.reduce((s, b) => s + b.used_hours,  0)
  const adjHours   = balances.reduce((s, b) => s + b.adj_hours,   0)
  const remHours   = totalHours + adjHours - usedHours

  const toDay = (h: number) => dh > 0 ? +(h / dh).toFixed(2) : 0

  /* ── 신청 폼 상태 ── */
  const [reqs,       setReqs]       = useState(initReqs)
  const [showForm,   setShowForm]   = useState(false)
  const [leaveType,  setLeaveType]  = useState<LeaveType>('full_day')
  const [startDate,  setStartDate]  = useState('')
  const [endDate,    setEndDate]    = useState('')
  const [hourCount,  setHourCount]  = useState('')
  const [reason,     setReason]     = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [cancelling,   setCancelling]   = useState<number | null>(null)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const previewHours = (() => {
    if (!startDate) return 0
    const s = new Date(startDate)
    const e = endDate ? new Date(endDate) : s
    if (leaveType === 'hourly')   return parseFloat(hourCount) || 0
    if (leaveType === 'full_day') return countWeekdays(s, e) * dh
    return dh / 2
  })()

  async function handleSubmit() {
    if (!startDate) { showToast('시작일을 선택해주세요', false); return }
    if (leaveType === 'full_day' && !endDate) { showToast('종료일을 선택해주세요', false); return }
    if (leaveType === 'hourly' && (!hourCount || parseFloat(hourCount) <= 0)) {
      showToast('시간을 입력해주세요', false); return
    }
    setSubmitting(true)
    const res = await requestLeave({
      leave_type:   leaveType,
      start_date:   startDate,
      end_date:     leaveType === 'full_day' ? (endDate || startDate) : startDate,
      reason:       reason || null,
      hourly_count: leaveType === 'hourly' ? parseFloat(hourCount) : undefined,
    })
    setSubmitting(false)
    if (!res.success) { showToast(res.error ?? '신청 실패', false); return }
    showToast(policy?.auto_approve
      ? '연차가 자동 승인되었습니다'
      : '신청이 접수되었습니다. 매니저 승인을 기다려주세요')
    setStartDate(''); setEndDate(''); setHourCount(''); setReason('')
    setShowForm(false)
    window.location.reload()
  }

  async function doCancel(id: number) {
    setConfirmingId(null)
    setCancelling(id)
    const res = await cancelLeaveRequest(id)
    setCancelling(null)
    if (!res.success) { showToast(res.error ?? '취소 실패', false); return }
    setReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' as const } : r))
    showToast('취소되었습니다')
  }

  function handleCancelClick(r: LeaveRequest) {
    if (r.status === 'approved') {
      setConfirmingId(r.id)
    } else {
      doCancel(r.id)
    }
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('ko-KR')
  const today   = new Date().toISOString().slice(0, 10)

  const grantHistory = [...balances].reverse()
  const hasAnyData   = balances.length > 0 || adjustments.length > 0 || reqs.length > 0

  return (
    <div className="space-y-4 max-w-2xl">

      {/* ── 요약 카드 ── */}
      <div className="card p-5">
        <p className="text-xs font-medium text-slate-400 mb-3">연차 현황</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs text-blue-500 font-medium mb-1">부여</p>
            <p className="text-3xl font-bold text-blue-700 leading-none">{toDay(totalHours + adjHours)}</p>
            <p className="text-[11px] text-blue-400 mt-1">일</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-xs text-amber-500 font-medium mb-1">사용</p>
            <p className="text-3xl font-bold text-amber-700 leading-none">{toDay(usedHours)}</p>
            <p className="text-[11px] text-amber-400 mt-1">일</p>
          </div>
          <div className={cn('rounded-xl p-3', remHours < 0 ? 'bg-red-50' : 'bg-emerald-50')}>
            <p className={cn('text-xs font-medium mb-1', remHours < 0 ? 'text-red-500' : 'text-emerald-500')}>잔여</p>
            <p className={cn('text-3xl font-bold leading-none', remHours < 0 ? 'text-red-700' : 'text-emerald-700')}>
              {toDay(remHours)}
            </p>
            <p className={cn('text-[11px] mt-1', remHours < 0 ? 'text-red-400' : 'text-emerald-400')}>일</p>
          </div>
        </div>

        {!hasAnyData && (
          <p className="text-xs text-slate-400 text-center mt-4">
            연차 정보가 없습니다. 담당 매니저에게 문의해주세요.
          </p>
        )}
      </div>

      {/* ── 연차 신청 ── */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setShowForm(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Plus size={15} className="text-emerald-500" />
            연차 신청하기
          </span>
          {showForm
            ? <ChevronUp size={15} className="text-slate-400" />
            : <ChevronDown size={15} className="text-slate-400" />}
        </button>

        {showForm && (
          <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4">
            {/* 유형 */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">연차 유형</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(LEAVE_TYPE_LABELS) as [LeaveType, string][]).map(([val, label]) => (
                  <button key={val} onClick={() => setLeaveType(val)}
                    className={cn(
                      'text-sm py-2 px-3 rounded-lg border-2 transition-all text-left',
                      leaveType === val
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300',
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 날짜 */}
            <div className={cn('grid gap-3', leaveType === 'full_day' ? 'grid-cols-2' : 'grid-cols-1')}>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">
                  {leaveType === 'full_day' ? '시작일' : '날짜'}
                </label>
                <input type="date" value={startDate} min={today}
                  onChange={e => {
                    setStartDate(e.target.value)
                    if (!endDate || e.target.value > endDate) setEndDate(e.target.value)
                  }}
                  className="input w-full text-sm" />
              </div>
              {leaveType === 'full_day' && (
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">종료일</label>
                  <input type="date" value={endDate} min={startDate || today}
                    onChange={e => setEndDate(e.target.value)}
                    className="input w-full text-sm" />
                </div>
              )}
            </div>

            {/* 시간 수 */}
            {leaveType === 'hourly' && (
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">사용 시간 수</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" max={dh} step="1" value={hourCount}
                    onChange={e => setHourCount(e.target.value)}
                    placeholder={`최대 ${dh}시간`}
                    className="input w-32 text-sm" />
                  <span className="text-xs text-slate-400">시간 (1일 = {dh}시간)</span>
                </div>
              </div>
            )}

            {/* 사유 */}
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">사유 (선택)</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                placeholder="연차 사용 사유"
                className="input w-full text-sm" />
            </div>

            {/* 미리보기 */}
            {previewHours > 0 && (
              <div className="bg-emerald-50 rounded-lg px-4 py-2.5 text-sm">
                <span className="text-slate-500">예상 차감 </span>
                <span className="font-semibold text-emerald-700">
                  {previewHours}시간 ({toDay(previewHours)}일)
                </span>
              </div>
            )}

            {!(policy?.allow_negative ?? false) && previewHours > remHours && previewHours > 0 && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <Info size={12} />잔여 연차({remHours.toFixed(1)}h)가 부족합니다
              </div>
            )}

            <button onClick={handleSubmit} disabled={submitting}
              className="w-full bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {submitting ? <><Loader2 size={15} className="animate-spin" />처리 중...</> : '신청하기'}
            </button>
          </div>
        )}
      </div>

      {/* ── 특별휴가 ── */}
      {specialGrants.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-indigo-50 flex items-center gap-2">
            <Calendar size={14} className="text-indigo-500" />
            <p className="text-sm font-semibold text-indigo-700">특별휴가</p>
          </div>
          <ul className="divide-y divide-slate-50">
            {specialGrants.map(g => {
              const today = new Date().toISOString().slice(0, 10)
              const isExpired = g.expires_at ? g.expires_at < today : false
              return (
                <li key={g.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                    isExpired ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600',
                  )}>
                    {g.days}일
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800">{g.leave_kind}</span>
                      {isExpired && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">만료</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      부여일: {fmtDate(g.grant_date)}
                      {g.expires_at ? ` · 만료: ${fmtDate(g.expires_at)}` : ''}
                    </p>
                    {g.note && <p className="text-xs text-slate-500 mt-0.5">{g.note}</p>}
                  </div>
                  <p className={cn('text-sm font-bold flex-shrink-0', isExpired ? 'text-slate-400' : 'text-indigo-700')}>
                    +{g.days}일
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* ── 부여 내역 ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <TrendingUp size={14} className="text-blue-500" />
          <p className="text-sm font-semibold text-slate-700">부여 내역</p>
        </div>

        {grantHistory.length === 0 && adjustments.length === 0 ? (
          <div className="py-10 text-center">
            <Calendar size={24} className="mx-auto mb-2 text-slate-200" />
            <p className="text-sm text-slate-400">부여된 연차가 없습니다</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {grantHistory.map(b => {
              const dayTotal = toDay(b.total_hours)
              const adjDay   = toDay(b.adj_hours)
              const periodLabel = b.period_type === 'monthly'
                ? `${b.period} 월차`
                : `${b.period}년 연간 연차`
              return (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={14} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{periodLabel}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      부여: {fmtDate(b.created_at)} · 소멸: {fmtDate(b.expires_at)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-blue-700">+{dayTotal}일</p>
                    {adjDay !== 0 && (
                      <p className={cn('text-xs mt-0.5', adjDay < 0 ? 'text-red-500' : 'text-emerald-600')}>
                        조정 {adjDay >= 0 ? '+' : ''}{adjDay}일
                      </p>
                    )}
                  </div>
                </li>
              )
            })}

            {adjustments.map(a => {
              const dayAdj = toDay(a.hours)
              return (
                <li key={`adj-${a.id}`} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    a.hours >= 0 ? 'bg-emerald-50' : 'bg-red-50',
                  )}>
                    {a.hours >= 0
                      ? <Plus size={14} className="text-emerald-500" />
                      : <Minus size={14} className="text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">수동 조정</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{a.reason || '—'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn('text-sm font-bold', a.hours >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                      {a.hours >= 0 ? '+' : ''}{dayAdj}일
                    </p>
                    <p className="text-xs text-slate-400">{fmtDate(a.created_at)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* ── 사용 내역 ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <TrendingDown size={14} className="text-amber-500" />
          <p className="text-sm font-semibold text-slate-700">사용 내역</p>
        </div>

        {reqs.length === 0 ? (
          <div className="py-10 text-center">
            <Calendar size={24} className="mx-auto mb-2 text-slate-200" />
            <p className="text-sm text-slate-400">연차 사용 이력이 없습니다</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {reqs.map(r => {
              const badge    = STATUS_BADGE[r.status]
              const typeLabel = LEAVE_TYPE_LABELS[r.leave_type] ?? r.leave_type
              const dayUsed  = toDay(r.hours_requested)
              const sameDay  = r.start_date === r.end_date
              return (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    r.status === 'approved' ? 'bg-amber-50' : 'bg-slate-100',
                  )}>
                    {r.status === 'approved'
                      ? <TrendingDown size={14} className="text-amber-500" />
                      : r.status === 'pending'
                        ? <Clock size={14} className="text-slate-400" />
                        : <XCircle size={14} className="text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-slate-800">{typeLabel}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium border', badge.cls)}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {fmtDate(r.start_date)}{!sameDay ? ` ~ ${fmtDate(r.end_date)}` : ''}
                    </p>
                    {r.reason && (
                      <p className="text-xs text-slate-400 truncate">{r.reason}</p>
                    )}
                    {r.rejection_reason && (
                      <p className="text-xs text-red-500 mt-0.5">반려 사유: {r.rejection_reason}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn(
                      'text-sm font-bold',
                      r.status === 'approved' ? 'text-amber-700' : 'text-slate-400',
                    )}>
                      {r.status === 'approved' ? `-${dayUsed}` : dayUsed}일
                    </p>

                    {/* 승인된 다일 연차: 부분 취소 불가 안내 */}
                    {r.status === 'approved' && r.leave_type === 'full_day' && r.start_date !== r.end_date && (
                      <p className="text-[10px] text-orange-400 mt-0.5">전체 취소 후 재신청</p>
                    )}

                    {/* pending: 바로 취소 / approved: 인라인 확인 */}
                    {(r.status === 'pending' || r.status === 'approved') && (
                      confirmingId === r.id ? (
                        <div className="flex items-center gap-2 mt-1 justify-end">
                          <span className="text-[10px] text-slate-500">취소할까요?</span>
                          <button
                            onClick={() => doCancel(r.id)}
                            className="text-xs font-semibold text-red-600 hover:underline"
                          >
                            확인
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            className="text-xs text-slate-400 hover:underline"
                          >
                            닫기
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCancelClick(r)}
                          disabled={cancelling === r.id}
                          className="text-xs text-red-400 hover:text-red-600 mt-0.5"
                        >
                          {cancelling === r.id
                            ? <Loader2 size={10} className="animate-spin inline" />
                            : '취소'}
                        </button>
                      )
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* 토스트 */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-full shadow-lg text-sm font-medium z-50 whitespace-nowrap',
          toast.ok ? 'bg-slate-900 text-white' : 'bg-red-600 text-white',
        )}>
          {toast.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
