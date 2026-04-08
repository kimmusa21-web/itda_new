'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { PayslipDetail } from '@/lib/mock-payslip'
import { formatKRW, formatAccrualMonth } from '@/lib/payslip-utils'
import { cn } from '@/lib/utils'

/* ── 접힘/펼침 섹션 ── */
function AccordionSection({
  title,
  accent = 'blue',
  children,
  defaultOpen = true,
}: {
  title: string
  accent?: 'blue' | 'red'
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className={cn(
          'text-sm font-semibold',
          accent === 'blue' ? 'text-blue-700' : 'text-red-600',
        )}>
          {title}
        </span>
        {open
          ? <ChevronUp size={16} className="text-slate-400" />
          : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  )
}

/* ── 금액 행 ── */
function AmtRow({ label, amount, dim }: { label: string; amount: number; dim?: boolean }) {
  return (
    <div className={cn('flex justify-between items-center py-2 text-sm border-b border-slate-50 last:border-0', dim && 'opacity-40')}>
      <span className="text-slate-600">{label}</span>
      <span className="font-mono tabular-nums text-slate-800">{formatKRW(amount)}</span>
    </div>
  )
}

/* ── 정보 행 ── */
function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-center py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */

interface Props {
  payslip: PayslipDetail
}

/**
 * 어드민/매니저 급여 조회 화면에서 인라인으로 사용하는 급여명세서 뷰.
 * 전체 페이지 레이아웃 없이 카드 형태로 렌더링.
 */
export function PayslipInlineDetail({ payslip }: Props) {
  const [showZero, setShowZero] = useState(false)

  const visibleEarnings  = showZero ? payslip.earnings  : payslip.earnings.filter(i => i.amount !== 0)
  const visibleDeductions = showZero ? payslip.deductions : payslip.deductions.filter(i => i.amount !== 0)

  return (
    <div className="space-y-3">
      {/* 실수령액 히어로 */}
      <div className="bg-slate-900 rounded-2xl px-5 py-5">
        <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">실수령액</p>
        <p className="text-3xl font-bold text-white tracking-tight">{formatKRW(payslip.netPay)}</p>
        <p className="text-sm text-slate-400 mt-1.5">
          {formatAccrualMonth(payslip.accrualMonth)} 급여
          {payslip.paymentDate && (
            <span className="text-slate-300"> · {payslip.paymentDate.replace(/-/g, '.')} 지급</span>
          )}
        </p>
      </div>

      {/* 직원 기본 정보 */}
      <div className="card px-4 py-3 space-y-0.5">
        <InfoRow label="성명" value={payslip.employee.name} />
        <InfoRow label="부서" value={payslip.employee.department} />
        <InfoRow label="직책" value={payslip.employee.position} />
        <InfoRow label="입사일" value={payslip.employee.joinDate} />
        <InfoRow label="근무형태" value={payslip.employee.employmentType} />
      </div>

      {/* 영(0) 항목 토글 */}
      <div className="flex justify-end">
        <button
          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          onClick={() => setShowZero(v => !v)}
        >
          {showZero ? '0원 항목 숨기기' : '0원 항목 보기'}
        </button>
      </div>

      {/* 지급 내역 */}
      <AccordionSection title={`지급 내역 · ${formatKRW(payslip.totalEarnings)}`} accent="blue">
        <div className="pt-2">
          {visibleEarnings.map(item => (
            <AmtRow key={item.key} label={item.label} amount={item.amount} dim={item.amount === 0} />
          ))}
          <div className="flex justify-between items-center pt-3 mt-1 border-t-2 border-slate-200">
            <span className="text-sm font-bold text-slate-700">지급 합계</span>
            <span className="font-bold text-blue-600 tabular-nums">{formatKRW(payslip.totalEarnings)}</span>
          </div>
        </div>
      </AccordionSection>

      {/* 공제 내역 */}
      <AccordionSection title={`공제 내역 · ${formatKRW(payslip.totalDeductions)}`} accent="red" defaultOpen={false}>
        <div className="pt-2">
          {visibleDeductions.map(item => (
            <AmtRow key={item.key} label={item.label} amount={item.amount} dim={item.amount === 0} />
          ))}
          <div className="flex justify-between items-center pt-3 mt-1 border-t-2 border-slate-200">
            <span className="text-sm font-bold text-slate-700">공제 합계</span>
            <span className="font-bold text-red-500 tabular-nums">-{formatKRW(payslip.totalDeductions)}</span>
          </div>
        </div>
      </AccordionSection>

      {/* 최종 요약 */}
      <div className="card px-4 py-3 bg-slate-50">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">지급 합계</span>
          <span className="tabular-nums text-slate-700">{formatKRW(payslip.totalEarnings)}</span>
        </div>
        <div className="flex justify-between items-center text-sm mt-1.5">
          <span className="text-slate-500">공제 합계</span>
          <span className="tabular-nums text-red-500">-{formatKRW(payslip.totalDeductions)}</span>
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
          <span className="font-bold text-slate-900">실수령액</span>
          <span className="text-xl font-bold text-blue-600 tabular-nums">{formatKRW(payslip.netPay)}</span>
        </div>
      </div>
    </div>
  )
}
