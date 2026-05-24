'use server'
/* ================================================================
   ModuHR — 알림 관련 서버 함수
   notifications 테이블 CRUD
================================================================ */

import { createClient } from '@/lib/supabase/server'
import type { Notification } from '@/types'

/* ── 알림 생성 (단건) ────────────────────────────────────────── */
export async function createNotification(params: {
  userId: string
  type: string
  title: string
  message?: string
  targetId?: string
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('notifications').insert({
    user_id:   params.userId,
    type:      params.type,
    title:     params.title,
    message:   params.message ?? null,
    target_id: params.targetId ? String(params.targetId) : null,
    is_read:   false,
  })
  if (error) console.error('[createNotification]', error.message)
}

/* ── 알림 일괄 생성 (여러 유저에게) ─────────────────────────── */
export async function createNotificationsForUsers(params: {
  userIds: string[]
  type: string
  title: string
  message?: string
  targetId?: string
}): Promise<void> {
  if (params.userIds.length === 0) return
  const supabase = createClient()
  const rows = params.userIds.map(uid => ({
    user_id:   uid,
    type:      params.type,
    title:     params.title,
    message:   params.message ?? null,
    target_id: params.targetId ? String(params.targetId) : null,
    is_read:   false,
  }))
  const { error } = await supabase.from('notifications').insert(rows)
  if (error) console.error('[createNotificationsForUsers]', error.message)
}

/* ── 어드민 전체에게 알림 ──────────────────────────────────── */
export async function notifyAllAdmins(params: {
  type: string
  title: string
  message?: string
  targetId?: string
}): Promise<void> {
  const supabase = createClient()
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  if (!admins || admins.length === 0) return
  await createNotificationsForUsers({
    userIds: admins.map(a => a.id),
    ...params,
  })
}

/* ── 내 알림 목록 ────────────────────────────────────────────── */
export async function getMyNotifications(limit = 20): Promise<Notification[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []) as Notification[]
}

/* ── 읽음 처리 ──────────────────────────────────────────────── */
export async function markNotificationRead(id: number): Promise<void> {
  const supabase = createClient()
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
}

/* ── 전체 읽음 처리 ──────────────────────────────────────────── */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
}

/* ── 읽지 않은 알림 수 ──────────────────────────────────────── */
export async function getUnreadCount(): Promise<number> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return count ?? 0
}
