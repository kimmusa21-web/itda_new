import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatMonth } from '@/lib/utils'

export default async function ManagerDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*,companies(name)').eq('id', user.id).single()
  const companyId = profile?.company_id

  const [
    { count: empCount },
    { data: recentBatches },
    { data: latestPay },
  ] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('is_active', true),
    supabase.from('payroll_batches').select('*')
      .eq('company_id', companyId).order('created_at', { ascending: false }).limit(3),
    supabase.from('pay_info').select('accrual_month')
      .eq('company_id', companyId).order('accrual_month', { ascending: false }).limit(1),
  ])

  const lastMonth = latestPay?.[0]?.accrual_month

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">{(profile?.companies as any)?.name}</p>
        <h1 className="text-xl font-bold text-gray-900 mt-0.5">대시보드</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-gray-500">재직 직원</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{empCount ?? 0}명</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">최근 급여월</p>
          <p className="text-lg font-bold text-gray-800 mt-1">{lastMonth ? formatMonth(lastMonth) : '-'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/manager/payroll" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center text-brand-600 text-lg">💰</div>
          <div>
            <p className="text-sm font-medium text-gray-800">급여 조회</p>
            <p className="text-xs text-gray-500">월별 전체 현황</p>
          </div>
        </Link>
        <Link href="/manager/employees" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600 text-lg">👥</div>
          <div>
            <p className="text-sm font-medium text-gray-800">직원 관리</p>
            <p className="text-xs text-gray-500">입퇴사 처리</p>
          </div>
        </Link>
      </div>

      {recentBatches && recentBatches.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">최근 급여 업로드</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentBatches.map((b: any) => (
              <div key={b.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{formatMonth(b.accrual_month)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{b.row_count}명 · {new Date(b.created_at).toLocaleDateString('ko-KR')}</p>
                </div>
                <span className={`badge ${b.status === 'done' ? 'badge-green' : 'badge-yellow'}`}>
                  {b.status === 'done' ? '완료' : '처리중'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
