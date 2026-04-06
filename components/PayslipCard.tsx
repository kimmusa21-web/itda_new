import type { PayInfoRow as PayInfo } from '@/lib/supabase/queries/payslip-shared'
import { formatKRW, formatMonth, formatDateKR as formatDate } from '@/lib/utils'

interface Employee { name?: string; position?: string; department?: string; Date_of_joining?: string | null }
interface Company { name: string }

interface Props {
  pay: PayInfo
  employee?: Employee
  company?: Company
}

export default function PayslipCard({ pay, employee, company }: Props) {
  const emp = employee ?? pay.employees as unknown as Employee
  const compName = company?.name ?? ((pay as any).companies)?.name ?? ''

  const earnings = [
    { label: '기본급', value: pay.base_salary },
    { label: '고정연장근로수당', value: pay.overtime_pay_fixed },
    { label: '연장근로수당', value: pay.overtime_pay },
    { label: '휴일근로수당', value: pay.holidaytime_pay },
    { label: '야간근로수당', value: pay.nighttime_pay },
    { label: '식대', value: pay.meal_allowance },
    { label: '인센티브', value: pay.incentive },
    { label: '잔여연차수당', value: pay.annual_leave_allowance },
    { label: '기타수당1', value: pay.Other_allowances },
    { label: '기타수당2', value: pay.Other_allowances2 },
    { label: '명절상여', value: pay.Holiday_bonus },
  ].filter(r => r.value && r.value !== '0' && r.value !== '')

  const deductions = [
    { label: '국민연금', value: pay.national_pension },
    { label: '건강보험', value: pay.health_insurance },
    { label: '장기요양보험료', value: pay.longterm_care },
    { label: '고용보험', value: pay.employment_insurance },
    { label: '소득세', value: pay.income_tax },
    { label: '주민세', value: pay.resident_tax },
    { label: '건강보험료정산', value: pay.health_insurance_adjustment },
    { label: '학자금대출', value: pay.student_loan },
    { label: '기타공제', value: pay.Other_deductions },
    { label: '소득세환급', value: pay.income_tax_refund ? `-${pay.income_tax_refund}` : null },
    { label: '주민세환급', value: pay.resident_tax_refund ? `-${pay.resident_tax_refund}` : null },
  ].filter(r => r.value && r.value !== '0' && r.value !== '')

  return (
    <div className="card overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-5 text-white">
        <p className="text-brand-100 text-xs mb-1">{compName}</p>
        <h2 className="text-lg font-bold">{formatMonth(pay.accrual_month)} 급여명세서</h2>
        <p className="text-brand-100 text-sm mt-1">
          {emp?.name} · {emp?.position ?? emp?.department ?? ''}
        </p>
        {pay.payment_date && (
          <p className="text-brand-200 text-xs mt-2">지급일 {formatDate(pay.payment_date)}</p>
        )}
      </div>

      {/* 실수령액 하이라이트 */}
      <div className="bg-brand-50 px-5 py-4 flex items-center justify-between">
        <span className="text-sm text-brand-700 font-medium">최종 실수령액</span>
        <span className="text-2xl font-bold text-brand-600">{formatKRW(pay.net_pay)}</span>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* 근태 정보 */}
        {(pay.working_days || pay.Overtime || pay.Remaining_annual_leave_hours) && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">근태</h3>
            <div className="grid grid-cols-3 gap-2">
              {pay.working_days != null && (
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-800">{pay.working_days}</p>
                  <p className="text-xs text-gray-500 mt-0.5">근무일수</p>
                </div>
              )}
              {pay.Overtime != null && pay.Overtime > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-800">{pay.Overtime}h</p>
                  <p className="text-xs text-gray-500 mt-0.5">연장근로</p>
                </div>
              )}
              {pay.Remaining_annual_leave_hours != null && (
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-800">{pay.Remaining_annual_leave_hours}h</p>
                  <p className="text-xs text-gray-500 mt-0.5">잔여연차</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 지급 내역 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">지급</h3>
            <span className="text-sm font-semibold text-gray-700">{formatKRW(pay.Total_payment)}</span>
          </div>
          <div className="space-y-2">
            {earnings.map(row => (
              <div key={row.label} className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-600">{row.label}</span>
                <span className="text-sm font-medium text-gray-800">{formatKRW(row.value)}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-dashed border-gray-200" />

        {/* 공제 내역 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">공제</h3>
            <span className="text-sm font-semibold text-red-500">-{formatKRW(pay.Total_deductible)}</span>
          </div>
          <div className="space-y-2">
            {deductions.map(row => (
              <div key={row.label} className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-600">{row.label}</span>
                <span className="text-sm font-medium text-red-500">{formatKRW(row.value)}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-gray-200" />

        {/* 최종 합계 */}
        <div className="flex justify-between items-center py-1">
          <span className="font-semibold text-gray-800">실수령액</span>
          <span className="text-xl font-bold text-brand-600">{formatKRW(pay.net_pay)}</span>
        </div>

        {/* 기간 정보 */}
        {(pay.Start_date || pay.End_date) && (
          <p className="text-xs text-gray-400 text-center pt-1">
            정산기간: {formatDate(pay.Start_date)} ~ {formatDate(pay.End_date)}
          </p>
        )}
      </div>

      {/* 입사일 */}
      {emp?.Date_of_joining && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            입사일 <span className="font-medium text-gray-700">{formatDate(emp.Date_of_joining)}</span>
          </p>
        </div>
      )}
    </div>
  )
}
