'use client'

import { useState } from 'react'
import { Columns, ChevronDown } from 'lucide-react'
import type { ColumnMapping, MappingGroup } from '@/types/payroll-upload'
import { cn } from '@/lib/utils'

interface Props {
  mappings:    ColumnMapping[]
  csvHeaders?: string[]
}

const GROUP_CONFIG: Record<MappingGroup, { label: string; bg: string; text: string }> = {
  meta:       { label: '기본 정보', bg: 'bg-slate-100',  text: 'text-slate-600'  },
  earnings:   { label: '지급 항목', bg: 'bg-blue-100',   text: 'text-blue-700'   },
  deductions: { label: '공제 항목', bg: 'bg-rose-100',   text: 'text-rose-700'   },
}

export function ColumnMappingCard({ mappings, csvHeaders }: Props) {
  const [open, setOpen] = useState(false)
  const matched  = csvHeaders ? mappings.filter(m => csvHeaders.includes(m.csv_column_name)) : mappings
  const required = mappings.filter(m => m.is_required)
  const missing  = csvHeaders ? required.filter(m => !csvHeaders.includes(m.csv_column_name)) : []

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors focus:outline-none"
      >
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Columns size={15} className="text-blue-500" />
          컬럼 매핑 확인
          <span className="text-xs font-normal text-slate-400">({matched.length}/{mappings.length}개)</span>
        </h2>
        <ChevronDown size={15} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {missing.length > 0 && (
        <div className="px-5 pb-3">
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
            필수 컬럼 누락: {missing.map(m => m.csv_column_name).join(', ')}
          </div>
        </div>
      )}

      {open && (
        <div className="border-t border-slate-100 max-h-56 overflow-y-auto">
          {(['meta','earnings','deductions'] as MappingGroup[]).map(group => {
            const cols = matched.filter(m => m.group_type === group)
            if (!cols.length) return null
            const cfg = GROUP_CONFIG[group]
            return (
              <div key={group}>
                <div className={cn('px-5 py-1.5 flex items-center gap-2', cfg.bg)}>
                  <span className={cn('text-[10px] font-bold uppercase tracking-wider', cfg.text)}>{cfg.label}</span>
                  <span className="text-[10px] text-slate-400">{cols.length}개</span>
                </div>
                {cols.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-2 border-b border-slate-50">
                    <code className="text-xs font-mono text-slate-500 w-36 shrink-0 truncate">{m.csv_column_name}</code>
                    <span className="text-slate-300 text-xs">→</span>
                    <span className="text-xs text-slate-700 flex-1">{m.label_ko}</span>
                    {m.is_required && <span className="text-[10px] font-bold text-red-400 shrink-0">필수</span>}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
