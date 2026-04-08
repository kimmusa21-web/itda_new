'use client'
/* ================================================================
   PayrollNoteAccordion — 급여명세서 산출 근거 아코디언
   payslip-detail-v2 / payslip-inline-detail 양쪽에서 공용 사용
================================================================ */

import { useState } from 'react'
import { ChevronDown, ChevronUp, Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  notes: string[]
  defaultOpen?: boolean
  /** 카드 래퍼 포함 여부 (inline-detail에서는 card 래퍼 필요) */
  withCard?: boolean
}

export function PayrollNoteAccordion({ notes, defaultOpen = false, withCard = true }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  const trigger = (
    <button
      onClick={() => setOpen(o => !o)}
      aria-expanded={open}
      className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
    >
      <div className="flex items-center gap-2">
        <Calculator size={14} className="text-slate-400" />
        <span className="text-sm font-semibold text-slate-700">산출 근거</span>
      </div>
      {open
        ? <ChevronUp size={16} className="text-slate-400" />
        : <ChevronDown size={16} className="text-slate-400" />
      }
    </button>
  )

  const body = open && (
    <div className="border-t border-slate-100 px-5 py-4 space-y-2.5">
      {notes.map((note, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <span className="text-blue-400 text-xs mt-0.5 shrink-0 font-bold select-none">·</span>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{note}</p>
        </div>
      ))}
    </div>
  )

  if (!withCard) {
    return (
      <div>
        {trigger}
        {body}
      </div>
    )
  }

  return (
    <div className={cn('card overflow-hidden')}>
      {trigger}
      {body}
    </div>
  )
}
