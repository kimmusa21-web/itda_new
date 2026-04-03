'use server'
/* ================================================================
   itda — employee_requests Server Actions
   모든 함수는 'use server'로 Server Action으로 동작
================================================================ */

import { createClient } from '@/lib/supabase/server'
import {
  mapRowToRequest,
  type EmployeeRequest,
  type EmployeeRequestRow,
  type EmployeeRequestStatus,
} from '@/types/employee-request'

/* ── 현재 어드민 프로필 ──────────────────────────────── */
export async function getCurrentUserProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, email, name, role, company_id')
    .eq('id', user.id)
    .single()

  return data ?? null
}

/* ── 목록 조회 ───────────────────────────────────────── */
export async function getEmployeeRequests(options?: {
  status?: EmployeeRequestStatus | 'all'
  search?: string
}): Promise<EmployeeRequest[]> {
  const supabase = createClient()

  let query = supabase
    .from('employee_requests')
    .select(`
      *,
      companies ( name ),
      requester:requested_by ( name, email )
    `)
    .order('created_at', { ascending: false })

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }

  if (options?.search?.trim()) {
    const q = options.search.trim()
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const { data, error } = await query
  if (error) {
    console.error('[getEmployeeRequests]', error.message)
    return []
  }

  return (data as EmployeeRequestRow[]).map(mapRowToRequest)
}

/* ── 승인 처리 ───────────────────────────────────────────
   저장 내용:
     status       → 'approved'
     reviewed_by  → 현재 어드민 user.id
     reviewed_at  → 현재 시각
     reject_reason → null (초기화)
──────────────────────────────────────────────────────── */
export async function approveEmployeeRequest(
  id: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  // 어드민 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다' }

  const { error } = await supabase
    .from('employee_requests')
    .update({
      status:        'approved',
      reviewed_by:   user.id,
      reviewed_at:   new Date().toISOString(),
      reject_reason: null,
    })
    .eq('id', id)
    .eq('status', 'pending')   // pending 상태만 처리

  if (error) {
    console.error('[approveEmployeeRequest]', error.message)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/* ── 거절 처리 ───────────────────────────────────────────
   저장 내용:
     status        → 'rejected'
     reject_reason → 입력한 사유
     reviewed_by   → 현재 어드민 user.id
     reviewed_at   → 현재 시각
──────────────────────────────────────────────────────── */
export async function rejectEmployeeRequest(
  id: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!reason.trim()) {
    return { success: false, error: '거절 사유를 입력해주세요' }
  }

  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다' }

  const { error } = await supabase
    .from('employee_requests')
    .update({
      status:        'rejected',
      reject_reason: reason.trim(),
      reviewed_by:   user.id,
      reviewed_at:   new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')

  if (error) {
    console.error('[rejectEmployeeRequest]', error.message)
    return { success: false, error: error.message }
  }

  return { success: true }
}
