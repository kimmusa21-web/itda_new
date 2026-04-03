'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PayslipCard from '@/components/PayslipCard'
import type { PayInfo, Employee } from '@/types'
import { formatKRW, formatMonth } from '@/lib/utils'

export default function EmployeeHistoryPage() {
  const supabase = createClient()
  const [payList, setPayList] = useState<PayInfo[]>([])
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PayInfo | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: emp } = await supabase
        .from('employees').select('*, companies(name)').eq('user_id', user.id).single()
      setEmployee(emp as any)

      if (emp) {
        const { data: pays } = await supabase
          .from('pay_info').select('*')
          .eq('employee_id', emp.id)
          .order('accrual_month', { ascending: false })
        setPayList((pays as any) ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">지급 이력</h1>
        <p className="text-sm text-gray-500 mt-0.5">월별 급여 내역을 확인하세요</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : payList.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">급여 이력이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payList.map(pay => (
            <button key={pay.id} onClick={() => setSelected(pay)}
              className="card w-full p-4 flex items-center justify-between hover:shadow-md transition-shadow text-left">
              <div>
                <p className="font-semibold text-gray-900">{formatMonth(pay.accrual_month)}</p>
                {pay.payment_date && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    지급일 {new Date(pay.payment_date).toLocaleDateString('ko-KR')}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-brand-600">{formatKRW(pay.net_pay)}</p>
                <p className="text-xs text-gray-400 mt-0.5">실수령액</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 명세서 모달 */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 px-4 py-6 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div className="w-full max-w-sm my-auto">
            <PayslipCard pay={selected} employee={employee ?? undefined} />
            <button onClick={() => setSelected(null)} className="mt-3 w-full btn-secondary">닫기</button>
          </div>
        </div>
      )}
    </div>
  )
}
