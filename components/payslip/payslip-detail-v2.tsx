'use client'
/* ================================================================
   PayslipDetailView — 급여명세서 상세 화면
   상세에서만 금액 노출, 산출근거 아코디언 포함
================================================================ */

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, ChevronDown, ChevronUp,
  Printer, Download, CheckCircle2, Clock,
  User, Building2, CalendarDays, Banknote,
} from 'lucide-react'
import type { PayslipDetail } from '@/types/payslip'
import { formatKRW, formatMonth, formatDateDot, formatDateKR, cn } from '@/lib/utils'

interface Props { detail: PayslipDetail }

export function PayslipDetailView({ detail: d }: Props) {
  const [notesOpen, setNotesOpen] = useState(false)

  const today     = new Date().toISOString().slice(0, 10)
  const isPending = !d.paymentDate || d.paymentDate > today

  // 환급 항목 분리 (음수)
  const posDeductions = d.deductions.filter(x => x.amount > 0)
  const refunds       = d.deductions.filter(x => x.amount < 0)

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-5">

        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between">
          <Link href="/employee/payslips"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 -ml-1">
            <ChevronLeft size={17} />목록
          </Link>
          <div className="flex gap-2">
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <Printer size={14} />인쇄
            </button>
            <button onClick={() => alert('PDF 다운로드 기능은 준비 중입니다')}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
              <Download size={14} />PDF
            </button>
          </div>
        </div>

        {/* ── 급여 기본 카드 ── */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <div className="bg-[#0f172a] px-5 pt-5 pb-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1.5">급여명세서</p>
                <h1 className="text-xl font-bold text-white">{d.employee.name}의 급여명세서</h1>
                <p className="text-sm text-slate-400 mt-0.5">{formatMonth(d.accrualMonth)} ({d.accrualMonth})</p>
              </div>
              {isPending ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/30 flex-shrink-0">
                  <Clock size={10} />지급예정
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                  <CheckCircle2 size={10} />지급완료
                </span>
              )}
            </div>

            {/* ★ 실수령액 — 상세에서만 표시 */}
            <div className="bg-white/5 rounded-xl px-4 py-3">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">실수령액</p>
              <p className="text-3xl font-extrabold text-white tabular-nums">{formatKRW(d.netPay)}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <CalendarDays size={11} className="text-slate-500" />
                <span className="text-xs text-slate-500">
                  {isPending ? '예정 지급일 ' : '지급일 '}
                  <span className="text-slate-400 font-medium">
                    {d.paymentDate ? formatDateKR(d.paymentDate) : '—'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* 지급/공제 요약 */}
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <div className="px-5 py-4 text-center">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">지급합계</p>
              <p className="text-base font-bold text-blue-600 tabular-nums">{formatKRW(d.totalEarnings)}</p>
            </div>
            <div className="px-5 py-4 text-center">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">공제합계</p>
              <p className="text-base font-bold text-rose-600 tabular-nums">-{formatKRW(d.totalDeductions)}</p>
            </div>
          </div>
        </div>

        {/* ── 인적 사항 ── */}
        <InfoSection icon={<User size={14} className="text-blue-500" />} title="인적 사항">
          <InfoRow label="성명"     value={d.employee.name}      />
          <InfoRow label="회사"     value={d.companyName}         />
          <InfoRow label="부서"     value={d.employee.department} />
          <InfoRow label="직위"     value={d.employee.position}   />
          <InfoRow label="입사일"   value={d.employee.joinDate ? formatDateDot(d.employee.joinDate) : null} />
          <InfoRow label="사원번호" value={d.employee.employeeNo} />
        </InfoSection>

        {/* ── 근무 정보 ── */}
        {(d.workDays != null || d.overtimeHours != null) && (
          <InfoSection icon={<Banknote size={14} className="text-blue-500" />} title="근무 정보">
            {d.workDays      != null && <InfoRow label="근무일수"    value={`${d.workDays}일`} />}
            {d.overtimeHours != null && <InfoRow label="연장근로시간" value={`${d.overtimeHours}H`} />}
          </InfoSection>
        )}

        {/* ── 지급 내역 ── */}
        <div className="card overflow-hidden">
          <SectionHeader icon={<span className="w-2 h-2 rounded-full bg-blue-500" />} title="지급 내역" />
          <div className="px-5 py-2 space-y-0.5">
            {d.earnings.map(e => (
              <LineItem key={e.key} label={e.label} amount={e.amount} color="blue" />
            ))}
          </div>
          <TotalRow label="지급합계" value={d.totalEarnings} color="blue" />
        </div>

        {/* ── 공제 내역 ── */}
        <div className="card overflow-hidden">
          <SectionHeader icon={<span className="w-2 h-2 rounded-full bg-rose-500" />} title="공제 내역" />
          <div className="px-5 py-2 space-y-0.5">
            {posDeductions.map(d => (
              <LineItem key={d.key} label={d.label} amount={d.amount} color="rose" />
            ))}
            {refunds.length > 0 && (
              <>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider pt-2 pb-0.5">환급</p>
                {refunds.map(d => (
                  <LineItem key={d.key} label={d.label} amount={d.amount} color="emerald" />
                ))}
              </>
            )}
          </div>
          <TotalRow label="공제합계" value={d.totalDeductions} color="rose" sign="-" />
        </div>

        {/* ── 실수령액 강조 ── */}
        <div className="card px-5 py-5 flex items-center justify-between bg-slate-900 border-slate-800">
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-0.5">최종 실수령액</p>
            <p className="text-xs text-slate-500">{d.accrualMonth} 귀속</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-white tabular-nums">{formatKRW(d.netPay)}</p>
            {d.paymentDate && (
              <p className="text-xs text-slate-500 mt-0.5">{formatDateDot(d.paymentDate)} 지급</p>
            )}
          </div>
        </div>

        {/* ── 산출 근거 아코디언 ── */}
        {d.calculationNotes.length > 0 && (
          <div className="card overflow-hidden">
            <button
              onClick={() => setNotesOpen(!notesOpen)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">산출 근거</span>
                <span className="text-xs text-slate-400">({d.calculationNotes.length}개)</span>
              </div>
              {notesOpen
                ? <ChevronUp size={16} className="text-slate-400" />
                : <ChevronDown size={16} className="text-slate-400" />
              }
            </button>
            {notesOpen && (
              <div className="border-t border-slate-100 px-5 py-4 space-y-2">
                {d.calculationNotes.map((note, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-blue-500 mt-0.5 flex-shrink-0">{i + 1}</span>
                    <p className="text-sm text-slate-600 leading-relaxed">{note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── 서브컴포넌트 ──────────────────────────────────────── */
function InfoSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
        {icon}
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-5 py-3 space-y-0.5">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 ml-2 text-right">{value}</span>
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
      {icon}
      <span className="text-sm font-bold text-slate-700">{title}</span>
    </div>
  )
}

function LineItem({ label, amount, color }: { label: string; amount: number; color: 'blue' | 'rose' | 'emerald' }) {
  const textColor = { blue: 'text-slate-800', rose: 'text-rose-700', emerald: 'text-emerald-700' }[color]
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-600 flex-1 min-w-0 truncate pr-3">{label}</span>
      <span className={cn('text-sm font-semibold tabular-nums flex-shrink-0', textColor)}>
        {formatKRW(amount)}
      </span>
    </div>
  )
}

function TotalRow({ label, value, color, sign = '' }: {
  label: string; value: number; color: 'blue' | 'rose'; sign?: string
}) {
  const bg = color === 'blue' ? 'bg-blue-50/50' : 'bg-rose-50/50'
  const tc = color === 'blue' ? 'text-blue-600'  : 'text-rose-600'
  return (
    <div className={cn('px-5 py-3 border-t border-slate-100', bg)}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-slate-700">{label}</span>
        <span className={cn('text-base font-extrabold tabular-nums', tc)}>
          {sign}{formatKRW(value)}
        </span>
      </div>
    </div>
  )
}
