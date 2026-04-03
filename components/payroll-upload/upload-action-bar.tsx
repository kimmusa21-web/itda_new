import { RefreshCw, ShieldCheck, Upload, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Phase = 'idle' | 'validated' | 'uploading' | 'done'

interface Props {
  phase: Phase
  canValidate: boolean
  canUpload: boolean
  onReset: () => void
  onValidate: () => void
  onConfirm: () => void
}

export function UploadActionBar({
  phase, canValidate, canUpload,
  onReset, onValidate, onConfirm,
}: Props) {
  return (
    <div className="card p-4">
      {/* Progress indicator */}
      <div className="flex items-center gap-0 mb-4 text-xs">
        {[
          { label: '설정', done: phase !== 'idle' },
          { label: '검증', done: phase === 'validated' || phase === 'done' },
          { label: '확정', done: phase === 'done' },
        ].map((step, i) => (
          <div key={step.label} className="flex items-center flex-1">
            <div className={cn(
              'flex-1 flex flex-col items-center gap-1',
              step.done ? 'text-emerald-600' : 'text-slate-400',
            )}>
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                step.done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500',
              )}>
                {step.done ? '✓' : i + 1}
              </div>
              <span className="font-medium">{step.label}</span>
            </div>
            {i < 2 && <div className={cn('h-0.5 flex-1 mx-1 transition-colors', step.done ? 'bg-emerald-300' : 'bg-slate-200')} />}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Reset */}
        <button onClick={onReset}
          className="btn-secondary flex items-center gap-1.5 px-3">
          <RefreshCw size={14} />
          <span className="hidden sm:inline">다시</span>
        </button>

        {/* Validate */}
        {phase !== 'done' && (
          <button
            onClick={onValidate}
            disabled={!canValidate || phase === 'uploading'}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
              canValidate && phase !== 'uploading'
                ? 'bg-slate-800 text-white hover:bg-slate-900 active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed',
            )}
          >
            <ShieldCheck size={16} />
            검증하기
            {!canValidate && <span className="text-xs font-normal">(설정·파일 필요)</span>}
          </button>
        )}

        {/* Confirm upload */}
        <button
          onClick={onConfirm}
          disabled={!canUpload || phase === 'uploading' || phase === 'done'}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
            canUpload && phase !== 'uploading' && phase !== 'done'
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed',
          )}
        >
          {phase === 'uploading' ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              업로드 중...
            </>
          ) : phase === 'done' ? (
            <><CheckCircle2 size={16} />완료</>
          ) : (
            <><Upload size={16} />업로드 확정</>
          )}
          {phase === 'validated' && !canUpload && (
            <span className="text-xs font-normal">(오류 해결 필요)</span>
          )}
        </button>
      </div>
    </div>
  )
}
