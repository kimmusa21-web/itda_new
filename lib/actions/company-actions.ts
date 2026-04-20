'use server'
/* ================================================================
   itda — 회사(Company) CRUD 서버 액션
   어드민 전용: requireAdmin() 내부에서 권한 확인
================================================================ */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/* ── 권한 확인 헬퍼 ─────────────────────────────────────────── */
async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증이 필요합니다')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('어드민 권한이 필요합니다')

  return { supabase, userId: user.id }
}

/* ── 입력 타입 ───────────────────────────────────────────────── */
export interface CompanyInput {
  name: string
  biz_number?: string
  representative?: string
  contact_name?: string
  contact_email?: string
  'Business type'?: string
  Industry?: string
  Telephone?: string
  address?: string
  'tax invoice email'?: string
  status?: 'active' | 'inactive'
  payslip_note?: string | null
  payslip_note_overrides?: Record<string, string> | null
  payroll_day?: number | null
  payroll_start_day?: number | null
}

/* ── 결과 타입 ──────────────────────────────────────────────── */
type ActionResult<T = undefined> = T extends undefined
  ? { success: boolean; error?: string }
  : { success: boolean; data?: T; error?: string }

/* ── 입력 정규화 ─────────────────────────────────────────────── */
function normalizeInput(input: CompanyInput) {
  return {
    name:               input.name.trim(),
    biz_number:         input.biz_number?.trim() || null,
    representative:     input.representative?.trim() || null,
    contact_name:       input.contact_name?.trim() || null,
    contact_email:      input.contact_email?.trim() || null,
    'Business type':    input['Business type']?.trim() || null,
    Industry:           input.Industry?.trim() || null,
    Telephone:          input.Telephone?.trim() || null,
    address:            input.address?.trim() || null,
    'tax invoice email': input['tax invoice email']?.trim() || null,
    status:             input.status ?? 'active',
    payslip_note:            input.payslip_note?.trim() || null,
    payslip_note_overrides:  input.payslip_note_overrides ?? null,
    payroll_day:        input.payroll_day != null
                          ? Math.min(31, Math.max(1, Math.round(input.payroll_day)))
                          : null,
    payroll_start_day:  input.payroll_start_day != null
                          ? Math.min(31, Math.max(1, Math.round(input.payroll_start_day)))
                          : null,
  }
}

