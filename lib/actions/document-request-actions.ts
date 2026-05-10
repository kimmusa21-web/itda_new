'use server'
/* ================================================================
   서류신청 서버 액션
   - createDocumentRequest  : 직원이 신청
   - approveDocumentRequest : 매니저가 승인 → 이메일 발송
   - rejectDocumentRequest  : 매니저가 반려
================================================================ */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  sendEmploymentCertificateEmail,
  sendTaxDocumentRequestEmail,
} from '@/lib/email'

export type DocumentType =
  | 'employment_certificate'
  | 'career_certificate'
  | 'withholding_tax'
  | 'earned_income_withholding_ledger'
  | 'withholding_tax_confirmation'

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  employment_certificate:           '재직증명서',
  career_certificate:               '경력증명서',
  withholding_tax:                  '원천징수영수증(연도별)',
  earned_income_withholding_ledger: '근로소득원천징수부',
  withholding_tax_confirmation:     '갑종근로소득에대한원천징수확인서',
}

// 재직·경력증명서는 직원 이메일로 직접 발급, 나머지는 세무사 경유
const DIRECT_CERT_TYPES: DocumentType[] = ['employment_certificate', 'career_certificate']

/* ── 직원: 서류 신청 ─────────────────────────────────────────── */
export async function createDocumentRequest(input: {
  document_type: DocumentType
  purpose:       string
  address?:      string
  note?:         string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다' }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, company_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!emp) return { success: false, error: '재직 중인 직원 정보를 찾을 수 없습니다' }

  const { error } = await supabase.from('document_requests').insert({
    company_id:    emp.company_id,
    employee_id:   emp.id,
    document_type: input.document_type,
    purpose:       input.purpose.trim() || null,
    address:       input.address?.trim() || null,
    note:          input.note?.trim() || null,
    status:        'pending',
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/employee/documents')
  return { success: true }
}

/* ── 매니저: 승인 ────────────────────────────────────────────── */
export async function approveDocumentRequest(
  requestId: number,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다' }

  // 요청 + 직원 + 회사 정보 한번에 조회
  const { data: req } = await supabase
    .from('document_requests')
    .select(`
      id, document_type, purpose, address, note, status, requested_at,
      employees(id, name, email, registration_number, department, position, Date_of_joining, quit_date),
      companies(id, name, representative, address, tax_accountant_company, tax_accountant_name, tax_accountant_email)
    `)
    .eq('id', requestId)
    .single()

  if (!req) return { success: false, error: '신청 내역을 찾을 수 없습니다' }
  if (req.status !== 'pending') return { success: false, error: '이미 처리된 신청입니다' }

  type EmpRow = { id: number; name: string; email: string; registration_number: string | null; department: string | null; position: string | null; Date_of_joining: string | null; quit_date: string | null }
  type CompanyRow = { id: number; name: string; representative: string | null; address: string | null; tax_accountant_company: string | null; tax_accountant_name: string | null; tax_accountant_email: string | null }
  const empArr = req.employees as unknown as EmpRow[]
  const emp = empArr[0]
  const company = req.companies as unknown as CompanyRow

  const docType  = req.document_type as DocumentType
  const docLabel = DOCUMENT_TYPE_LABELS[docType]
  const today    = new Date().toISOString().slice(0, 10)

  // 발급 번호: "제 YY-XXXX 호"
  const yy      = today.slice(2, 4)
  const docNum  = `제 ${yy}-${String(requestId).padStart(4, '0')} 호`

  let emailResult: { success: boolean; error?: string }

  if (DIRECT_CERT_TYPES.includes(docType)) {
    // 재직증명서 → 직원 이메일로 직접 발급
    emailResult = await sendEmploymentCertificateEmail(emp.email, {
      docNumber:      docNum,
      docType:        docLabel,
      employeeName:   emp.name,
      regNumber:      emp.registration_number,
      address:        req.address,
      startDate:      emp.Date_of_joining ?? today,
      endDate:        emp.quit_date ?? null,
      purpose:        req.purpose,
      department:     emp.department,
      position:       emp.position,
      companyName:    company.name,
      representative: company.representative,
      companyAddress: company.address,
      issuedDate:     today,
    })
  } else {
    // 세무 관련 서류 → 세무사 이메일로 발급 요청
    if (!company.tax_accountant_email) {
      return { success: false, error: '세무사/회계사 이메일이 등록되어 있지 않습니다. 기업관리 페이지에서 세무사 정보를 먼저 등록해 주세요.' }
    }
    emailResult = await sendTaxDocumentRequestEmail(company.tax_accountant_email, {
      taxAccountantName: company.tax_accountant_name ?? '담당자',
      employeeName:      emp.name,
      employeeEmail:     emp.email,
      companyName:       company.name,
      documentType:      docLabel,
      purpose:           req.purpose,
      note:              req.note,
      requestedAt:       req.requested_at,
    })
  }

  if (!emailResult.success) {
    return { success: false, error: `이메일 발송 실패: ${emailResult.error}` }
  }

  const { error: updErr } = await supabase
    .from('document_requests')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', requestId)

  if (updErr) return { success: false, error: updErr.message }

  revalidatePath('/manager/documents')
  return { success: true }
}

/* ── 매니저: 반려 ────────────────────────────────────────────── */
export async function rejectDocumentRequest(
  requestId:       number,
  rejectionReason: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다' }

  const { error } = await supabase
    .from('document_requests')
    .update({
      status:           'rejected',
      rejection_reason: rejectionReason.trim() || null,
      rejected_at:      new Date().toISOString(),
    })
    .eq('id', requestId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/manager/documents')
  return { success: true }
}
