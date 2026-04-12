import { redirect } from 'next/navigation'
import { Building2, Phone, Mail, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveManagerContext } from '@/lib/impersonation/get-effective-context'
import { PayslipNoteEditor } from './payslip-note-editor'

export const metadata = { title: '더보기 | itda' }

export default async function ManagerMorePage() {
  const supabase = createClient()
  const ctx = await getEffectiveManagerContext()
  if (!ctx?.companyId) redirect('/manager')

  const { data: company } = await supabase
    .from('companies')
    .select('name, Telephone, "tax invoice email", contact_name, contact_email, payslip_note')
    .eq('id', ctx.companyId)
    .single()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">더보기</h1>
        <p className="text-sm text-slate-500 mt-0.5">{company?.name ?? '소속 회사 없음'}</p>
      </div>

      <div className="card divide-y divide-slate-100">
        <Section title="회사 정보">
          <Row icon={Building2} label="회사명"           value={company?.name ?? '-'} />
          <Row icon={Phone}     label="전화번호"          value={(company as any)?.Telephone ?? '-'} />
          <Row icon={Mail}      label="세금계산서 이메일" value={(company as any)?.['tax invoice email'] ?? '-'} />
        </Section>

        {(company?.contact_name || company?.contact_email) && (
          <Section title="담당자">
            {company.contact_name  && <Row icon={Building2} label="담당자 이름"  value={company.contact_name} />}
            {company.contact_email && <Row icon={Mail}      label="담당자 이메일" value={company.contact_email} />}
          </Section>
        )}
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
          <FileText size={15} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">급여명세서 산출 근거</h3>
        </div>
        <PayslipNoteEditor initialNote={(company as any)?.payslip_note ?? null} />
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={15} className="text-slate-400 flex-shrink-0" />
      <span className="text-sm text-slate-500 w-32 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 flex-1 truncate">{value}</span>
    </div>
  )
}
