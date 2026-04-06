'use client'
import { useRef, useState } from 'react'
import { Upload, FileText, X, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type DropStatus = 'idle' | 'parsing' | 'done'

interface Props {
  fileName:  string
  status:    DropStatus
  onFile:    (file: File) => void
  onClear:   () => void
}

export function FileDropzone({ fileName, status, onFile, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) onFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  const borderClass =
    status === 'done'    ? 'border-emerald-400 bg-emerald-50/20' :
    status === 'parsing' ? 'border-amber-400 bg-amber-50/20' :
    dragging             ? 'border-blue-500 bg-blue-50/40 scale-[1.01]' :
    'border-slate-200 hover:border-blue-400 hover:bg-blue-50/20'

  return (
    <div className="card p-5 space-y-3">
      <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
        <Upload size={15} className="text-blue-500" />파일 업로드
      </h2>

      <div
        role="button" tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn('border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all', borderClass)}
      >
        <div className="flex flex-col items-center gap-2.5">
          {status === 'done'    ? <CheckCircle2 size={28} className="text-emerald-500" /> :
           status === 'parsing' ? <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /> :
           <FileText size={28} className={fileName ? 'text-blue-400' : 'text-slate-300'} />}
          <div>
            <p className="text-sm font-medium text-slate-700">
              {status === 'idle'    ? 'CSV 파일을 드래그하거나 클릭' :
               status === 'parsing' ? 'CSV 파싱 중...' : '파싱 완료'}
            </p>
            {fileName
              ? <p className="text-xs text-slate-400 mt-1 font-mono">{fileName}</p>
              : <p className="text-xs text-slate-400 mt-1">UTF-8 인코딩 CSV 파일</p>}
          </div>
        </div>
        <input ref={inputRef} type="file" accept=".csv" className="sr-only" onChange={handleChange} />
      </div>

      {fileName && status !== 'idle' && (
        <button onClick={onClear}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors ml-auto">
          <X size={13} />파일 제거
        </button>
      )}
    </div>
  )
}
