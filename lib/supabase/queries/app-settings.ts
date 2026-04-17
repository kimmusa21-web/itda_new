import { createClient } from '@/lib/supabase/server'
import { DEFAULT_PAYSLIP_NOTES } from '@/lib/payslip-defaults'

/** app_settings 에서 단일 값 조회. 없으면 null 반환 */
export async function getAppSetting(key: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single()
  return data?.value ?? null
}

/**
 * 시스템 기본 산출 근거를 DB에서 조회.
 * app_settings.default_payslip_note 가 비어있으면 코드 기본값 반환.
 */
export async function getDefaultPayslipNotes(): Promise<string[]> {
  const raw = await getAppSetting('default_payslip_note')
  if (!raw?.trim()) return DEFAULT_PAYSLIP_NOTES
  return raw.split('\n').map(s => s.trim()).filter(Boolean)
}
