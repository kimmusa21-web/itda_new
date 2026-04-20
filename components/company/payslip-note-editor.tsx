'use client'
/* ================================================================
   PayslipNoteEditor — 산출근거 항목별 편집 UI

   구조:
   - 항목별 카드: 기본값 표시 + 회사별 override 입력
   - 수정하지 않은 항목은 기본값 유지
   - 초기화 = override 제거 (기본값 복원), 전체 삭제 아님

   저장 구조:
   - companies.payslip_note_overrides JSONB
     { annual_leave_pay: "회사 기준...", ... }
================================================================ */

import { useState } from 'react'
import {
  Loader2, CheckCircle2, AlertCircle, RotateCcw, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  PAYSLIP_RULE_KEYS,
  PAYSLIP_RULE_LABELS,
  DEFAULT_PAYSLIP_RULES,
  type PayslipRuleKey,
} from '@/lib/payslip-defaults'
import { updatePayslipNoteOverrides } from '@/lib/actions/company-actions'
import { cn } from '@/lib/utils'

interface Props {
  initialOverrides?: Record<string, string> | null
  /** 어드민: companyId를 넘기면 해당 회사 저장. 없으면 매니저 본인 회사 */
  companyId?: number
}

export function PayslipNoteEditor({ initialOverrides, companyId }: Props) {
  // key별 override 상태 (빈 문자열 = override 없음 = 기본값 사용)
  const [overrides, setOverrides] = useState<Record<string, string>>(
    () => (initialOverrides ?? {}) as Record<string, string>,
  )
  const [expandedKey, setExpandedKey] = useState<PayslipRuleKey | null>(null)
  const [status, setStatus]           = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errMsg, setErrMsg]           = useState('')

  function handleChange(key: PayslipRuleKey, value: string) {
    setOverrides(prev => ({ ...prev, [key]: value }))
    setStatus('idle')
  }

  function handleResetItem(key: PayslipRuleKey) {
    setOverrides(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setStatus('idle')
  }

  function handleResetAll() {
    setOverrides({})
    setStatus('idle')
  }

  async function handleSave() {
    setStatus('loading')
    setErrMsg('')
    const result = await updatePayslipNoteOverrides(overrides, companyId)
    if (!result.success) {
      setErrMsg(result.error ?? '오류가 발생했습니다')
      setStatus('error')
    } else {
      setStatus('success')
      setTimeout(() => setStatus('idle'), 2500)
    }
  }

  const overriddenCount = PAYSLIP_RULE_KEYS.filter(k => overrides[k]?.trim()).length

  return (
    <div className="space-y-3">
      {/* 안내 문구 */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-slate-500 leading-relaxed">
          항목별로 기본 원칙을 수정할 수 있습니다.
          수정하지 않은 항목은 시스템 기본값을 그대로 사용합니다.
          {overriddenCount > 0 && (
            <span className="ml-1.5 font-semibold text-blue-600">
              {overriddenCount}개 항목 수정됨
            </span>
          )}
        </p>
        {overriddenCount > 0 && (
          <button
            type="button"
            onClick={handleResetAll}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 whitespace-nowrap transition-colors"
          >
            <RotateCcw size={11} />
            전체 기본값으로
          </button>
        )}
      </div>

      {/* 항목별 카드 */}
      <div className="space-y-2">
        {PAYSLIP_RULE_KEYS.map(key => {
          const label       = PAYSLIP_RULE_LABELS[key]
          const defaultText = DEFAULT_PAYSLIP_RULES[key]
          const override    = overrides[key] ?? ''
          const isOverridden = override.trim().length > 0
          const isExpanded  = expandedKey === key

          return (
            <div
              key={key}
              className={cn(
                'rounded-xl border transition-colors overflow-hidden',
                isOverridden
                  ? 'border-blue-200 bg-blue-50/40'
                  : 'border-slate-200 bg-white',
              )}
            >
              {/* 항목 헤더 — 클릭 시 펼침/닫힘 */}
              <button
                type="button"
                onClick={() => setExpandedKey(isExpanded ? null : key)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isOverridden && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                  <span className={cn(
                    'text-sm font-semibold',
                    isOverridden ? 'text-blue-700' : 'text-slate-700',
                  )}>
                    {label}
                  </span>
                  {!isExpanded && (
                    <span className="text-xs text-slate-400 truncate hidden sm:block">
                      — {isOverridden ? override : defaultText}
                    </span>
                  )}
                </div>
                {isExpanded
                  ? <ChevronUp size={15} className="text-slate-400 flex-shrink-0" />
                  : <ChevronDown size={15} className="text-slate-400 flex-shrink-0" />
                }
              </button>

              {/* 펼쳐진 상세 */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2.5 border-t border-slate-100">
                  {/* 기본값 표시 */}
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      시스템 기본값
                    </p>
                    <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
                      {defaultText}
                    </p>
                  </div>

                  {/* 회사별 override 입력 */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      회사별 수정값
                      {isOverridden && (
                        <span className="ml-1.5 text-blue-500 normal-case font-normal">
                          (수정됨)
                        </span>
                      )}
                    </p>
                    <textarea
                      rows={2}
                      className="input text-xs leading-relaxed resize-none w-full"
                      placeholder={`비워두면 기본값 사용:\n${defaultText}`}
                      value={override}
                      onChange={e => handleChange(key, e.target.value)}
                    />
                  </div>

                  {/* 항목별 초기화 */}
                  {isOverridden && (
                    <button
                      type="button"
                      onClick={() => handleResetItem(key)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <RotateCcw size={11} />
                      이 항목 기본값으로 되돌리기
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 저장 버튼 영역 */}
      <div className="flex items-center justify-between pt-1">
        <div>
          {status === 'success' && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 size={13} />저장됨
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle size={13} />{errMsg}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={status === 'loading'}
          className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-60"
        >
          {status === 'loading' && <Loader2 size={13} className="animate-spin" />}
          저장
        </button>
      </div>
    </div>
  )
}
