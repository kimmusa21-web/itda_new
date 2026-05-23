'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'manager' | 'employee'

const TABS: { key: Tab; label: string }[] = [
  { key: 'manager',  label: '매니저' },
  { key: 'employee', label: '직원'   },
]

export function GuideClient() {
  const [tab, setTab] = useState<Tab>('manager')

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">사용 설명서</h1>
          <p className="text-sm text-slate-500 mt-0.5">ModuHR 서비스 이용 안내</p>
        </div>
        <a
          href="/ModuHR_사용설명서.pdf"
          download="ModuHR_사용설명서.pdf"
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
        >
          <Download size={13} />
          PDF 다운로드
        </a>
      </div>

      {/* 탭 */}
      <div className="flex gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-6 py-2.5 rounded-xl text-sm font-medium transition-all',
              tab === t.key
                ? 'bg-[#003366] text-white shadow-sm'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* PDF 뷰어 */}
      <div className="card overflow-hidden" style={{ height: 'calc(500dvh - 1200px)' }}>
        <iframe
          key={tab}
          src={`/ModuHR_사용설명서.pdf#toolbar=1&view=FitH`}
          className="w-full h-full border-0 rounded-2xl"
          title={tab === 'manager' ? '매니저 사용 설명서' : '직원 사용 설명서'}
        />
      </div>
    </div>
  )
}
