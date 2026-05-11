'use client'

import { useState, useTransition } from 'react'
import { MapPin, Clock, CheckCircle, LogOut, LogIn, AlertCircle, Loader2, ChevronDown, ChevronUp, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { checkIn, checkOut, updateAttendance, getAttendanceByDate } from '@/lib/actions/attendance-actions'
import { kstFirstOfMonth } from '@/lib/utils/kst'
import { WORK_TYPE_LABELS, STATUS_LABELS } from '@/types/attendance'
import type { AttendanceLog, WorkType } from '@/types/attendance'

interface Props {
  today:           string
  todayLog:        AttendanceLog | null
  company:         { latitude: number | null; longitude: number | null; allowed_radius_m: number | null } | null
  isImpersonating: boolean
  employeeName:    string
}

type GpsError = string | null

function gpsErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case 1: return '위치 권한이 거부되었습니다. 브라우저 설정에서 위치를 허용해주세요.'
    case 2: return '위치를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.'
    case 3: return '위치 수집 시간이 초과되었습니다. 다시 시도해주세요.'
    default: return '위치를 가져올 수 없습니다.'
  }
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('이 브라우저는 GPS를 지원하지 않습니다.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout:            10000,
      maximumAge:         0,
    })
  })
}

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}
function fmtDateKo(date: string) {
  return new Date(date + 'T00:00:00+09:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

export function AttendanceClient({ today, todayLog: initialLog, company, isImpersonating, employeeName }: Props) {
  const [log,        setLog]        = useState<AttendanceLog | null>(initialLog)
  const [workType,   setWorkType]   = useState<WorkType>('office')
  const [workNote,   setWorkNote]   = useState('')
  const [lateNote,   setLateNote]   = useState('')
  const [workDate,   setWorkDate]   = useState(today)
  const [error,      setError]      = useState<string | null>(null)
  const [gpsErr,     setGpsErr]     = useState<GpsError>(null)
  const [isGps,      setIsGps]      = useState(false)
  const [editOpen,   setEditOpen]   = useState(false)
  const [editInAt,   setEditInAt]   = useState('')
  const [editOutAt,  setEditOutAt]  = useState('')
  const [editType,   setEditType]   = useState<WorkType>('office')
  const [editNote,   setEditNote]   = useState('')
  const [toast,      setToast]      = useState<string | null>(null)
  const [isPending,  startTransition] = useTransition()

  const isLateEntry = workDate < today
  const firstOfMonth = kstFirstOfMonth()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function reloadLog() {
    const fresh = await getAttendanceByDate(workDate)
    setLog(fresh)
  }

  async function handleCheckIn() {
    setError(null); setGpsErr(null); setIsGps(true)
    let pos: GeolocationPosition
    try {
      pos = await getCurrentPosition()
    } catch (e) {
      setIsGps(false)
      if (e instanceof GeolocationPositionError) setGpsErr(gpsErrorMessage(e))
      else setGpsErr((e as Error).message)
      return
    }
    setIsGps(false)

    startTransition(async () => {
      const res = await checkIn({
        work_date:       workDate,
        work_type:       workType,
        work_note:       workNote || undefined,
        latitude:        pos.coords.latitude,
        longitude:       pos.coords.longitude,
        accuracy_m:      pos.coords.accuracy,
        late_entry_note: lateNote || undefined,
      })
      if (!res.success) { setError(res.error ?? '오류가 발생했습니다.'); return }
      showToast('출근이 기록되었습니다.')
      setWorkNote(''); setLateNote('')
      await reloadLog()
    })
  }

  async function handleCheckOut() {
    setError(null); setGpsErr(null); setIsGps(true)
    let pos: GeolocationPosition
    try {
      pos = await getCurrentPosition()
    } catch (e) {
      setIsGps(false)
      if (e instanceof GeolocationPositionError) setGpsErr(gpsErrorMessage(e))
      else setGpsErr((e as Error).message)
      return
    }
    setIsGps(false)

    startTransition(async () => {
      const res = await checkOut({
        work_date:  workDate,
        latitude:   pos.coords.latitude,
        longitude:  pos.coords.longitude,
        accuracy_m: pos.coords.accuracy,
      })
      if (!res.success) { setError(res.error ?? '오류가 발생했습니다.'); return }
      showToast('퇴근이 기록되었습니다.')
      await reloadLog()
    })
  }

  function openEdit() {
    if (!log) return
    setEditInAt(log.check_in_at   ? log.check_in_at.slice(0, 16)  : '')
    setEditOutAt(log.check_out_at ? log.check_out_at.slice(0, 16) : '')
    setEditType(log.work_type)
    setEditNote(log.work_note ?? '')
    setEditOpen(true)
  }

  function handleEditSave() {
    if (!log) return
    setError(null)
    startTransition(async () => {
      const res = await updateAttendance({
        log_id:       log.id,
        work_type:    editType,
        work_note:    editNote || undefined,
        check_in_at:  editInAt  ? new Date(editInAt).toISOString()  : undefined,
        check_out_at: editOutAt ? new Date(editOutAt).toISOString() : undefined,
      })
      if (!res.success) { setError(res.error ?? '오류가 발생했습니다.'); return }
      showToast('수정되었습니다.')
      setEditOpen(false)
      await reloadLog()
    })
  }

  const statusColor = {
    not_started: 'bg-slate-100 text-slate-500',
    checked_in:  'bg-emerald-100 text-emerald-700',
    checked_out: 'bg-blue-100 text-blue-700',
  }

  const currentStatus = log?.status ?? 'not_started'
  const canEdit = !!log && log.id > 0

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-24">

      {/* 날짜 / 이름 */}
      <div className="card px-5 py-4">
        <p className="text-xs text-slate-400">{fmtDateKo(today)}</p>
        <p className="text-lg font-bold text-slate-800 mt-0.5">{employeeName}</p>
        {isImpersonating && (
          <span className="inline-block mt-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            관리자 대리 입력 중
          </span>
        )}
      </div>

      {/* 상태 */}
      <div className="card px-5 py-4 flex items-center justify-between">
        <span className="text-sm text-slate-500">오늘 상태</span>
        <span className={cn('text-sm font-semibold px-3 py-1 rounded-full', statusColor[currentStatus])}>
          {STATUS_LABELS[currentStatus]}
        </span>
      </div>

      {/* 출근 전 UI */}
      {currentStatus === 'not_started' && (
        <div className="card px-5 py-5 space-y-4">

          {/* 소급 입력 날짜 선택 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">출근 날짜</label>
            <input
              type="date"
              value={workDate}
              min={firstOfMonth}
              max={today}
              onChange={e => { setWorkDate(e.target.value); setLog(null) }}
              className="input w-full text-sm"
            />
            {isLateEntry && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                소급 입력입니다. 담당자에게 알림이 전송됩니다.
              </p>
            )}
          </div>

          {/* 출근 유형 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-2 block">출근 유형</label>
            <div className="grid grid-cols-3 gap-2">
              {(['office', 'field', 'remote'] as WorkType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setWorkType(t)}
                  className={cn(
                    'py-3 rounded-xl text-sm font-medium border-2 transition-colors',
                    workType === t
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                  )}
                >
                  {WORK_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* 사유 입력 */}
          {(workType === 'field' || workType === 'remote') && (
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">
                {workType === 'field' ? '방문지 / 사유 *' : '재택 사유 (선택)'}
              </label>
              <textarea
                rows={2}
                value={workNote}
                onChange={e => setWorkNote(e.target.value)}
                placeholder={workType === 'field' ? '예) ○○고객사 방문' : '예) 재택근무'}
                className="input w-full text-sm resize-none"
              />
            </div>
          )}

          {/* 소급 사유 */}
          {isLateEntry && (
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">누락 사유</label>
              <input
                type="text"
                value={lateNote}
                onChange={e => setLateNote(e.target.value)}
                placeholder="예) 출퇴근 기록 누락"
                className="input w-full text-sm"
              />
            </div>
          )}

          {/* GPS 안내 */}
          <div className="flex items-start gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
            <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500">
              출근 시 현재 위치를 확인합니다. 사무실 출근의 경우 회사 반경 내에 있어야 합니다.
            </p>
          </div>

          {/* 에러 */}
          {(error || gpsErr) && (
            <div className="flex items-start gap-2 bg-red-50 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600">{error ?? gpsErr}</p>
            </div>
          )}

          <button
            onClick={handleCheckIn}
            disabled={isPending || isGps}
            className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {(isPending || isGps) ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
            {isGps ? '위치 확인 중...' : isPending ? '처리 중...' : '출근하기'}
          </button>
        </div>
      )}

      {/* 출근 완료 UI */}
      {currentStatus === 'checked_in' && log && (
        <div className="card px-5 py-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
            <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">출근 완료</p>
              <p className="text-xs text-emerald-600">{fmtTime(log.check_in_at)} · {WORK_TYPE_LABELS[log.work_type]}</p>
              {log.work_note && <p className="text-xs text-emerald-600 mt-0.5">{log.work_note}</p>}
              {log.check_in_distance_m != null && (
                <p className="text-xs text-emerald-500">회사로부터 {log.check_in_distance_m}m</p>
              )}
              {log.is_impersonated && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full mt-1 inline-block">관리자 입력</span>
              )}
            </div>
          </div>

          {(error || gpsErr) && (
            <div className="flex items-start gap-2 bg-red-50 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600">{error ?? gpsErr}</p>
            </div>
          )}

          <button
            onClick={handleCheckOut}
            disabled={isPending || isGps}
            className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {(isPending || isGps) ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
            {isGps ? '위치 확인 중...' : isPending ? '처리 중...' : '퇴근하기'}
          </button>

          {canEdit && (
            <button onClick={openEdit} className="w-full py-2 rounded-xl border border-slate-200 text-slate-500 text-sm flex items-center justify-center gap-1 hover:bg-slate-50">
              <Edit2 size={13} /> 출근 정보 수정
            </button>
          )}
        </div>
      )}

      {/* 퇴근 완료 UI */}
      {currentStatus === 'checked_out' && log && (
        <div className="card px-5 py-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">오늘 기록</p>
            {canEdit && (
              <button onClick={openEdit} className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
                <Edit2 size={12} /> 수정
              </button>
            )}
          </div>
          <div className="space-y-2">
            <Row label="출근유형" value={WORK_TYPE_LABELS[log.work_type]} />
            <Row label="출근시간" value={fmtTime(log.check_in_at)} />
            <Row label="퇴근시간" value={fmtTime(log.check_out_at)} />
            {log.work_note && <Row label="사유" value={log.work_note} />}
            {log.check_in_distance_m  != null && <Row label="출근거리" value={`${log.check_in_distance_m}m`} />}
            {log.check_out_distance_m != null && <Row label="퇴근거리" value={`${log.check_out_distance_m}m`} />}
            {log.is_impersonated && <Row label="입력자" value="관리자" badge />}
          </div>
        </div>
      )}

      {/* 수정 폼 */}
      {editOpen && log && (
        <div className="card px-5 py-5 space-y-4 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-700 flex items-center gap-1">
              <Edit2 size={14} /> 출퇴근 수정
            </p>
            <button onClick={() => setEditOpen(false)} className="text-slate-400 text-xs hover:text-slate-600">닫기</button>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-medium mb-2 block">출근 유형</label>
            <div className="grid grid-cols-3 gap-2">
              {(['office', 'field', 'remote'] as WorkType[]).map(t => (
                <button key={t} onClick={() => setEditType(t)}
                  className={cn('py-2 rounded-lg text-xs font-medium border-2 transition-colors',
                    editType === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600')}
                >
                  {WORK_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">출근 시간</label>
              <input type="datetime-local" value={editInAt} onChange={e => setEditInAt(e.target.value)} className="input w-full text-xs" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">퇴근 시간</label>
              <input type="datetime-local" value={editOutAt} onChange={e => setEditOutAt(e.target.value)} className="input w-full text-xs" />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">사유 / 메모</label>
            <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="선택 입력" className="input w-full text-sm" />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle size={13} className="text-red-500" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <button onClick={handleEditSave} disabled={isPending}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            수정 저장
          </button>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-5 py-3 rounded-full shadow-lg flex items-center gap-2 z-50">
          <CheckCircle size={15} /> {toast}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      {badge
        ? <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">{value}</span>
        : <span className="text-slate-700 font-medium">{value}</span>
      }
    </div>
  )
}
