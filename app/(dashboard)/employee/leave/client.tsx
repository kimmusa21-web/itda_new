'use client'

import { useState }       from 'react'
import {
  Calendar, CheckCircle, XCircle, Clock, Info,
  Loader2, Plus, ChevronDown,
} from 'lucide-react'
import { cn }             from '@/lib/utils'
import { requestLeave, cancelLeaveRequest } from '@/lib/actions/leave-actions'
import { dailyHours, countWeekdays }        from '@/lib/leave-calculator'
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from '@/types/leave'
import type { LeaveType, LeaveRequest, LeaveAdjustment, LeaveBalance, LeavePolicy, LeaveBasis } from '@/types/leave'

interface Employee { id: number; name: string; weekly_work_hours: number | null; Date_of_joining: string | null }

interface Props {
  employee:           Employee
  policy:             LeavePolicy
  balances:           LeaveBalance[]
  altRemainingHours:  number
  altBasis:           LeaveBasis
  requests:           LeaveRequest[]
  adjustments:        LeaveAdjustment[]
}

type Tab = 'status' | 'request' | 'history'

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:   { label: '대기중',  cls: 'bg-amber-50 text-amber-700 border border-amber-200'   },
  approved:  { label: '승인완료', cls: 'bg-green-50 text-green-700 border border-green-200'  },
  rejected:  { label: '반려됨',  cls: 'bg-red-50 text-red-700 border border-red-200'         },
  cancelled: { label: '취소됨',  cls: 'bg-slate-100 text-slate-500 border border-slate-200'  },
}

