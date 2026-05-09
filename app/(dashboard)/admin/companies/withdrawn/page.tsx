import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Building2, Calendar } from 'lucide-react'
import { WithdrawnDownloadButtons } from './download-buttons'

export const metadata = { title: '탈퇴 기업 | itda' }

export default async function WithdrawnCompaniesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  const { data: companies } = await supabase
    .from('companies')
    .select(`
      id, name, biz_number, representative, contact_name, contact_email,
      status, withdrawn_at, created_at,
      employees ( count )
    `)
    .eq('status', 'withdrawn')
    .order('withdrawn_at', { ascending: false })

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/companies"
          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0"
          title="기업관리 목록으로"
        >
          <ArrowLeft size={15} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">탈퇴 기업</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            데이터는 법정 기간(3년)이 경과한 후 삭제됩니다 · {companies?.length ?? 0}개사
          </p>
        </div>
      </div>

      {!companies || companies.length === 0 ? (
        <div className="card p-10 text-center text-slate-400 text-sm">
          탈퇴한 기업이 없습니다
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map(c => {
            const totalEmp  = (c.employees as any)?.[0]?.count ?? 0
            const withdrawn = c.withdrawn_at
              ? new Date(c.withdrawn_at).toLocaleDateString('ko-KR')
              : '—'
            const deleteAfter = c.withdrawn_at
              ? new Date(new Date(c.withdrawn_at).setFullYear(new Date(c.withdrawn_at).getFullYear() + 3))
                  .toLocaleDateString('ko-KR')
              : '—'

            return (
              <Link
                key={c.id}
                href={`/admin/companies/${c.id}`}
                className="card p-5 block hover:shadow-md hover:border-slate-200 transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-700">{c.name}</p>
                      <span className="badge badge-gray text-xs">탈퇴</span>
                    </div>
                    {c.biz_number && (
                      <p className="text-xs text-slate-400 mt-0.5">사업자번호: {c.biz_number}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-50">
                  <Field label="대표자"   value={c.representative ?? '—'} />
                  <Field label="담당자"   value={c.contact_name   ?? '—'} />
                  <Field label="전체 직원" value={`${totalEmp}명`} />
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">탈퇴일</p>
                    <p className="text-xs font-medium text-slate-700 flex items-center gap-1">
                      <Calendar size={11} className="text-slate-400" />
                      {withdrawn}
                    </p>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-50">
                  <p className="text-xs text-slate-400">
                    데이터 보관 만료: <span className="text-slate-600 font-medium">{deleteAfter}</span>
                  </p>
                </div>

                <WithdrawnDownloadButtons
                  companyId={c.id}
                  companyName={c.name}
                />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-xs font-medium text-slate-700">{value}</p>
    </div>
  )
}
