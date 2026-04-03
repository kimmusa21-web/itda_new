import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PayslipCard from '@/components/PayslipCard'
import { formatMonth } from '@/lib/utils'
import type { PayInfo } from '@/types'

export default async function EmployeePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 직원 정보
  const { data: employee } = await supabase
    .from('employees')
    .select('*, companies(name)')
    .eq('user_id', user.id)
    .single()

  if (!employee) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">급여명세서</h1>
        </div>
        <div className="card p-10 text-center text-gray-400">
          <p className="text-4xl mb-3">🔗</p>
          <p className="text-sm font-medium text-gray-600 mb-1">계정이 직원 정보에 연결되지 않았습니다</p>
          <p className="text-xs text-gray-400">관리자에게 연결을 요청해주세요</p>
        </div>
      </div>
    )
  }

  // 최신 급여 데이터
  const { data: latestPay } = await supabase
    .from('pay_info')
    .select('*')
    .eq('employee_id', employee.id)
    .order('accrual_month', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{(employee.companies as any)?.name}</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">
            {latestPay ? formatMonth(latestPay.accrual_month) : '급여명세서'}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-800">{employee.name}</p>
          <p className="text-xs text-gray-500">{employee.position ?? employee.department ?? ''}</p>
        </div>
      </div>

      {/* 직원 정보 요약 */}
      <div className="card p-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-400">소속</p>
          <p className="font-medium text-gray-800 mt-0.5">{(employee.companies as any)?.name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">부서</p>
          <p className="font-medium text-gray-800 mt-0.5">{employee.department ?? '-'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">직위</p>
          <p className="font-medium text-gray-800 mt-0.5">{employee.position ?? '-'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">입사일</p>
          <p className="font-medium text-gray-800 mt-0.5">
            {employee.Date_of_joining
              ? new Date(employee.Date_of_joining).toLocaleDateString('ko-KR')
              : '-'}
          </p>
        </div>
      </div>

      {latestPay ? (
        <PayslipCard pay={latestPay as unknown as PayInfo} employee={employee as any} />
      ) : (
        <div className="card p-10 text-center text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">아직 등록된 급여 데이터가 없습니다</p>
        </div>
      )}
    </div>
  )
}
