'use client'

import { useState, useMemo } from 'react'
import {
  Calendar, CheckCircle, XCircle, Clock,
  ChevronDown, Loader2, Settings, Plus, Minus, Download,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { cn }         from '@/lib/utils'
import {
  approveLeaveRequest, rejectLeaveRequest,
  adjustLeaveBalance, allocateLeaveForAllEmployees,
} from '@/lib/actions/leave-actions'
import { dailyHours } from '@/lib/leave-calculator'
import { LEAVE_TYPE_LABELS } from '@/types/leave'
import type { LeaveType } from '@/types/leave'

/* ── 타입 ──────────────────────────────────────────────────── */
interface Employee   { id: number; name: string; department: string | null; position: string | null; Date_of_joining: string | null; weekly_work_hours: number | null }
interface Balance    { id: number; employee_id: number; period: string; period_type: string; total_hours: number; used_hours: number; adj_hours: number; expires_at: string }
interface Request    { id: number; employee_id: number; leave_type: LeaveType; start_date: string; end_date: string; hours_requested: number; reason: string | null; status: string; requested_at: string; rejection_reason: string | null; employees: { id: number; name: string; department: string | null; position: string | null }[] | null }
interface AllRequest { id: number; employee_id: number; leave_type: LeaveType; start_date: string; end_date: string; hours_requested: number; reason: string | null; status: string }
interface Adjustment { id: number; employee_id: number; hours: number; reason: string; created_at: string }
interface Policy     { basis: string; allow_negative: boolean; auto_approve: boolean; settle_on_resign: boolean }

interface Props {
  policy:          Policy
  employees:       Employee[]
  balances:        Balance[]
  pendingRequests: Request[]
  allRequests:     AllRequest[]
  adjustments:     Adjustment[]
  currentYear:     number
}

type Tab = 'overview' | 'requests' | 'adjust'

interface DetailEvent {
  sortDate:  string
  dateLabel: string
  kind:      'accrual' | 'usage' | 'adjustment'
  label:     string
  hours:     number
}

/* ── 요약 계산 ─────────────────────────────────────────────── */
function empBalanceSummary(empId: number, balances: Balance[], weeklyHours: number | null) {
  const dh    = dailyHours(weeklyHours)
  const emBal = balances.filter(b => b.employee_id === empId)
  const total = emBal.reduce((s, b) => s + b.total_hours, 0)
  const used  = emBal.reduce((s, b) => s + b.used_hours, 0)
  const adj   = emBal.reduce((s, b) => s + b.adj_hours, 0)
  const rem   = total + adj - used
  return { total, used, adj, rem, remDays: dh > 0 ? +(rem / dh).toFixed(2) : 0 }
}

/* ── 메인 컴포넌트 ─────────────────────────────────────────── */
export function ManagerLeaveClient({
  policy, employees, balances, pendingRequests, allRequests, adjustments, currentYear,
}: Props) {
  const [tab,          setTab]          = useState<Tab>('requests')
  const [processing,   setProcessing]   = useState<number | null>(null)
  const [rejectId,     setRejectId]     = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [adjOpen,      setAdjOpen]      = useState<number | null>(null)
  const [adjHours,     setAdjHours]     = useState('')
  const [adjSign,      setAdjSign]      = useState<1 | -1>(-1)
  const [adjReason,    setAdjReason]    = useState('')
  const [adjBalId,     setAdjBalId]     = useState<number | null>(null)
  const [allocating,   setAllocating]   = useState(false)
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null)
  const [reqs,         setReqs]         = useState(pendingRequests)

  // 직원별 현황 탭 상태
  const [ovYear,  setOvYear]  = useState(currentYear)
  const [ovEmpId, setOvEmpId] = useState<number | 'all'>('all')

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

  /* ── 직원별 현황 헬퍼 ────────────────────────────────────── */

  // 데이터에서 존재하는 연도 목록
  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear])
    balances.forEach(b   => years.add(parseInt(b.period.slice(0, 4))))
    allRequests.forEach(r => years.add(parseInt(r.start_date.slice(0, 4))))
    adjustments.forEach(a => years.add(parseInt(a.created_at.slice(0, 4))))
    return Array.from(years).sort((a, b) => b - a)
  }, [balances, allRequests, adjustments, currentYear])

  function yearBalances(empId: number, year: number) {
    const emp = employees.find(e => e.id === empId)
    const hireDate = emp?.Date_of_joining  // 'YYYY-MM-DD'

    if (policy.basis === 'hire_date' && hireDate) {
      const hireMM = hireDate.slice(5, 7)
      // 입사일 기준 주기: (year-1)-MM < period <= year-MM
      const cycleStart = `${year - 1}-${hireMM}`
      const cycleEnd   = `${year}-${hireMM}`
      return balances.filter(b => {
        if (b.employee_id !== empId) return false
        if (b.period_type === 'annual') return parseInt(b.period.slice(0, 4)) === year
        return b.period > cycleStart && b.period <= cycleEnd
      })
    }

    return balances.filter(b => b.employee_id === empId && parseInt(b.period.slice(0, 4)) === year)
  }

  function empYearSummary(empId: number, year: number, weeklyHours: number | null) {
    const dh    = dailyHours(weeklyHours)
    const bals  = yearBalances(empId, year)
    const reqs  = allRequests.filter(r => r.employee_id === empId && parseInt(r.start_date.slice(0, 4)) === year && r.status === 'approved')
    const adjs  = adjustments.filter(a => a.employee_id === empId && parseInt(a.created_at.slice(0, 4)) === year)
    const total = bals.reduce((s, b) => s + b.total_hours, 0)
    const used  = reqs.reduce((s, r) => s + r.hours_requested, 0)
    const adj   = adjs.reduce((s, a) => s + a.hours, 0)
    const rem   = total + adj - used
    const toDays = (h: number) => dh > 0 ? +(h / dh).toFixed(2) : 0
    return { total, used, adj, rem, toDays }
  }

  // 발생·사용·조정 이벤트 목록 생성
  function buildDetailEvents(emp: Employee, year: number): DetailEvent[] {
    const events: DetailEvent[] = []

    // 발생 (leave_balances)
    yearBalances(emp.id, year).forEach(b => {
      const isMonthly = b.period_type === 'monthly'
      let sortDate: string
      if (isMonthly) {
        if (emp.Date_of_joining) {
          const hireDay     = parseInt(emp.Date_of_joining.slice(8, 10))
          const [py, pm]    = b.period.split('-').map(Number)
          const lastDay     = new Date(py, pm, 0).getDate()
          const day         = String(Math.min(hireDay, lastDay)).padStart(2, '0')
          sortDate          = `${b.period}-${day}`
        } else {
          sortDate = `${b.period}-01`
        }
      } else {
        sortDate = policy.basis === 'hire_date' && emp.Date_of_joining
          ? `${year}-${emp.Date_of_joining.slice(5, 10)}`
          : `${year}-01-01`
      }
      events.push({
        sortDate,
        dateLabel: sortDate,
        kind:  'accrual',
        label: isMonthly ? `월차 적립 (${b.period})` : `연간 연차 발생 (${year}년)`,
        hours: b.total_hours,
      })
    })

    // 사용 (approved leave_requests)
    allRequests
      .filter(r => r.employee_id === emp.id && parseInt(r.start_date.slice(0, 4)) === year && r.status === 'approved')
      .forEach(r => {
        const typeLabel = LEAVE_TYPE_LABELS[r.leave_type] ?? r.leave_type
        const dateRange = r.start_date !== r.end_date ? ` (${r.start_date}~${r.end_date})` : ''
        events.push({
          sortDate:  r.start_date,
          dateLabel: r.start_date,
          kind:      'usage',
          label:     `${typeLabel}${dateRange}`,
          hours:     -r.hours_requested,
        })
      })

    // 조정 (leave_adjustments)
    adjustments
      .filter(a => a.employee_id === emp.id && parseInt(a.created_at.slice(0, 4)) === year)
      .forEach(a => {
        events.push({
          sortDate:  a.created_at.slice(0, 10),
          dateLabel: a.created_at.slice(0, 10),
          kind:      'adjustment',
          label:     a.reason,
          hours:     a.hours,
        })
      })

    return events.sort((a, b) => b.sortDate.localeCompare(a.sortDate))  // 최신순
  }

  // Excel 다운로드 (mode: 'summary' | 'detail' | 'both')
  function handleExcelExport(mode: 'summary' | 'detail' | 'both' = 'both') {
    const wb = XLSX.utils.book_new()
    const targets = ovEmpId === 'all' ? employees : employees.filter(e => e.id === ovEmpId)

    // 시트 1: 요약
    const summaryHeader = ['직원명', '부서', '직위', '입사일', '발생(h)', '발생(일)', '사용(h)', '사용(일)', '조정(h)', '조정(일)', '잔여(h)', '잔여(일)']
    const summaryRows = targets.map(emp => {
      const s = empYearSummary(emp.id, ovYear, emp.weekly_work_hours)
      return [
        emp.name, emp.department ?? '', emp.position ?? '', emp.Date_of_joining ?? '',
        +s.total.toFixed(1), s.toDays(s.total),
        +s.used.toFixed(1),  s.toDays(s.used),
        +s.adj.toFixed(1),   s.toDays(s.adj),
        +s.rem.toFixed(1),   s.toDays(s.rem),
      ]
    })
    if (mode === 'summary' || mode === 'both') {
      const ws1 = XLSX.utils.aoa_to_sheet([summaryHeader, ...summaryRows])
      ws1['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, ...Array(8).fill({ wch: 9 })]
      XLSX.utils.book_append_sheet(wb, ws1, `${ovYear}년 요약`)
    }

    if (mode === 'detail' || mode === 'both') {
      // 상세 이벤트 (최신순)
      const detailHeader = ['직원명', '날짜', '구분', '내용', '변동(h)', '변동(일)']
      const detailRows: (string | number)[][] = []
      targets.forEach(emp => {
        const dh     = dailyHours(emp.weekly_work_hours)
        const events = buildDetailEvents(emp, ovYear)  // 최신순
        events.forEach(ev => {
          const kindLabel = ev.kind === 'accrual' ? '발생' : ev.kind === 'usage' ? '사용' : '조정'
          detailRows.push([
            emp.name, ev.dateLabel, kindLabel, ev.label,
            +ev.hours.toFixed(1),
            dh > 0 ? +(ev.hours / dh).toFixed(2) : 0,
          ])
        })
      })
      const ws2 = XLSX.utils.aoa_to_sheet([detailHeader, ...detailRows])
      ws2['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 6 }, { wch: 32 }, { wch: 8 }, { wch: 8 }]
      XLSX.utils.book_append_sheet(wb, ws2, `${ovYear}년 상세`)
    }

    const empName  = ovEmpId !== 'all' ? (employees.find(e => e.id === ovEmpId)?.name ?? '') : '전체'
    const modeSuffix = mode === 'summary' ? '_요약' : mode === 'detail' ? '_상세' : ''
    XLSX.writeFile(wb, `연차현황_${empName}_${ovYear}년${modeSuffix}.xlsx`)
  }

  const basisLabel = policy.basis === 'hire_date' ? '입사일' : '회계연도'
  const fmtDate    = (d: string) => new Date(d).toLocaleDateString('ko-KR')
  const today      = new Date().toISOString().slice(0, 10)
  // 수동 조정 탭: 만료되지 않은 잔액만 선택 가능
  const activeBals = balances.filter(b => b.expires_at >= today)

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
              tab === t ? 'bg-[#003366] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}
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
                const empInfo  = (r.employees as unknown as { name: string; department: string | null; position: string | null }[])?.[0]
                const isProc   = processing === r.id
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
        <div className="space-y-4">

          {/* 필터 바 */}
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="input text-sm w-28"
                value={ovYear}
                onChange={e => setOvYear(Number(e.target.value))}
              >
                {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
              <select
                className="input text-sm w-36"
                value={ovEmpId === 'all' ? 'all' : String(ovEmpId)}
                onChange={e => setOvEmpId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">전체 직원</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <select
                id="excel-mode"
                className="input text-xs h-8 rounded-r-none border-r-0 pr-1"
                defaultValue="both"
                onChange={() => {}}
              >
                <option value="both">요약+상세</option>
                <option value="summary">요약만</option>
                <option value="detail">상세만</option>
              </select>
              <button
                onClick={() => {
                  const sel = (document.getElementById('excel-mode') as HTMLSelectElement).value as 'summary' | 'detail' | 'both'
                  handleExcelExport(sel)
                }}
                className="flex items-center gap-1 text-xs px-3 h-8 rounded-l-none rounded-r-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Download size={13} />다운로드
              </button>
            </div>
          </div>

          {/* 요약 테이블 */}
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
                    {(ovEmpId === 'all' ? employees : employees.filter(e => e.id === ovEmpId)).map(emp => {
                      const s = empYearSummary(emp.id, ovYear, emp.weekly_work_hours)
                      const isSelected = ovEmpId === emp.id
                      return (
                        <tr
                          key={emp.id}
                          onClick={() => setOvEmpId(prev => prev === emp.id ? 'all' : emp.id)}
                          className={cn(
                            'cursor-pointer transition-colors',
                            isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50',
                          )}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{emp.name}</p>
                            <p className="text-xs text-slate-400">{[emp.department, emp.position].filter(Boolean).join(' · ')}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                            {emp.Date_of_joining ? new Date(emp.Date_of_joining).toLocaleDateString('ko-KR') : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">{s.total.toFixed(1)}</td>
                          <td className={cn('px-4 py-3 text-right', s.adj < 0 ? 'text-red-600' : s.adj > 0 ? 'text-green-600' : 'text-slate-400')}>
                            {s.adj >= 0 ? '+' : ''}{s.adj.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">{s.used.toFixed(1)}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            <span className={cn(s.rem < 0 ? 'text-red-600' : 'text-slate-800')}>
                              {s.toDays(s.rem)}일
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

          {/* 상세 이벤트 (직원 선택 시) */}
          {typeof ovEmpId === 'number' && (() => {
            const emp = employees.find(e => e.id === ovEmpId)
            if (!emp) return null
            const events = buildDetailEvents(emp, ovYear)
            const dh     = dailyHours(emp.weekly_work_hours)

            if (events.length === 0) return (
              <div className="card p-8 text-center text-slate-400 text-sm">
                {ovYear}년 해당 내역이 없습니다
              </div>
            )

            // 누계: 시간순으로 누적 계산 후, 역순 인덱스로 매핑
            const chronoCumulatives: number[] = []
            let acc = 0
            ;[...events].reverse().forEach(ev => { acc += ev.hours; chronoCumulatives.push(acc) })
            // events[i](최신순) → chronoCumulatives[events.length - 1 - i]

            return (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">
                    {emp.name} · {ovYear}년 상세 내역
                  </p>
                  <button
                    onClick={() => setOvEmpId('all')}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    닫기
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={{ minWidth: 520 }}>
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        {['날짜', '구분', '내용', '변동(h)', '변동(일)', '누계(일)'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {events.map((ev, i) => {
                        const cumulative = chronoCumulatives[events.length - 1 - i]
                        const kindCls =
                          ev.kind === 'accrual'    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          ev.kind === 'usage'      ? 'bg-red-50 text-red-600 border border-red-200' :
                                                     'bg-amber-50 text-amber-700 border border-amber-200'
                        const kindLabel =
                          ev.kind === 'accrual' ? '발생' : ev.kind === 'usage' ? '사용' : '조정'
                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap font-mono">{ev.dateLabel}</td>
                            <td className="px-4 py-2.5">
                              <span className={cn('px-1.5 py-0.5 rounded text-[11px] font-medium', kindCls)}>
                                {kindLabel}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-700">{ev.label}</td>
                            <td className={cn('px-4 py-2.5 text-right font-mono', ev.hours >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                              {ev.hours >= 0 ? '+' : ''}{ev.hours.toFixed(1)}h
                            </td>
                            <td className={cn('px-4 py-2.5 text-right font-mono', ev.hours >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                              {ev.hours >= 0 ? '+' : ''}{dh > 0 ? +(ev.hours / dh).toFixed(2) : 0}일
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700 font-medium">
                              {dh > 0 ? +(cumulative / dh).toFixed(2) : 0}일
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* ─ 수동 조정 탭 ─ */}
      {tab === 'adjust' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">결근 등으로 인한 연차 차감 또는 추가 부여 시 사용합니다. 직원도 이력을 확인할 수 있습니다.</p>
          {employees.map(emp => {
            const empActiveBals = activeBals.filter(b => b.employee_id === emp.id)
            const s       = empBalanceSummary(emp.id, activeBals, emp.weekly_work_hours)
            const isOpen  = adjOpen === emp.id
            const isProc  = processing === emp.id
            const empAdjs = adjustments.filter(a => a.employee_id === emp.id)

            return (
              <div key={emp.id} className="card overflow-hidden">
                <button
                  onClick={() => { setAdjOpen(isOpen ? null : emp.id); setAdjHours(''); setAdjReason(''); setAdjBalId(empActiveBals[0]?.id ?? null) }}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-800 text-sm">{emp.name}</span>
                    <span className="text-xs text-slate-400">{[emp.department, emp.position].filter(Boolean).join(' · ')}</span>
                    <span className={cn('text-xs font-semibold', s.rem < 0 ? 'text-red-600' : 'text-slate-600')}>
                      잔여 {s.remDays}일({+s.rem.toFixed(2)}h)
                    </span>
                  </div>
                  <ChevronDown size={16} className={cn('text-slate-400 transition-transform', isOpen && 'rotate-180')} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
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

                      {empActiveBals.length > 1 && (
                        <select
                          value={adjBalId ?? ''}
                          onChange={e => setAdjBalId(Number(e.target.value))}
                          className="input text-xs"
                        >
                          {empActiveBals.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.period} ({b.period_type === 'monthly' ? '월차' : '연간'}) — 잔여 {((b.total_hours + b.adj_hours - b.used_hours) / dailyHours(emp.weekly_work_hours)).toFixed(2)}일({+(b.total_hours + b.adj_hours - b.used_hours).toFixed(2)}h)
                            </option>
                          ))}
                        </select>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="number" min="0.5" step="0.5" placeholder="시간 수"
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
