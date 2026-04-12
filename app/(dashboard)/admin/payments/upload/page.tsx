import { redirect } from 'next/navigation'

/** 구 경로 (/admin/payments/upload) → 통합된 급여업로드 페이지로 리다이렉트 */
export default function AdminPaymentsUploadRedirect() {
  redirect('/admin/payroll/upload')
}
