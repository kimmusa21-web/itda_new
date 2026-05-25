'use client'

import { useState, useTransition } from 'react'
import { MapPin, Bell, Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { saveCompanyLocation, saveAttendanceSettings, saveCheckinTime } from '@/lib/actions/attendance-actions'
import type { AttendanceSettings } from '@/types/attendance'

interface Props {
  settings:       AttendanceSettings | null
  company:        { latitude: number | null; longitude: number | null; allowed_radius_m: number | null } | null
  companyAddress: string | null
  checkinTime:    string
}

export function AttendanceSettingsClient({ settings, company, companyAddress, checkinTime: initialCheckinTime }: Props) {
  const [lat,    setLat]    = useState(String(company?.latitude          ?? ''))
  const [lng,    setLng]    = useState(String(company?.longitude         ?? ''))
  const [radius, setRadius] = useState(String(company?.allowed_radius_m  ?? 100))
  const [notifyEntry,    setNotifyEntry]    = useState(settings?.notify_late_entry    ?? true)
  const [notifyModified, setNotifyModified] = useState(settings?.notify_late_modified ?? false)
  const [checkinTime,    setCheckinTime]    = useState(initialCheckinTime)
  const [locError,    setLocError]    = useState<string | null>(null)
  const [notifError,  setNotifError]  = useState<string | null>(null)
  const [checkinError, setCheckinError] = useState<string | null>(null)
  const [toast,    setToast]    = useState<string | null>(null)
  const [isGps,   setIsGps]   = useState(false)
  const [isGeocoding,    setIsGeocoding]    = useState(false)
  const [isPendingLoc,    startLoc]     = useTransition()
  const [isPendingNotif,  startNotif]   = useTransition()
  const [isPendingCheckin, startCheckin] = useTransition()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function geocodeAddress() {
    if (!companyAddress) return
    setIsGeocoding(true); setLocError(null)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(companyAddress)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'ko', 'User-Agent': 'itda-payroll-app' } },
      )
      const data = await res.json()
      if (!data[0]) { setLocError('주소로 좌표를 찾을 수 없습니다. 직접 입력해주세요.'); return }
      setLat(String(parseFloat(data[0].lat).toFixed(6)))
      setLng(String(parseFloat(data[0].lon).toFixed(6)))
    } catch {
      setLocError('좌표 조회에 실패했습니다. 직접 입력해주세요.')
    } finally {
      setIsGeocoding(false)
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) { setLocError('이 브라우저는 GPS를 지원하지 않습니다.'); return }
    setIsGps(true); setLocError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(String(pos.coords.latitude))
        setLng(String(pos.coords.longitude))
        setIsGps(false)
      },
      err => {
        setIsGps(false)
        setLocError(`위치를 가져올 수 없습니다. (${err.message})`)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function handleSaveLocation() {
    setLocError(null)
    const latN = parseFloat(lat)
    const lngN = parseFloat(lng)
    const radN = parseInt(radius)
    if (isNaN(latN) || isNaN(lngN)) { setLocError('위도·경도를 올바르게 입력해주세요.'); return }
    if (isNaN(radN) || radN < 10)   { setLocError('허용 반경은 10m 이상이어야 합니다.'); return }

    startLoc(async () => {
      const res = await saveCompanyLocation({ latitude: latN, longitude: lngN, allowed_radius_m: radN })
      if (!res.success) { setLocError(res.error ?? '저장 실패'); return }
      showToast('회사 위치가 저장되었습니다.')
    })
  }

  function handleSaveCheckin() {
    setCheckinError(null)
    if (!/^\d{2}:\d{2}$/.test(checkinTime)) { setCheckinError('HH:MM 형식으로 입력해주세요.'); return }
    startCheckin(async () => {
      const res = await saveCheckinTime(checkinTime)
      if (!res.success) { setCheckinError(res.error ?? '저장 실패'); return }
      showToast('출근 시간이 저장되었습니다.')
    })
  }

  function handleSaveNotif() {
    setNotifError(null)
    startNotif(async () => {
      const res = await saveAttendanceSettings({
        notify_late_entry:    notifyEntry,
        notify_late_modified: notifyModified,
      })
      if (!res.success) { setNotifError(res.error ?? '저장 실패'); return }
      showToast('알림 설정이 저장되었습니다.')
    })
  }

  return (
    <div className="max-w-lg space-y-6">

      {/* 회사 위치 */}
      <div className="card px-5 py-5 space-y-4">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-800">회사 위치 설정</h2>
        </div>
        <p className="text-xs text-slate-500">사무실 출근 시 허용 반경 체크에 사용됩니다.</p>

        {companyAddress && (
          <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin size={12} className="text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-600 truncate">{companyAddress}</span>
            </div>
            <button
              onClick={geocodeAddress}
              disabled={isGeocoding}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50 flex-shrink-0"
            >
              {isGeocoding ? <Loader2 size={11} className="animate-spin" /> : null}
              주소로 좌표 찾기
            </button>
          </div>
        )}

        <button
          onClick={useCurrentLocation}
          disabled={isGps}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
        >
          {isGps ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
          현재 내 위치로 설정
        </button>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">위도</label>
            <input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} placeholder="37.5665" className="input w-full text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">경도</label>
            <input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} placeholder="126.9780" className="input w-full text-sm" />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 font-medium mb-1 block">허용 반경 (m)</label>
          <input type="number" min="10" value={radius} onChange={e => setRadius(e.target.value)} className="input w-full text-sm" />
          <p className="text-xs text-slate-400 mt-1">기본값: 100m. 사무실 출근 시 이 반경 내에 있어야 합니다.</p>
        </div>

        {locError && (
          <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600">{locError}</p>
          </div>
        )}

        <button
          onClick={handleSaveLocation}
          disabled={isPendingLoc}
          className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPendingLoc ? <Loader2 size={14} className="animate-spin" /> : null}
          위치 저장
        </button>
      </div>

      {/* 출근 시간 설정 */}
      <div className="card px-5 py-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-800">출근 시간 설정</h2>
        </div>
        <p className="text-xs text-slate-500">설정한 출근 시간 5분 전에 직원에게 출근 등록 알림이 발송됩니다.</p>

        <div>
          <label className="text-xs text-slate-500 font-medium mb-1 block">출근 시간</label>
          <input
            type="time"
            value={checkinTime}
            onChange={e => setCheckinTime(e.target.value)}
            className="input w-40 text-sm"
          />
          <p className="text-xs text-slate-400 mt-1">기본값: 09:00</p>
        </div>

        {checkinError && (
          <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600">{checkinError}</p>
          </div>
        )}

        <button
          onClick={handleSaveCheckin}
          disabled={isPendingCheckin}
          className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPendingCheckin ? <Loader2 size={14} className="animate-spin" /> : null}
          출근 시간 저장
        </button>
      </div>

      {/* 알림 설정 */}
      <div className="card px-5 py-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-800">알림 설정</h2>
        </div>

        <Toggle
          label="누락 출퇴근 입력 시 알림"
          description="직원이 이전 날짜 출퇴근을 소급 입력하면 알림을 받습니다."
          checked={notifyEntry}
          onChange={setNotifyEntry}
        />
        <Toggle
          label="누락 출퇴근 수정 시 알림"
          description="직원이 소급 입력한 기록을 수정하면 알림을 받습니다."
          checked={notifyModified}
          onChange={setNotifyModified}
        />

        {notifError && (
          <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600">{notifError}</p>
          </div>
        )}

        <button
          onClick={handleSaveNotif}
          disabled={isPendingNotif}
          className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPendingNotif ? <Loader2 size={14} className="animate-spin" /> : null}
          알림 설정 저장
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-5 py-3 rounded-full shadow-lg flex items-center gap-2 z-50">
          <CheckCircle size={15} /> {toast}
        </div>
      )}
    </div>
  )
}

function Toggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm text-slate-700 font-medium">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}
