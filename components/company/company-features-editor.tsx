'use client'

import { useState, useTransition } from 'react'
import { ToggleLeft, ToggleRight, Loader2, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type CompanyFeatures,
  type FeatureKey,
  FEATURE_DEFS,
  FEATURE_KEYS,
  parseFeatures,
} from '@/lib/features'
import { updateCompanyFeatures } from '@/lib/actions/company-actions'

interface Props {
  companyId:       number
  initialFeatures: Record<string, boolean> | null
}

export function CompanyFeaturesEditor({ companyId, initialFeatures }: Props) {
  const parsed = parseFeatures(initialFeatures)
  const [features, setFeatures]     = useState<CompanyFeatures>(parsed)
  const [savedFeatures, setSaved]   = useState<CompanyFeatures>(parsed)  // 마지막 저장 기준
  const [status, setStatus]         = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg]     = useState<string>()
  const [pending, startTransition]  = useTransition()

  function toggle(key: FeatureKey) {
    if (FEATURE_DEFS[key].required) return
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }))
    setStatus('idle')
  }

  function save() {
    setStatus('saving')
    setErrorMsg(undefined)
    startTransition(async () => {
      const res = await updateCompanyFeatures(companyId, features)
      if (res.success) {
        setSaved({ ...features })   // 저장 기준점 갱신
        setStatus('ok')
        setTimeout(() => setStatus('idle'), 2000)
      } else {
        setStatus('error')
        setErrorMsg(res.error)
      }
    })
  }

  const isDirty = FEATURE_KEYS.some(k => features[k] !== savedFeatures[k])

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-slate-100">
        {FEATURE_KEYS.map(key => {
          const def     = FEATURE_DEFS[key]
          const enabled = features[key]
          return (
            <li key={key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{def.label}</span>
                  {def.required && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      기본
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{def.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                onClick={() => toggle(key)}
                disabled={def.required || pending}
                aria-checked={enabled}
                className={cn(
                  'flex-shrink-0 transition-colors',
                  def.required
                    ? 'cursor-default opacity-60'
                    : 'cursor-pointer hover:opacity-80',
                )}
              >
                {enabled ? (
                  <ToggleRight
                    size={32}
                    className={cn(
                      'transition-colors',
                      def.required ? 'text-slate-400' : 'text-blue-500',
                    )}
                  />
                ) : (
                  <ToggleLeft size={32} className="text-slate-300" />
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        {status === 'ok' && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600">
            <Check size={13} /> 저장되었습니다
          </span>
        )}
        {status === 'error' && (
          <span className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle size={13} /> {errorMsg ?? '저장에 실패했습니다'}
          </span>
        )}
        {(status === 'idle' || status === 'saving') && <span />}

        <button
          type="button"
          onClick={save}
          disabled={pending || status === 'saving' || (!isDirty && status !== 'error')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            isDirty || status === 'error'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-100 text-slate-400 cursor-default',
          )}
        >
          {(pending || status === 'saving') && <Loader2 size={12} className="animate-spin" />}
          저장
        </button>
      </div>
    </div>
  )
}
