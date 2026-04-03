import { Building2, Phone, Mail } from 'lucide-react'
import { mockUsers } from '@/lib/mock-data'

export default function ManagerMorePage() {
  const user = mockUsers.manager
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">더보기</h1>
        <p className="text-sm text-slate-500 mt-0.5">{user.company}</p>
      </div>
      <div className="card divide-y divide-slate-100">
        <Section title="회사 정보">
          <Row icon={Building2} label="회사명"           value={user.company ?? '-'} />
          <Row icon={Phone}     label="전화번호"          value="02-1234-5678" />
          <Row icon={Mail}      label="세금계산서 이메일" value="tax@va.kr" />
        </Section>
        <Section title="세무 담당">
          <Row icon={Building2} label="세무법인"      value="우리세무법인" />
          <Row icon={Phone}     label="세무사 연락처" value="02-9876-5432" />
          <Row icon={Mail}      label="이메일"        value="cpa@wuri.kr" />
        </Section>
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
