'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PayInfo } from '@/types'
import { formatKRW, formatMonth, recentMonths } from '@/lib/utils'
import PayslipCard from '@/components/PayslipCard'

export default function ManagerPayrollPage() {
  const supabase = createClient()
  const [months, setMonths] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [payList, setPayList] = useState<PayInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<PayInfo | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    // 실제 데이터에서 귀속월 목록 가져오기
    supabase.from('pay_info').select('accrual_month')
      .order('accrual_month', { ascending: false })
      .then(({ data }) => {
        const unique = [...new Set(data?.map(r => r.accrual_month) ?? [])]
        setMonths(unique.length > 0 ? unique : recentMonths(6))
        if (unique.length > 0) setSelectedMonth(unique[0])
      })
  }, [])

  useEffect(() => {
    if (!selectedMonth) return
    setLoading(true)
    supabase.from('pay_info')
      .select('*, employees(name, email, Date_of_joining, position, department)')
      .eq('accrual_month', selectedMonth)
      .order('employee_id')
      .then(({ data }) => {
        setPayList((data as any) ?? [])
        setLoading(false)
      })
  }, [selectedMonth])

  const filtered = payList.filter(p =>
    !search || (p.employees as any)?.name?.includes(search) || (p.employees as any)?.email?.includes(search)
  )

  const totalPay   = filtered.reduce((s, p) => s + (parseInt(p.Total_payment ?? '0') || 0), 0)
  const totalDeduct = filtered.reduce((s, p) => s + (parseInt(p.Total_deductible ?? '0') || 0), 0)
  const totalNet   = filtered.reduce((s, p) => s + (parseInt(p.net_pay ?? '0') || 0), 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">급여 조회</h1>
        <p className="text-sm text-gray-500 mt-0.5">월별 급여 현황을 확인하세요</p>
      </div>

      {/* 월 선택 */}
      <div className="flex items-center gap-3">
        <select className="input w-40" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
          {months.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
        <input className="input flex-1 max-w-xs" placeholder="직원 이름·이메일 검색"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* 합계 요약 */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4">
            <p className="text-xs text-gray-500">총 지급합계</p>
            <p className="text-base font-bold text-gray-800 mt-1">{formatKRW(totalPay)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500">총 공제합계</p>
            <p className="text-base font-bold text-red-500 mt-1">-{formatKRW(totalDeduct)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500">총 실수령액</p>
            <p className="text-base font-bold text-brand-600 mt-1">{formatKRW(totalNet)}</p>
          </div>
        </div>
      )}

      {/* 직원별 목록 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <p className="text-4xl mb-3">📂</p>
          <p className="text-sm">{selectedMonth ? '해당 월의 급여 데이터가 없습니다' : '귀속월을 선택하세요'}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['직원', '부서/직위', '지급합계', '공제합계', '실수령액', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(pay => {
                const emp = (pay.employees as any)
                return (
                  <tr key={pay.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{emp?.name}</p>
                      <p className="text-xs text-gray-400">{emp?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{emp?.department ?? '-'}</p>
                      <p className="text-xs text-gray-400">{emp?.position ?? '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{formatKRW(pay.Total_payment)}</td>
                    <td className="px-4 py-3 text-red-500">-{formatKRW(pay.Total_deductible)}</td>
                    <td className="px-4 py-3 font-bold text-brand-600">{formatKRW(pay.net_pay)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(pay)}
                        className="text-xs text-brand-600 hover:underline whitespace-nowrap">
                        명세서 보기
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 명세서 모달 */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 px-4 py-6 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div className="w-full max-w-sm my-auto">
            <PayslipCard pay={selected} />
            <button onClick={() => setSelected(null)}
              className="mt-3 w-full btn-secondary">닫기</button>
          </div>
        </div>
      )}
    </div>
  )
}
