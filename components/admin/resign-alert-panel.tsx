'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, UserMinus, ChevronRight, CheckCircle2 } from 'lucide-react'
import { resignEmployee } from '@/lib/actions/employee-resign'
import type { PendingResignee, MissingPayrollEmployee } from '@/lib/actions/admin-hr-alerts'

interface Props {
  pendingResignees: PendingResignee[]
  missingPayroll:   MissingPayrollEmployee[]
}

export default function ResignAlertPanel({ pendingResignees, missingPayroll }: Props) {
  const [processingId, setProcessingId]   = useState<number | null>(null)
  const [processedIds, setProcessedIds]   = useState<Set<number>>(new Set())
  const [errorMap, setErrorMap]           = useState<Record<number, string>>({})

  async function handleResign(emp: PendingResignee) {
    if (!emp.quit_date || processingId !== null) return
    setProcessingId(emp.id)
    setErrorMap((prev) => { const n = { ...prev }; delete n[emp.id]; return n })

    const result = await resignEmployee(emp.id, {
      quitDate:          emp.quit_date,
      quitReason:        '',
      unemploymentClaim: false,
      unemploymentCode:  '',
    })

    setProcessingId(null)
    if (result.success) {
      setProcessedIds((prev) => new Set([...prev, emp.id]))
    } else {
      setErrorMap((prev) => ({ ...prev, [emp.id]: result.error ?? '처리 실패' }))
    }
  }

  const visibleResignees = pendingResignees.filter((e) => !processedIds.has(e.id))
  const hasPending = visibleResignees.length > 0
  const hasMissing = missingPayroll.length > 0

  if (!hasPending && !hasMissing) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-500" />
        <h2 className="text-sm font-semibold text-slate-700">처리 필요 사항</h2>
      </div>

      {/* ── 퇴사일이 지난 재직자 ── */}
      {hasPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <UserMinus size={13} className="text-amber-600" />
            </div>
            <div>
              <span className="text-sm font-semibold text-amber-700">
                퇴사 처리 대기 {visibleResignees.length}명
              </span>
              <span className="text-xs text-amber-500 ml-2">퇴사일이 지났으나 재직 상태</span>
            </div>
          </div>

          <div className="space-y-2">
            {visibleResignees.map((emp) => (
              <div key={emp.id} className="bg-white rounded-xl px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {emp.company_name} · {emp.job ?? '직무미정'} · 퇴사일 {emp.quit_date}
                    </p>
                    {errorMap[emp.id] && (
                      <p className="text-xs text-red-500 mt-0.5">{errorMap[emp.id]}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleResign(emp)}
                    disabled={processingId !== null}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
                  >
                    {processingId === emp.id ? '처리중...' : '퇴사 처리'}
                  </button>
                </div>
              </div>
            ))}

            {processedIds.size > 0 && (
              <div className="flex items-center gap-1.5 px-1 pt-1">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span className="text-xs text-emerald-600">{processedIds.size}명 퇴사 처리 완료</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 최근 급여 누락 직원 ── */}
      {hasMissing && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={13} className="text-slate-500" />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-600">
                급여 누락 의심 {missingPayroll.length}명
              </span>
              <span className="text-xs text-slate-400 ml-2">최근 급여 데이터 없음 (퇴사 여부 확인)</span>
            </div>
          </div>

          <div className="space-y-2">
            {missingPayroll.map((emp) => (
              <Link
                key={emp.id}
                href={`/admin/companies/${emp.company_id}`}
                className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 hover:bg-slate-100 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {emp.company_name} · {emp.job ?? '직무미정'} · {emp.latest_month.replace('-', '년 ')}월 급여 없음
                  </p>
                </div>
                <ChevronRight size={14} className="text-slate-400 flex-shrink-0 ml-2" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