/* ═══════════════════════════════════════════════════════════════
   회사 생성
═══════════════════════════════════════════════════════════════ */
export async function createCompany(
  input: CompanyInput,
): Promise<ActionResult<{ id: number }>> {
  try {
    if (!input.name?.trim()) return { success: false, error: '회사명은 필수입니다' }

    const { supabase } = await requireAdmin()

    // 사업자번호 중복 체크
    if (input.biz_number?.trim()) {
      const { data: dup } = await supabase
        .from('companies')
        .select('id')
        .eq('biz_number', input.biz_number.trim())
        .is('deleted_at', null)
        .maybeSingle()
      if (dup) return { success: false, error: '이미 등록된 사업자번호입니다' }
    }

    const { data, error } = await supabase
      .from('companies')
      .insert(normalizeInput(input))
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/companies')
    return { success: true, data: { id: data.id } }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/* ═══════════════════════════════════════════════════════════════
   회사 수정
═══════════════════════════════════════════════════════════════ */
export async function updateCompany(
  id: number,
  input: CompanyInput,
): Promise<ActionResult> {
  try {
    if (!input.name?.trim()) return { success: false, error: '회사명은 필수입니다' }

    const { supabase } = await requireAdmin()

    // 사업자번호 중복 체크 (자기 자신 제외)
    if (input.biz_number?.trim()) {
      const { data: dup } = await supabase
        .from('companies')
        .select('id')
        .eq('biz_number', input.biz_number.trim())
        .neq('id', id)
        .is('deleted_at', null)
        .maybeSingle()
      if (dup) return { success: false, error: '이미 등록된 사업자번호입니다' }
    }

    const { error } = await supabase
      .from('companies')
      .update(normalizeInput(input))
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/companies')
    revalidatePath(`/admin/companies/${id}`)
    revalidatePath(`/admin/companies/${id}/edit`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/* ═══════════════════════════════════════════════════════════════
   회사 삭제 (Soft Delete)
   - 재직 직원 있으면 삭제 불가
   - deleted_at 설정 + status='inactive'
═══════════════════════════════════════════════════════════════ */
export async function deleteCompany(id: number): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()

    // 재직 직원 수 확인
    const { count } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', id)
      .eq('is_active', true)

    if (count && count > 0) {
      return {
        success: false,
        error: `재직 중인 직원 ${count}명이 있어 삭제할 수 없습니다. 퇴사 처리 후 삭제하세요.`,
      }
    }

    const { error } = await supabase
      .from('companies')
      .update({
        status: 'inactive',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/companies')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/* ═══════════════════════════════════════════════════════════════
   회사 단건 조회 (edit 페이지용)
═══════════════════════════════════════════════════════════════ */
export async function getCompanyForEdit(id: number) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

/* ═══════════════════════════════════════════════════════════════
   어드민 전용: 특정 회사의 급여명세서 산출 근거 수정 (company ID 직접 지정)
═══════════════════════════════════════════════════════════════ */
export async function updateCompanyPayslipNoteById(
  companyId: number,
  payslipNote: string | null,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()

    const { error } = await supabase
      .from('companies')
      .update({ payslip_note: payslipNote?.trim() || null })
      .eq('id', companyId)

    if (error) return { success: false, error: error.message }

    revalidatePath(`/admin/companies/${companyId}`)
    revalidatePath(`/admin/companies/${companyId}/edit`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/* ═══════════════════════════════════════════════════════════════
   매니저 전용: 자기 회사의 급여명세서 산출 근거 수정
   매니저는 자신이 속한 company_id의 payslip_note만 수정 가능
═══════════════════════════════════════════════════════════════ */
export async function updateCompanyPayslipNote(
  payslipNote: string | null,
): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '인증이 필요합니다' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'manager' && profile.role !== 'admin')) {
      return { success: false, error: '매니저 권한이 필요합니다' }
    }
    if (!profile.company_id) {
      return { success: false, error: '소속 회사 정보가 없습니다' }
    }

    const { error } = await supabase
      .from('companies')
      .update({ payslip_note: payslipNote?.trim() || null })
      .eq('id', profile.company_id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/manager/more')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/* ═══════════════════════════════════════════════════════════════
   산출근거 항목별 override 저장 (admin / manager 공용)
   companyId가 있으면 admin 모드, 없으면 매니저 본인 회사 기준
═══════════════════════════════════════════════════════════════ */
export async function updatePayslipNoteOverrides(
  overrides: Record<string, string> | null,
  companyId?: number,
): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '인증이 필요합니다' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'manager'].includes(profile.role)) {
      return { success: false, error: '권한이 없습니다' }
    }

    // admin: companyId 직접 지정 가능 / manager: 본인 회사만
    const targetId = profile.role === 'admin' && companyId != null
      ? companyId
      : profile.company_id

    if (!targetId) return { success: false, error: '회사 정보가 없습니다' }

    // 빈 override 제거 (빈 문자열 항목은 null로 처리)
    const cleaned: Record<string, string> | null = overrides
      ? Object.fromEntries(
          Object.entries(overrides).filter(([, v]) => v?.trim())
        )
      : null
    const toSave = cleaned && Object.keys(cleaned).length > 0 ? cleaned : null

    const { error } = await supabase
      .from('companies')
      .update({ payslip_note_overrides: toSave })
      .eq('id', targetId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/manager/more')
    revalidatePath(`/admin/companies/${targetId}`)
    revalidatePath(`/admin/companies/${targetId}/edit`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
