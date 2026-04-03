'use client'

import { useState } from 'react'
import { ChevronDown, Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalculationNotesAccordionProps {
  notes: string[]
}

export function CalculationNotesAccordion({ notes }: CalculationNotesAccordionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="calc-notes-body"
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
      >
        <div className="flex items-center gap-2.5">
          <Calculator size={16} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">산출 근거 보기</span>
        </div>
        <ChevronDown
          size={16}
          className={cn(
            'text-slate-400 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Collapsible body */}
      <div
        id="calc-notes-body"
        role="region"
        className={cn(
          'overflow-hidden transition-all duration-300',
          open ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-2.5">
          {notes.map((note, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-blue-400 text-xs mt-0.5 shrink-0 font-bold">·</span>
              <p className="text-sm text-slate-600 leading-relaxed">{note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
