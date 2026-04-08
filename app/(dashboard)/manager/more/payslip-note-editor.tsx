'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react'
import { updateCompanyPayslipNote } from '@/lib/actions/company-actions'
import { DEFAULT_PAYSLIP_NOTE_PLACEHOLDER } from '@/lib/payslip-defaults'

interface Props {
  initialNote: string | null
}

export function PayslipNoteEditor({ initialNote }: Props) {
  const [note, setNote]       = useState(initialNote ?? '')
  const [status, setStatus]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errMsg, setErrMsg]   = useState('')

  async function handleSave() {
    setStatus('loading')
    setErrMsg('')
    const result = await updateCompanyPayslipNote(note || null)
    if (!result.success) {
      setErrMsg(result.error ?? '오류가 발생했습니다')
      setStatus('error')
    } else {
      setStatus('success')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  function handleReset() {
    setNote('')
    setStatus('idle')
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        직원 급여명세서 하단에 표시되는 산출 기준 안내 문구입니다.
        비워두면 시스템 기본값이 사용됩니다. 줄바꿈으로 항목을 구분하세요.
      </p>
      <textarea
        className="input h-44 resize-y font-mono text-xs leading-relaxed"
        placeholder={DEFAULT_PAYSLIP_NOTE_PLACEHOLDER}
        value={note}
        onChange={e => { setNote(e.target.value); setStatus('idle') }}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {note && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <RotateCcw size={12} />
              초기화 (기본값 사용)
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
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
    </div>
  )
}
