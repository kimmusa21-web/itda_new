'use client'

import { useState }   from 'react'
import {
  Calendar, CheckCircle, XCircle, Clock, Users,
  ChevronDown, Loader2, AlertCircle, Settings, Plus, Minus,
} from 'lucide-react'
import { cn }          from '@/lib/utils'
import {
  approveLeaveRequest, rejectLeaveRequest,
  adjustLeaveBalance, allocateLeaveForAllEmployees,
} from '@/lib/actions/leave-actions'
import { dailyHours }  from '@/lib/leave-calculator'
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from '@/types/leave'
import type { LeaveType } from '@/types/leave'

interface Employee { id: number; name: string; department: string | null; position: string | null; Date_of_joining: string | null; weekly_work_hours: number | null }
interface Balance  { id: number; employee_id: number; period: string; period_type: string; total_hours: number; used_hours: number; adj_hours: number; expires_at: string }
interface Request  { id: number; employee_id: number; leave_type: LeaveType; start_date: string; end_date: string; hours_requested: number; reason: string | null; status: string; requested_at: string; rejection_reason: string | null; employees: { id: number; name: string; department: string | null; position: string | null }[] | null }
interface Adjustment { id: number; employee_id: number; hours: number; reason: string; created_at: string }
interface Policy { basis: string; allow_negative: boolean; auto_approve: boolean; settle_on_resign: boolean }

interface Props {
  policy:          Policy
  employees:       Employee[]
  balances:        Balance[]
  pendingRequests: Request[]
  adjustments:     Adjustment[]
  currentYear:     number
}

type Tab = 'overview' | 'requests' | 'adjust'

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:   { label: '대기',   cls: 'bg-amber-50 text-amber-700 border border-amber-200'   },
  approved:  { label: '승인',   cls: 'bg-green-50 text-green-700 border border-green-200'   },
  rejected:  { label: '반려',   cls: 'bg-red-50 text-red-700 border border-red-200'         },
  cancelled: { label: '취소',   cls: 'bg-slate-50 text-slate-500 border border-slate-200'   },
}

function empBalanceSummary(empId: number, balances: Balance[], weeklyHours: number | null) {
  const dh    = dailyHours(weeklyHours)
  const emBal = balances.filter(b => b.employee_id === empId)
  const total = emBal.reduce((s, b) => s + b.total_hours, 0)
  const used  = emBal.reduce((s, b) => s + b.used_hours, 0)
  const adj   = emBal.reduce((s, b) => s + b.adj_hours, 0)
  const rem   = total + adj - used
  return { total, used, adj, rem, remDays: dh > 0 ? +(rem / dh).toFixed(1) : 0 }
}

