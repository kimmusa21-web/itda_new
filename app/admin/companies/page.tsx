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
        <h1 className="text-xl font-bold text-gray-900">기업 목록</h1>
        <p className="text-sm text-gray-500 mt-0.5">등록된 기업 {companies?.length ?? 0}개</p>
      </div>

      <div className="space-y-3">
        {companies?.map((c: any) => (
          <div key={c.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{c.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">직원 {c.employees?.[0]?.count ?? 0}명</p>
              </div>
              <span className="badge badge-blue">기업 ID {c.id}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-4 text-sm">
              {c.biz_number && <Row label="사업자번호" value={c.biz_number} />}
              {c.representative && <Row label="대표자" value={c.representative} />}
              {c['Business type'] && <Row label="업태" value={c['Business type']} />}
              {c.Industry && <Row label="종목" value={c.Industry} />}
              {c.Telephone && <Row label="전화번호" value={c.Telephone} />}
              {c.address && <Row label="주소" value={c.address} />}
            </div>
          </div>
        ))}
        {(!companies || companies.length === 0) && (
          <div className="card p-10 text-center text-gray-400">
            <p className="text-4xl mb-3">🏢</p>
            <p className="text-sm">등록된 기업이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  )
}
