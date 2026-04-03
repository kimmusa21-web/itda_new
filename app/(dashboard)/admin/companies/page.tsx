import { Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function AdminCompaniesPage() {
  const supabase = createClient()
  const { data: companies } = await supabase
    .from('companies')
    .select('*, employees(count)')
    .order('name')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">회사 관리</h1>
        <p className="text-sm text-slate-500 mt-0.5">등록된 기업 {companies?.length ?? 0}개</p>
      </div>

      {(!companies || companies.length === 0) ? (
        <div className="card p-10 text-center text-slate-400 text-sm">등록된 기업이 없습니다</div>
      ) : (
        <div className="space-y-3">
          {companies.map((c: any) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Building2 size={18} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">직원 {c.employees?.[0]?.count ?? 0}명</p>
                  </div>
                </div>
                <span className="badge badge-blue">ID {c.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {c.biz_number && <Row label="사업자번호" value={c.biz_number} />}
                {c.representative && <Row label="대표자" value={c.representative} />}
                {c['Business type'] && <Row label="업태" value={c['Business type']} />}
                {c.Industry && <Row label="종목" value={c.Industry} />}
                {c.Telephone && <Row label="전화" value={c.Telephone} />}
                {c.address && <Row label="주소" value={c.address} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-400 flex-shrink-0">{label}</span>
      <span className="text-slate-700 truncate">{value}</span>
    </div>
  )
}