export function ManagerLeaveClient({ policy, employees, balances, pendingRequests, adjustments, currentYear }: Props) {
  const [tab,          setTab]          = useState<Tab>('requests')
  const [processing,   setProcessing]   = useState<number | null>(null)
  const [rejectId,     setRejectId]     = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [adjOpen,      setAdjOpen]      = useState<number | null>(null)  // employee_id
  const [adjHours,     setAdjHours]     = useState('')
  const [adjSign,      setAdjSign]      = useState<1 | -1>(-1)
  const [adjReason,    setAdjReason]    = useState('')
  const [adjBalId,     setAdjBalId]     = useState<number | null>(null)
  const [allocating,   setAllocating]   = useState(false)
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null)
  const [reqs,         setReqs]         = useState(pendingRequests)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleApprove(id: number) {
    setProcessing(id)
    const res = await approveLeaveRequest(id)
    setProcessing(null)
    if (!res.success) { showToast(res.error ?? '오류', false); return }
    setReqs(prev => prev.filter(r => r.id !== id))
    showToast('승인 완료')
  }

  async function handleReject() {
    if (!rejectId) return
    setProcessing(rejectId)
    const res = await rejectLeaveRequest(rejectId, rejectReason)
    setProcessing(null)
    if (!res.success) { showToast(res.error ?? '오류', false); return }
    setReqs(prev => prev.filter(r => r.id !== rejectId))
    setRejectId(null); setRejectReason('')
    showToast('반려 처리 완료')
  }

  async function handleAdjust(empId: number) {
    if (!adjBalId || !adjHours || !adjReason.trim()) { showToast('모든 항목을 입력해주세요', false); return }
    const hours = parseFloat(adjHours) * adjSign
    if (isNaN(hours) || hours === 0) { showToast('유효한 시간을 입력해주세요', false); return }
    setProcessing(empId)
    const res = await adjustLeaveBalance({ employee_id: empId, balance_id: adjBalId, hours, reason: adjReason })
    setProcessing(null)
    if (!res.success) { showToast(res.error ?? '오류', false); return }
    setAdjOpen(null); setAdjHours(''); setAdjReason(''); setAdjBalId(null)
    showToast('조정 완료')
  }

  async function handleAllocate() {
    setAllocating(true)
    const res = await allocateLeaveForAllEmployees(currentYear)
    setAllocating(false)
    if (!res.success) { showToast(res.error ?? '오류', false); return }
    showToast(`${res.count}명에게 ${currentYear}년 연차 발급 완료`)
  }

  const basisLabel = policy.basis === 'hire_date' ? '입사일' : '회계연도'
  const fmtDate    = (d: string) => new Date(d).toLocaleDateString('ko-KR')

  return (
    <div className="space-y-5 max-w-4xl">

      {/* 정책 요약 */}
      <div className="card px-5 py-4 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{basisLabel} 기준</span>
          {policy.auto_approve    && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">자동승인 ON</span>}
          {policy.allow_negative  && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">마이너스 허용</span>}
          {policy.settle_on_resign && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">퇴직정산 ON</span>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAllocate}
            disabled={allocating}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
          >
            {allocating ? <Loader2 size={12} className="animate-spin" /> : <Calendar size={12} />}
            {currentYear}년 연차 일괄 발급
          </button>
          <a href="/manager/leave/settings" className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1">
            <Settings size={12} />설정 변경
          </a>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          ['requests', `승인 대기 ${reqs.length}`],
          ['overview', `직원별 현황 ${employees.length}`],
          ['adjust',   '수동 조정'],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
          >{label}</button>
        ))}
      </div>

      {/* ─ 승인 대기 탭 ─ */}
      {tab === 'requests' && (
        <div className="card overflow-hidden">
          {reqs.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Clock size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">승인 대기 중인 신청이 없습니다</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {reqs.map(r => {
                const empInfo = (r.employees as unknown as { name: string; department: string | null; position: string | null }[])?.[0]
                const isProc  = processing === r.id
                const typeLabel = LEAVE_TYPE_LABELS[r.leave_type] ?? r.leave_type
                return (
                  <li key={r.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800 text-sm">{empInfo?.name ?? '—'}</span>
                          <span className="text-xs text-slate-400">{[empInfo?.department, empInfo?.position].filter(Boolean).join(' · ')}</span>
                          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">{typeLabel}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {fmtDate(r.start_date)} ~ {fmtDate(r.end_date)} · {r.hours_requested}시간 차감
                        </div>
                        {r.reason && <p className="mt-0.5 text-xs text-slate-400">사유: {r.reason}</p>}
                        <p className="mt-0.5 text-xs text-slate-300">{fmtDate(r.requested_at)} 신청</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => handleApprove(r.id)} disabled={isProc}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                          {isProc ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}승인
                        </button>
                        <button onClick={() => { setRejectId(r.id); setRejectReason('') }} disabled={isProc}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                          <XCircle size={12} />반려
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* ─ 직원별 현황 탭 ─ */}
      {tab === 'overview' && (
        <div className="card overflow-hidden">
          {employees.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">재직 중인 직원이 없습니다</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">직원</th>
                    <th className="text-left px-4 py-3 font-medium">입사일</th>
                    <th className="text-right px-4 py-3 font-medium">발생(h)</th>
                    <th className="text-right px-4 py-3 font-medium">조정(h)</th>
                    <th className="text-right px-4 py-3 font-medium">사용(h)</th>
                    <th className="text-right px-4 py-3 font-medium">잔여(일)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map(emp => {
                    const s = empBalanceSummary(emp.id, balances, emp.weekly_work_hours)
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{emp.name}</p>
                          <p className="text-xs text-slate-400">{[emp.department, emp.position].filter(Boolean).join(' · ')}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                          {emp.Date_of_joining
                            ? new Date(emp.Date_of_joining).toLocaleDateString('ko-KR')
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">{s.total.toFixed(1)}</td>
                        <td className={cn('px-4 py-3 text-right', s.adj < 0 ? 'text-red-600' : s.adj > 0 ? 'text-green-600' : 'text-slate-400')}>
                          {s.adj >= 0 ? '+' : ''}{s.adj.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">{s.used.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          <span className={cn(s.rem < 0 ? 'text-red-600' : 'text-slate-800')}>
                            {s.remDays}일
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─ 수동 조정 탭 ─ */}
      {tab === 'adjust' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">결근 등으로 인한 연차 차감 또는 추가 부여 시 사용합니다. 직원도 이력을 확인할 수 있습니다.</p>
          {employees.map(emp => {
            const empBals = balances.filter(b => b.employee_id === emp.id)
            const s       = empBalanceSummary(emp.id, balances, emp.weekly_work_hours)
            const isOpen  = adjOpen === emp.id
            const isProc  = processing === emp.id
            const empAdjs = adjustments.filter(a => a.employee_id === emp.id)

            return (
              <div key={emp.id} className="card overflow-hidden">
                <button
                  onClick={() => { setAdjOpen(isOpen ? null : emp.id); setAdjHours(''); setAdjReason(''); setAdjBalId(empBals[0]?.id ?? null) }}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-800 text-sm">{emp.name}</span>
                    <span className="text-xs text-slate-400">{[emp.department, emp.position].filter(Boolean).join(' · ')}</span>
                    <span className={cn('text-xs font-semibold', s.rem < 0 ? 'text-red-600' : 'text-slate-600')}>
                      잔여 {s.remDays}일({+s.rem.toFixed(1)}h)
                    </span>
                  </div>
                  <ChevronDown size={16} className={cn('text-slate-400 transition-transform', isOpen && 'rotate-180')} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
                    {/* 조정 이력 */}
                    {empAdjs.length > 0 && (
                      <div className="text-xs space-y-1">
                        <p className="text-slate-500 font-medium mb-2">조정 이력</p>
                        {empAdjs.slice(0, 5).map(a => (
                          <div key={a.id} className="flex items-center gap-2 text-slate-600">
                            <span className={cn('font-semibold', a.hours < 0 ? 'text-red-600' : 'text-green-600')}>
                              {a.hours >= 0 ? '+' : ''}{a.hours}h
                            </span>
                            <span>{a.reason}</span>
                            <span className="text-slate-300">{fmtDate(a.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 조정 폼 */}
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <button onClick={() => setAdjSign(-1)}
                          className={cn('flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors',
                            adjSign === -1 ? 'bg-red-50 border-red-300 text-red-700' : 'border-slate-200 text-slate-500')}>
                          <Minus size={12} />차감
                        </button>
                        <button onClick={() => setAdjSign(1)}
                          className={cn('flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors',
                            adjSign === 1 ? 'bg-green-50 border-green-300 text-green-700' : 'border-slate-200 text-slate-500')}>
                          <Plus size={12} />추가
                        </button>
                      </div>

                      {empBals.length > 1 && (
                        <select
                          value={adjBalId ?? ''}
                          onChange={e => setAdjBalId(Number(e.target.value))}
                          className="input text-xs"
                        >
                          {empBals.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.period} ({b.period_type === 'monthly' ? '월차' : '연간'}) — 잔여 {((b.total_hours + b.adj_hours - b.used_hours) / dailyHours(emp.weekly_work_hours)).toFixed(1)}일({+(b.total_hours + b.adj_hours - b.used_hours).toFixed(1)}h)
                            </option>
                          ))}
                        </select>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          placeholder="시간 수"
                          value={adjHours}
                          onChange={e => setAdjHours(e.target.value)}
                          className="input w-28 text-sm"
                        />
                        <input
                          placeholder="조정 사유 (예: 결근 차감)"
                          value={adjReason}
                          onChange={e => setAdjReason(e.target.value)}
                          className="input flex-1 text-sm"
                        />
                      </div>

                      <button
                        onClick={() => handleAdjust(emp.id)}
                        disabled={isProc}
                        className="text-xs px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 flex items-center gap-1"
                      >
                        {isProc ? <Loader2 size={12} className="animate-spin" /> : null}
                        조정 적용
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 반려 모달 */}
      {rejectId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-slate-900 mb-1">반려 사유 입력</h3>
            <p className="text-xs text-slate-400 mb-4">직원에게 이메일로 반려 사유가 전달됩니다 (선택)</p>
            <textarea
              className="input resize-none w-full"
              rows={3}
              placeholder="반려 사유 입력 (선택)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setRejectId(null); setRejectReason('') }} className="btn-secondary flex-1">취소</button>
              <button onClick={handleReject} disabled={processing !== null}
                className="flex-1 bg-red-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-red-700 flex items-center justify-center gap-2">
                {processing !== null ? <Loader2 size={14} className="animate-spin" /> : null}반려 처리
              </button>
            </div>
          </div>
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
