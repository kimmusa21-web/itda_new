import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = createClient()

  const [
    { count: companyCount },
    { count: employeeCount },
    { count: pendingCount },
    { data: recentBatches },
  ] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('company_admin_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('payroll_batches')
      .select('*, companies(name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const stats = [
    { label: '등록 기업', value: companyCount ?? 0, href: '/admin/companies', color: 'bg-blue-50 text-blue-600' },
    { label: '재직 직원', value: employeeCount ?? 0, href: '/admin/employees', color: 'bg-green-50 text-green-600' },
    { label: '승인 대기', value: pendingCount ?? 0, href: '/admin/requests', color: 'bg-yellow-50 text-yellow-600', urgent: (pendingCount ?? 0) > 0 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500 mt-0.5">전체 현황을 확인하세요</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => (
          <Link key={s.label} href={s.href}
            className={`card p-4 hover:shadow-md transition-shadow ${s.urgent ? 'ring-2 ring-yellow-400' : ''}`}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.urgent ? 'text-yellow-600' : 'text-gray-800'}`}>{s.value}</p>
            {s.urgent && <p className="text-xs text-yellow-600 mt-1">처리 필요</p>}
          </Link>
        ))}
      </div>

      {/* 빠른 메뉴 */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/admin/requests"
          className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600 text-lg">📋</div>
          <div>
            <p className="text-sm font-medium text-gray-800">기업신청 승인</p>
            <p className="text-xs text-gray-500">신규 기업 가입 처리</p>
          </div>
        </Link>
        <Link href="/admin/payroll"
          className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center text-brand-600 text-lg">📤</div>
          <div>
            <p className="text-sm font-medium text-gray-800">CSV 급여 업로드</p>
            <p className="text-xs text-gray-500">월별 급여 데이터 등록</p>
          </div>
        </Link>
        <Link href="/admin/employees"
          className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600 text-lg">👥</div>
          <div>
            <p className="text-sm font-medium text-gray-800">직원 관리</p>
            <p className="text-xs text-gray-500">입퇴사·정보 관리</p>
          </div>
        </Link>
        <Link href="/admin/companies"
          className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 text-lg">🏢</div>
          <div>
            <p className="text-sm font-medium text-gray-800">기업 목록</p>
            <p className="text-xs text-gray-500">등록 기업 조회</p>
          </div>
        </Link>
      </div>

      {/* 최근 급여 업로드 */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">최근 급여 업로드</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {recentBatches && recentBatches.length > 0 ? recentBatches.map((b: any) => (
            <div key={b.id} className="px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{(b.companies as any)?.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{b.accrual_month} · {b.row_count}명</p>
              </div>
              <span className={`badge ${
                b.status === 'done' ? 'badge-green' :
                b.status === 'error' ? 'badge-red' : 'badge-yellow'
              }`}>
                {b.status === 'done' ? '완료' : b.status === 'error' ? '오류' : '처리중'}
              </span>
            </div>
          )) : (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">업로드 이력이 없습니다</p>
          )}
        </div>
      </div>
    </div>
  )
}
