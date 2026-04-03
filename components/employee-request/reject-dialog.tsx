'use client'

import { useState } from 'react'
import { X, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  employeeName: string
  onCancel: () => void
  onConfirm: (reason: string) => Promise<void>
}

const PRESETS = [
  '이미 동일 이메일로 계정이 존재합니다',
  '입력 정보가 누락되거나 잘못되었습니다. 재신청 바랍니다',
  '소속 회사 정보가 일치하지 않습니다',
  '급여 정보 확인이 필요합니다',
]

export function RejectDialog({ employeeName, onCancel, onConfirm }: Props) {
  const [reason,  setReason]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function selectPreset(p: string) {
    setReason(p)
    setError('')
  }

  async function handleSubmit() {
    if (!reason.trim()) {
      setError('거절 사유를 입력해주세요')
      return
    }
    setLoading(true)
    await onConfirm(reason.trim())
    setLoading(false)
  }

  return (
    /* 오버레이 */
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">

      {/* 카드 */}
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-xl">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <XCircle size={17} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">거절 처리</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                <span className="font-medium text-slate-700">{employeeName}</span>의 가입신청을 거절합니다
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg"
            aria-label="닫기"
          >
            <X size={17} />
          </button>
        </div>

        {/* 바디 */}
        <div className="px-5 py-4 space-y-4">
          {/* 빠른 선택 */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">빠른 선택</p>
            <div className="flex flex-col gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => selectPreset(p)}
                  className={cn(
                    'text-left text-xs px-3 py-2 rounded-xl border transition-all',
                    reason === p
                      ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* 직접 입력 */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              거절 사유 직접 입력 <span className="text-red-400">*</span>
            </label>
            <textarea
              className={cn(
                'w-full border rounded-xl px-3.5 py-2.5 text-sm resize-none h-[88px]',
                'placeholder:text-slate-400 focus:outline-none transition-colors',
                error
                  ? 'border-red-300 ring-1 ring-red-200'
                  : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
              )}
              placeholder="직원에게 전달될 거절 사유를 입력하세요 (최대 300자)"
              value={reason}
              maxLength={300}
              onChange={e => { setReason(e.target.value); setError('') }}
            />
            <div className="flex justify-between mt-1">
              {error
                ? <p className="text-[11px] text-red-500 font-medium">{error}</p>
                : <span />
              }
              <p className="text-[11px] text-slate-400 ml-auto">{reason.length}/300</p>
            </div>
          </div>

          {/* 경고 */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
            거절 후 해당 신청 건은 읽기 전용으로 전환됩니다. 신중하게 처리해주세요.
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex gap-2.5 px-5 pb-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95',
              reason.trim() && !loading
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed',
            )}
          >
            {loading ? (
              <><Loader2 size={15} className="animate-spin" />처리 중...</>
            ) : (
              <><XCircle size={15} />거절 확정</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
