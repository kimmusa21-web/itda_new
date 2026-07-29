'use client'

import { Info, TriangleAlert, ListOrdered } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GuideStep } from './types'

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮']

function circled(i: number) {
  return CIRCLED[i] ?? `(${i + 1})`
}

/** 목차 */
function Toc({ steps }: { steps: GuideStep[] }) {
  return (
    <nav className="card p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <ListOrdered size={14} className="text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-700">목차</h2>
      </div>
      <ol className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
            >
              <span className="mt-[1px] flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-semibold text-slate-500">
                {i + 1}
              </span>
              <span className="leading-snug">{s.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** 한 페이지 — 왼쪽 화면 그림 / 오른쪽 설명 */
function StepBlock({ step, index }: { step: GuideStep; index: number }) {
  return (
    <section id={step.id} className="card overflow-hidden scroll-mt-24 print:break-inside-avoid">
      {/* 제목 */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-[#003366] text-[11px] font-bold text-white">
          {index + 1}
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900">{step.title}</h3>
          {step.path && <p className="truncate text-[11px] text-slate-400">{step.path}</p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* 왼쪽 — 화면 그림 */}
        <div className="p-4 lg:p-5">{step.screen}</div>

        {/* 오른쪽 — 설명 */}
        <div className="space-y-2.5 border-t border-slate-100 bg-slate-50 p-4 lg:border-l lg:border-t-0 lg:p-5">
          <ul className="space-y-2.5">
            {step.notes.map((note, i) => (
              <li key={i} className="text-xs leading-relaxed text-slate-600">
                <span className="mr-1 font-semibold text-red-500">{circled(i)}</span>
                <span
                  className={cn(
                    note.strong &&
                      'font-semibold text-slate-900 underline decoration-slate-300 decoration-2 underline-offset-2',
                  )}
                >
                  {note.text}
                </span>
                {note.sub && (
                  <ul className="mt-1.5 space-y-1 pl-4">
                    {note.sub.map((s, j) => (
                      <li key={j} className="relative text-[11px] leading-relaxed text-slate-500 before:absolute before:-left-3 before:text-slate-300 before:content-['·']">
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {step.tip && (
            <div className="flex gap-1.5 rounded-lg border-l-[3px] border-blue-500 bg-blue-50 px-2.5 py-2">
              <Info size={12} className="mt-[2px] flex-shrink-0 text-blue-600" />
              <p className="text-[11px] leading-relaxed text-blue-900">{step.tip}</p>
            </div>
          )}
          {step.warn && (
            <div className="flex gap-1.5 rounded-lg border-l-[3px] border-amber-500 bg-amber-50 px-2.5 py-2">
              <TriangleAlert size={12} className="mt-[2px] flex-shrink-0 text-amber-600" />
              <p className="text-[11px] leading-relaxed text-amber-900">{step.warn}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function GuideView({ steps }: { steps: GuideStep[] }) {
  return (
    <div className="space-y-4">
      <Toc steps={steps} />
      {steps.map((s, i) => (
        <StepBlock key={s.id} step={s} index={i} />
      ))}
    </div>
  )
}
