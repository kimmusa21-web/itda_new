'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증이 필요합니다')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('어드민 권한이 필요합니다')
  return { supabase }
}

/** 어드민: 기본 산출 근거 저장 */
export async function updateDefaultPayslipNote(
  note: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key: 'default_payslip_note', value: note?.trim() || null, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      )
    if (error) return { success: false, error: error.message }
    revalidatePath('/admin/settings')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
