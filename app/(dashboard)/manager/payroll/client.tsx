'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mapRowToPayslip, type PayInfoRow } from '@/lib/supabase/queries/payslip'
import { formatKRW, formatAccrualMonth } from '@/lib/payslip-utils'
import { PayslipDetailView } from '@/components/payslip/payslip-detail'
import { BarChart3 } from 'lucide-react'

interface Props {
  companyId: number
  companyName: string
  initialMonths: string[]
  initialMonth: string
  initialRows: PayInfoRow[]
}

export default function ManagerPayrollClient({
  companyId, companyName, initialMonths, initialMonth, initialRows,
}: Props) {
  const supabase = createClient()
  const [month, setMonth]       = useState(initialMonth)
  const [rows, setRows]         = useState(initialRows)
  const [loading, setLoading]   = useState(false)
  const [detailRow, setDetailRow] = useState<PayInfoRow | null>(null)

  async function onMonthChange(m: string) {
    setMonth(m); setLoading(true)
    const { data } = await supabase
      .from('pay_info')
      .select('*, employees(name,email,department,position,birthdate,Date_of_joining,quit_date,company_id,companies(name))')
      .eq('company_id', companyId)
      .eq('accrual_month', m)
      .order('employee_id')
    setRows((data ?? []) as PayInfoRow[])
    setLoading(false)
  }

  const totalPay    = rows.reduce((s,r) => s + parseInt(r.Total_payment ?? '0') || 0, 0)
  const totalDeduct = rows.reduce((s,r) => s + Math.abs(parseInt(r.Total_deductible ?? '0') || 0), 0)
  const totalNet    = rows.reduce((s,r) => s + parseInt(r.net_pay ?? '0') || 0, 0)

  if (detailRow) {
    const ps = mapRowToPayslip(detailRow)
    return (
      <div>
        <button onClick={() => setDetailRow(null)}
          className="mb-4 text-sm text-blue-600 hover:underline flex items-center gap-1">
          ← 목록으로
        </button>
        <div className="pointer-events-none">
          <PayslipDetailView payslip={ps} />
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 text-center">
          기업담당자는 조회만 가능합니다 (수정 불가)
        </div>
        <button onClick={() => setDetailRow(null)} className="btn-secondary w-full mt-3">목록으로</button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-slate-500">{companyName}</p>
        <h1 className="text-xl font-semibold text-slate-900 mt-0.5">급여 조회</h1>
      </div>

      <div className="flex items-center gap-3">
        <select className="input w-44" value={month} onChange={e => onMonthChange(e.target.value)}>
          {initialMonths.map(m => (
            <option key={m} value={m}>{formatAccrualMonth(m)}</option>
          ))}
        </select>
        <span className="text-sm text-slate-500">{rows.length}명</span>
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card rounded-xl">
            <p className="stat-label">총 지급합계</p>
            <p className="text-base font-semibold text-slate-900 mt-1">{formatKRW(totalPay)}</p>
          </div>
          <div className="stat-card rounded-xl">
            <p className="stat-label">총 공제합계</p>
            <p className="text-base font-semibold text-red-500 mt-1">-{formatKRW(totalDeduct)}</p>
          </div>
          <div className="stat-card rounded-xl">
            <p className="stat-label">총 실수령액</p>
            <p className="text-base font-semibold text-blue-600 mt-1">{formatKRW(totalNet)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">불러오는 중...</div>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          <BarChart3 size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm">해당 월의 급여 데이터가 없습니다</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '480px' }}>
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['직원','부서','지급합계','실수령액',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(row => {
                  const emp = row.employees as any
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900">{emp?.name}</p>
                        <p className="text-xs text-slate-400">{emp?.email}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs">{emp?.department ?? '-'}</td>
                      <td className="px-4 py-3.5 text-slate-700">{formatKRW(row.Total_payment ?? 0)}</td>
                      <td className="px-4 py-3.5 font-semibold text-blue-600">{formatKRW(row.net_pay ?? 0)}</td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => setDetailRow(row)}
                          className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                          명세서 보기
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
