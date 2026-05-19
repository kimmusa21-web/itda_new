'use client'

import { useState, useRef } from 'react'
import { Upload, RotateCcw, Loader2, Check, AlertCircle } from 'lucide-react'
import { CompanySeal } from './company-seal'

interface Props {
  companyId:       number
  companyName:     string
  initialSealUrl?: string | null
}

export function CompanySealEditor({ companyId, companyName, initialSealUrl = null }: Props) {
  const [sealUrl, setSealUrl] = useState<string | null>(initialSealUrl)
  const [status,  setStatus]  = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [errMsg,  setErrMsg]  = useState<string>()
  const fileRef               = useRef<HTMLInputElement>(null)

  async function handleUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setStatus('error')
      setErrMsg('파일 크기는 5MB 이하여야 합니다')
      return
    }
    const allowed = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowed.includes(file.type)) {
      setStatus('error')
      setErrMsg('PNG, JPG, WEBP 파일만 가능합니다')
      return
    }

    setStatus('saving')
    setErrMsg(undefined)
    const fd = new FormData()
    fd.append('file', file)

    try {
      const res  = await fetch(`/api/company-seal/${companyId}`, { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) {
        setSealUrl(data.url)
        setStatus('ok')
        setTimeout(() => setStatus('idle'), 2000)
      } else {
        setStatus('error')
        setErrMsg(data.error ?? '업로드에 실패했습니다')
      }
    } catch {
      setStatus('error')
      setErrMsg('업로드에 실패했습니다')
    }
  }

  async function handleReset() {
    setStatus('saving')
    setErrMsg(undefined)
    try {
      const res = await fetch(`/api/company-seal/${companyId}`, { method: 'DELETE' })
      if (res.ok) {
        setSealUrl(null)
        setStatus('ok')
        setTimeout(() => setStatus('idle'), 2000)
      } else {
        setStatus('error')
        setErrMsg('초기화에 실패했습니다')
      }
    } catch {
      setStatus('error')
      setErrMsg('초기화에 실패했습니다')
    }
  }

  const isPending = status === 'saving'

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0">
      {/* 직인 미리보기 */}
      <div className="relative">
        {sealUrl ? (
          <img
            src={sealUrl}
            alt="회사 직인"
            className="w-24 h-24 object-contain"
          />
        ) : (
          <CompanySeal companyName={companyName} size={96} />
        )}
        {!sealUrl && (
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full whitespace-nowrap leading-none">
            자동 생성
          </span>
        )}
      </div>

      {/* 버튼 영역 */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isPending}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending && !sealUrl
            ? <Loader2 size={11} className="animate-spin" />
            : <Upload size={11} />
          }
          이미지 업로드
        </button>
        {sealUrl && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending
              ? <Loader2 size={11} className="animate-spin" />
              : <RotateCcw size={11} />
            }
            초기화
          </button>
        )}
      </div>

      {/* 상태 메시지 */}
      {status === 'ok' && (
        <span className="flex items-center gap-1 text-xs text-emerald-600">
          <Check size={11} /> 저장되었습니다
        </span>
      )}
      {status === 'error' && (
        <span className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle size={11} /> {errMsg}
        </span>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleUpload(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
