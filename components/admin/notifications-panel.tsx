'use client'

import { useState, useTransition } from 'react'
import { Bell, Users, CheckCheck } from 'lucide-react'
import Link from 'next/link'
import type { Notification } from '@/types'
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/supabase/queries/notifications'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}일 전`
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

const TYPE_META: Record<string, { label: string; color: string }> = {
  new_employee_registered: { label: '직원 등록', color: 'bg-emerald-100 text-emerald-600' },
}

interface Props {
  notifications: Notification[]
}

export default function AdminNotificationsPanel({ notifications: initial }: Props) {
  const [items, setItems] = useState(initial)
  const [, startTransition] = useTransition()

  const unreadCount = items.filter(n => !n.is_read).length

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead()
      setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    })
  }

  function handleMarkRead(id: number) {
    if (items.find(n => n.id === id)?.is_read) return
    startTransition(async () => {
      await markNotificationRead(id)
      setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    })
  }

  return (
    <section>
      <div className="section-header">
        <div className="flex items-center gap-2">
          <h2 className="section-title">알림</h2>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <CheckCheck size={13} />
            모두 읽음
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card p-8 text-center">
          <Bell size={22} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">새 알림이 없습니다</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-slate-50">
          {items.map(n => {
            const meta = TYPE_META[n.type] ?? { label: n.type, color: 'bg-slate-100 text-slate-500' }
            return (
              <div
                key={n.id}
                onClick={() => handleMarkRead(n.id)}
                className={`flex gap-3 px-5 py-4 transition-colors ${
                  !n.is_read
                    ? 'bg-blue-50/40 hover:bg-blue-50 cursor-pointer'
                    : 'hover:bg-slate-50/60 cursor-default'
                }`}
              >
                {/* 아이콘 */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${meta.color}`}>
                  <Users size={14} />
                </div>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-500'}`}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                  </div>

                  {n.message && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                  )}

                  {n.target_id && n.type === 'new_employee_registered' && (
                    <Link
                      href="/admin/employees"
                      onClick={e => e.stopPropagation()}
                      className="inline-block mt-1.5 text-xs text-blue-600 hover:underline"
                    >
                      직원 목록 확인 →
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
