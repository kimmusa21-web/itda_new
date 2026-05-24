'use client'

import { useState, useEffect } from 'react'

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export function usePushNotification() {
  const [permission, setPermission] = useState<PermissionState>('default')
  const [loading,    setLoading]    = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission as PermissionState)
  }, [])

  async function subscribe() {
    if (!('serviceWorker' in navigator)) return false
    setLoading(true)
    try {
      // 서비스 워커 등록
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // 알림 권한 요청
      const perm = await Notification.requestPermission()
      setPermission(perm as PermissionState)
      if (perm !== 'granted') return false

      // 기존 구독 확인
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
          ),
        })
      }

      const json  = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          endpoint: json.endpoint,
          p256dh:   (json.keys as any)?.p256dh,
          auth:     (json.keys as any)?.auth,
        }),
      })

      return true
    } catch (e) {
      console.error('[push] 구독 실패:', e)
      return false
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return

      await fetch('/api/push/subscribe', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
      setPermission('default')
    } finally {
      setLoading(false)
    }
  }

  return { permission, loading, subscribe, unsubscribe }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding  = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}
