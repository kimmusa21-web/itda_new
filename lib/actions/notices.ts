'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Notice {
  id: number
  title: string
  content: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export async function getNotices(): Promise<Notice[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('notices')
    .select('id, title, content, is_pinned, created_at, updated_at')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20)
  return (data ?? []) as Notice[]
}

export async function createNotice(params: {
  title: string
  content: string
  isPinned?: boolean
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다' }

  const { error } = await supabase
    .from('notices')
    .insert({
      title:      params.title.trim(),
      content:    params.content.trim(),
      is_pinned:  params.isPinned ?? false,
      created_by: user.id,
    })

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin', 'layout')
  return { success: true }
}

export async function deleteNotice(id: number): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('notices')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin', 'layout')
  return { success: true }
}

export async function togglePinNotice(id: number, isPinned: boolean): Promise<{ success: boolean }> {
  const supabase = createClient()
  await supabase
    .from('notices')
    .update({ is_pinned: isPinned })
    .eq('id', id)
  revalidatePath('/admin', 'layout')
  return { success: true }
}
