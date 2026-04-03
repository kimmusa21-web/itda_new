'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Eye } from 'lucide-react'
import type { PreviewRow } from '@/types/payroll-upload'
import { formatKRW, cn } from '@/lib/utils'

interface Props { previews: PreviewRow[] }

const STATUS_CFG = {
  valid:   { label: '정상',  badge: 'badge-green'  },
  error:   { label: '오류',  badge: 'badge-red'    },
  ignored: { label: '무시됨', badge: 'badge-yellow' },
}

export function PayrollPreviewList({ previews }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [showAll,  setShowAll]  = useState(false)

  const visible = showAll
    ? previews
    : previews.filter(p => p.status !== 'error').slice(0, 5)

  function toggle(i: number) {
    setExpanded(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Eye size={14} className="text-blue-500" />미리보기
        </h2>
        <span className="text-xs text-slate-400">유효 {previews.filter(p=>p.status==='valid').length}건</span>
      </div>
      <div className="divide-y divide-slate-50">
        {visible.map(p => {
          const cfg = STATUS_CFG[p.status]
          const isExp = expanded.has(p.rowIndex)
          return (
            <div key={p.rowIndex}>
              <button
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50/70 transition-colors"
                onClick={() => toggle(p.rowIndex)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-slate-900">{p.employeeName}</span>
                    <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{p.email}</p>
                </div>
                {p.status === 'valid' && (
                  <div className="text-right mr-2 shrink-0">
                    <p className="text-sm font-bold text-blue-600 tabular-nums">{formatKRW(p.netPay)}</p>
                    <p className="text-[10px] text-slate-400">실수령액</p>
                  </div>
                )}
                {isExp ? <ChevronUp size={14} className="text-slate-300 shrink-0" /> : <ChevronDown size={14} className="text-slate-300 shrink-0" />}
              </button>
              {isExp && p.status === 'valid' && (
                <div className="px-5 pb-4 border-t border-slate-100 bg-white">
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1.5">지급 항목</p>
                      {Object.entries(p.earnings).map(([k,v]) => (
                        <div key={k} className="flex justify-between text-xs py-0.5">
                          <span className="text-slate-500">{k}</span>
                          <span className="font-medium text-slate-800 tabular-nums">{formatKRW(v)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs font-bold border-t pt-1 mt-1">
                        <span className="text-blue-600">지급합계</span>
                        <span className="text-blue-600 tabular-nums">{formatKRW(p.totalEarnings)}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1.5">공제 항목</p>
                      {Object.entries(p.deductions).map(([k,v]) => (
                        <div key={k} className="flex justify-between text-xs py-0.5">
                          <span className="text-slate-500">{k}</span>
                          <span className="font-medium text-rose-600 tabular-nums">-{formatKRW(v)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs font-bold border-t pt-1 mt-1">
                        <span className="text-rose-600">공제합계</span>
                        <span className="text-rose-600 tabular-nums">-{formatKRW(p.totalDeductions)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t">
                    <span className="text-sm font-bold text-slate-700">실수령액</span>
                    <span className="text-lg font-bold text-blue-600 tabular-nums">{formatKRW(p.netPay)}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {previews.length > 5 && (
        <div className="px-5 py-3 border-t border-slate-100 text-center">
          <button onClick={() => setShowAll(!showAll)} className="text-xs text-blue-600 hover:underline">
            {showAll ? '접기' : `전체 ${previews.length}건 보기`}
          </button>
        </div>
      )}
    </div>
  )
}
