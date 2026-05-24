'use client'

import { Bell, BellOff, Loader2 } from 'lucide-react'
import { usePushNotification }    from '@/hooks/use-push-notification'

export function PushNotificationButton() {
  const { permission, loading, subscribe, unsubscribe } = usePushNotification()

  if (permission === 'unsupported') return null

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100 rounded-xl px-3 py-2">
        <BellOff size={13} />
        <span>브라우저 설정에서 알림을 허용해주세요</span>
      </div>
    )
  }

  if (permission === 'granted') {
    return (
      <button
        onClick={unsubscribe}
        disabled={loading}
        className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl px-3 py-2 transition-colors"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <BellOff size={13} />}
        근태 알림 해제
      </button>
    )
  }

  return (
    <button
      onClick={subscribe}
      disabled={loading}
      className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl px-3 py-2 transition-colors font-medium"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
      출퇴근 알림 받기
    </button>
  )
}
