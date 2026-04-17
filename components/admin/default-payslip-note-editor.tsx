'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react'
import { updateDefaultPayslipNote } from '@/lib/actions/app-settings-actions'
import { DEFAULT_PAYSLIP_NOTE_PLACEHOLDER } from '@/lib/payslip-defaults'

interface Props {
  initialNote: string | null
}

export function DefaultPayslipNoteEditor({ initialNote }: Props) {
  const [note, setNote]     = useState(initialNote ?? '')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function handleSave() {
    setStatus('loading')
    setErrMsg('')
    const result = await updateDefaultPayslipNote(note || null)
    if (!result.success) {
      setErrMsg(result.error ?? '오류가 발생했습니다')
      setStatus('error')
    } else {
      setStatus('success')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          여기서 저장한 내용이 <span className="font-semibold">모든 기업의 시스템 기본값</span>으로 사용됩니다.
          기업별 산출 근거가 별도로 설정된 경우에는 그 값이 우선 표시됩니다.
        </p>
      </div>
      <textarea
        className="input h-52 resize-y font-mono text-xs leading-relaxed"
        placeholder={DEFAULT_PAYSLIP_NOTE_PLACEHOLDER}
        value={note}
        onChange={e => { setNote(e.target.value); setStatus('idle') }}
      />
      <div className="flex items-center justify-between gap-2">
        <div>
          {note && (
            <button
              type="button"
              onClick={() => { setNote(''); setStatus('idle') }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <RotateCcw size={12} />
              초기화 (코드 기본값으로 복원)
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {note && (
            <span className="text-xs text-slate-400">
              {note.split('\n').filter(Boolean).length}개 항목
            </span>
          )}
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
