'use client'
/* ================================================================
   ModuHR — 급여명세서 이메일 발송 버튼 컴포넌트
   admin / manager 공용
================================================================ */

import { useState } from 'react'
import { Send, CheckCircle, XCircle, AlertCircle, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sendPayslipEmails } from '@/lib/actions/send-payslip-emails'
import type { SendPayslipResult } from '@/lib/actions/send-payslip-emails'
import { formatMonth } from '@/lib/utils'

interface Props {
  companyId:    number
  accrualMonth: string
  employeeCount?: number
  className?: string
}

type State = 'idle' | 'confirming' | 'sending' | 'done'

export function SendPayslipButton({ companyId, accrualMonth, employeeCount, className }: Props) {
  const [state, setState]   = useState<State>('idle')
  const [result, setResult] = useState<SendPayslipResult | null>(null)
  const [error, setError]   = useState<string | null>(null)

  async function handleSend() {
    setState('sending')
    setError(null)
    try {
      const res = await sendPayslipEmails({ companyId, accrualMonth })
      if (res.authError) {
        setError(res.authError)
        setState('idle')
        return
      }
      setResult(res)
      setState('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.')
      setState('idle')
    }
  }

  const monthLabel = formatMonth(accrualMonth)

  /* ── 확인 모달 ── */
  if (state === 'confirming') {
    return (
      <Modal onClose={() => setState('idle')}>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Send size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">급여명세서 발송 확인</p>
              <p className="text-sm text-slate-500 mt-1">
                <strong>{monthLabel}</strong> 급여명세서를{' '}
                {employeeCount ? <><strong>{employeeCount}명</strong>의 </> : ''}
                직원들에게 이메일로 발송합니다.
              </p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 leading-relaxed">
            · 각 직원의 등록 이메일로 급여명세서 링크가 발송됩니다.<br />
            · 직원이 로그인하면 본인 명세서를 확인할 수 있습니다.<br />
            · 이메일 미등록 직원은 발송 대상에서 제외됩니다.
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setState('idle')} className="btn-secondary flex-1">
              취소
            </button>
            <button onClick={handleSend} className="btn-primary flex-1">
              <Send size={14} />
              발송하기
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  /* ── 발송 중 ── */
  if (state === 'sending') {
    return (
      <Modal onClose={() => {}}>
        <div className="text-center py-6 space-y-3">
          <Loader2 size={32} className="mx-auto text-blue-500 animate-spin" />
          <p className="text-sm font-medium text-slate-700">이메일 발송 중...</p>
          <p className="text-xs text-slate-400">잠시 기다려 주세요.</p>
        </div>
      </Modal>
    )
  }

  /* ── 완료 ── */
  if (state === 'done' && result) {
    return (
      <Modal onClose={() => setState('idle')}>
        <div className="space-y-4">
          {/* 헤더 */}
          <div className="flex items-start gap-3">
            {result.failedCount === 0 ? (
              <CheckCircle size={24} className="text-green-500 flex-shrink-0 mt-0.5" />
            ) : result.sentCount === 0 ? (
              <XCircle size={24} className="text-red-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={24} className="text-amber-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-slate-900">발송 완료</p>
              <p className="text-sm text-slate-500 mt-0.5">
                {monthLabel} 급여명세서 이메일 발송 결과
              </p>
            </div>
          </div>

          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-green-600">{result.sentCount}</p>
              <p className="text-xs text-green-700 mt-0.5">발송 성공</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-red-500">{result.failedCount}</p>
              <p className="text-xs text-red-600 mt-0.5">발송 실패</p>
            </div>
            <div className="bg-slate-100 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-slate-500">{result.skippedCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">건너뜀</p>
            </div>
          </div>

          {/* 상세 목록 (실패/건너뜀 있을 때만) */}
          {(result.failedCount > 0 || result.skippedCount > 0) && (
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {result.details
                .filter(d => d.status !== 'sent')
                .map((d, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                    {d.status === 'failed' ? (
                      <XCircle size={14} className="text-red-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle size={14} className="text-slate-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{d.name}</p>
                      <p className="text-xs text-slate-400 truncate">{d.email}</p>
                    </div>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full whitespace-nowrap',
                      d.status === 'failed'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-slate-100 text-slate-500',
                    )}>
                      {d.reason ?? (d.status === 'skipped' ? '건너뜀' : '실패')}
                    </span>
                  </div>
                ))}
            </div>
          )}

          <button onClick={() => setState('idle')} className="btn-secondary w-full">
            닫기
          </button>
        </div>
      </Modal>
    )
  }

  /* ── 기본 버튼 ── */
  return (
    <div>
      <button
        onClick={() => { setError(null); setState('confirming') }}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border',
          'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
          className,
        )}
        disabled={!accrualMonth}
        title={accrualMonth ? `${monthLabel} 급여명세서 이메일 발송` : '귀속월을 선택해주세요'}
      >
        <Send size={15} />
        급여명세서 발송
      </button>
      {error && (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}

/* ── 공용 모달 ── */
function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-md p-6 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