export function EmployeeLeaveClient({ employee, policy, balances, altRemainingHours, altBasis, requests: initReqs, adjustments }: Props) {
  const dh = dailyHours(employee.weekly_work_hours)

  const totalHours = balances.reduce((s, b) => s + b.total_hours, 0)
  const usedHours  = balances.reduce((s, b) => s + b.used_hours,  0)
  const adjHours   = balances.reduce((s, b) => s + b.adj_hours,   0)
  const remHours   = totalHours + adjHours - usedHours
  const remDays    = dh > 0 ? +(remHours / dh).toFixed(1) : 0

  const [tab,        setTab]        = useState<Tab>('status')
  const [leaveType,  setLeaveType]  = useState<LeaveType>('full_day')
  const [startDate,  setStartDate]  = useState('')
  const [endDate,    setEndDate]    = useState('')
  const [hourCount,  setHourCount]  = useState('')
  const [reason,     setReason]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState<number | null>(null)
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null)
  const [reqs,       setReqs]       = useState(initReqs)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // 신청 시간 미리보기
  const previewHours = (() => {
    if (!startDate) return 0
    const s = new Date(startDate)
    const e = endDate ? new Date(endDate) : s
    if (leaveType === 'hourly') return parseFloat(hourCount) || 0
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
    showToast(policy.auto_approve ? '연차가 자동 승인되었습니다' : '신청이 접수되었습니다. 매니저 승인을 기다려주세요')
    setStartDate(''); setEndDate(''); setHourCount(''); setReason('')
    setTab('history')
  }

  async function handleCancel(id: number) {
    setCancelling(id)
    const res = await cancelLeaveRequest(id)
    setCancelling(null)
    if (!res.success) { showToast(res.error ?? '취소 실패', false); return }
    setReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' as const } : r))
    showToast('취소되었습니다')
  }

  const basisLabel    = policy.basis === 'hire_date' ? '입사일' : '회계연도'
  const altBasisLabel = altBasis === 'hire_date' ? '입사일' : '회계연도'
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('ko-KR')
  const today   = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-5 max-w-2xl">

      {/* 잔액 카드 */}
      <div className="card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">{new Date().getFullYear()}년 연차 잔여 ({basisLabel} 기준)</p>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-4xl font-bold', remDays < 0 ? 'text-red-600' : 'text-slate-900')}>{remDays}</span>
              <span className="text-slate-400 text-sm">일</span>
              <span className="text-slate-300 text-sm">({remHours.toFixed(1)}시간)</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">{altBasisLabel} 기준 참고</p>
            <p className="text-sm font-medium text-slate-400">{dh > 0 ? (altRemainingHours / dh).toFixed(1) : '—'}일</p>
            <p className="text-xs text-slate-300">({altRemainingHours.toFixed(1)}h)</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="bg-slate-50 rounded-lg p-2">
            <p className="text-slate-400">발생</p>
            <p className="font-semibold text-slate-700 mt-0.5">{(totalHours / dh).toFixed(1)}일</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2">
            <p className="text-slate-400">사용</p>
            <p className="font-semibold text-slate-700 mt-0.5">{(usedHours / dh).toFixed(1)}일</p>
          </div>
          <div className={cn('rounded-lg p-2', adjHours !== 0 ? 'bg-amber-50' : 'bg-slate-50')}>
            <p className="text-slate-400">조정</p>
            <p className={cn('font-semibold mt-0.5', adjHours < 0 ? 'text-red-600' : adjHours > 0 ? 'text-green-600' : 'text-slate-400')}>
              {adjHours >= 0 ? '+' : ''}{(adjHours / dh).toFixed(1)}일
            </p>
          </div>
        </div>

        {/* 조정 이력 */}
        {adjustments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-2">수동 조정 이력</p>
            <div className="space-y-1">
              {adjustments.slice(0, 3).map(a => (
                <div key={a.id} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className={cn('font-semibold', a.hours < 0 ? 'text-red-500' : 'text-green-600')}>
                    {a.hours >= 0 ? '+' : ''}{a.hours}h
                  </span>
                  <span>{a.reason}</span>
                  <span className="text-slate-300">{fmtDate(a.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          ['status',  '현황'],
          ['request', '신청'],
          ['history', `이력 ${reqs.length}`],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
          >{label}</button>
        ))}
      </div>

      {/* ─ 현황 탭 ─ */}
      {tab === 'status' && (
        <div className="card overflow-hidden">
          {balances.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Calendar size={28} className="mx-auto mb-2 opacity-30" />
              발생된 연차가 없습니다. 담당 매니저에게 문의해주세요.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">기간</th>
                  <th className="text-left px-4 py-3 font-medium">구분</th>
                  <th className="text-right px-4 py-3 font-medium">발생</th>
                  <th className="text-right px-4 py-3 font-medium">사용</th>
                  <th className="text-right px-4 py-3 font-medium">잔여</th>
                  <th className="text-right px-4 py-3 font-medium">소멸일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {balances.map(b => {
                  const rem = b.total_hours + b.adj_hours - b.used_hours
                  return (
                    <tr key={b.id}>
                      <td className="px-4 py-3 text-slate-700">{b.period}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{b.period_type === 'monthly' ? '월차' : '연간'}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{(b.total_hours / dh).toFixed(1)}일</td>
                      <td className="px-4 py-3 text-right text-slate-600">{(b.used_hours / dh).toFixed(1)}일</td>
                      <td className={cn('px-4 py-3 text-right font-semibold', rem < 0 ? 'text-red-600' : 'text-slate-800')}>
                        {(rem / dh).toFixed(1)}일
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400">{fmtDate(b.expires_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─ 신청 탭 ─ */}
      {tab === 'request' && (
        <div className="card p-5 space-y-4">
          {/* 유형 선택 */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">연차 유형</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(LEAVE_TYPE_LABELS) as [LeaveType, string][]).map(([val, label]) => (
                <button key={val} onClick={() => setLeaveType(val)}
                  className={cn('text-sm py-2 px-3 rounded-lg border-2 transition-all text-left',
                    leaveType === val ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
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
                onChange={e => { setStartDate(e.target.value); if (!endDate || e.target.value > endDate) setEndDate(e.target.value) }}
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

          {/* 시간 수 (hourly) */}
          {leaveType === 'hourly' && (
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">사용 시간 수</label>
              <div className="flex items-center gap-2">
                <input type="number" min="1" max={dh} step="1" value={hourCount}
                  onChange={e => setHourCount(e.target.value)}
                  placeholder={`최대 ${dh}시간`}
                  className="input w-32 text-sm" />
                <span className="text-xs text-slate-400">시간 (1일={dh}시간)</span>
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
            <div className="bg-emerald-50 rounded-lg px-4 py-3 text-sm">
              <span className="text-slate-500">예상 차감: </span>
              <span className="font-semibold text-emerald-700">{previewHours}시간 ({(previewHours / dh).toFixed(1)}일)</span>
              {leaveType === 'full_day' && startDate && endDate && (
                <span className="text-slate-400 text-xs ml-2">(주말 제외)</span>
              )}
            </div>
          )}

          {!policy.allow_negative && previewHours > remHours && previewHours > 0 && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <Info size={12} />잔여 연차({remHours.toFixed(1)}h)가 부족합니다
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting}
            className="w-full bg-emerald-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {submitting ? <><Loader2 size={16} className="animate-spin" />처리 중...</> : '연차 신청'}
          </button>
        </div>
      )}

      {/* ─ 이력 탭 ─ */}
      {tab === 'history' && (
        <div className="card overflow-hidden">
          {reqs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">신청 이력이 없습니다</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {reqs.map(r => {
                const badge = STATUS_BADGE[r.status]
                const typeLabel = LEAVE_TYPE_LABELS[r.leave_type] ?? r.leave_type
                return (
                  <li key={r.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-700">{typeLabel}</span>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', badge.cls)}>{badge.label}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {fmtDate(r.start_date)} ~ {fmtDate(r.end_date)} · {r.hours_requested}시간
                        </p>
                        {r.reason && <p className="text-xs text-slate-400 mt-0.5">사유: {r.reason}</p>}
                        {r.rejection_reason && (
                          <p className="text-xs text-red-500 mt-0.5">반려 사유: {r.rejection_reason}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs text-slate-300">{fmtDate(r.requested_at)}</p>
                        {r.status === 'pending' && (
                          <button onClick={() => handleCancel(r.id)} disabled={cancelling === r.id}
                            className="mt-1 text-xs text-red-400 hover:text-red-600">
                            {cancelling === r.id ? <Loader2 size={12} className="animate-spin inline" /> : '취소'}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-full shadow-lg text-sm font-medium z-50',
          toast.ok ? 'bg-slate-900 text-white' : 'bg-red-600 text-white',
        )}>
          {toast.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
