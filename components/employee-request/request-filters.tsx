'use client'

import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FilterTab = 'all' | 'pending' | 'approved' | 'rejected'

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'pending',  label: '대기'   },
  { key: 'approved', label: '승인'   },
  { key: 'rejected', label: '거절'   },
  { key: 'all',      label: '전체'   },
]

interface Props {
  tab: FilterTab
  onTabChange: (t: FilterTab) => void
  search: string
  onSearchChange: (s: string) => void
  companyFilter: string
  onCompanyChange: (c: string) => void
  companies: string[]
  resultCount: number
}

export function RequestFilters({
  tab, onTabChange,
  search, onSearchChange,
  companyFilter, onCompanyChange,
  companies,
  resultCount,
}: Props) {
  return (
    <div className="space-y-3">
      {/* 상태 탭 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              tab === t.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 검색 + 회사 필터 */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            className="input pl-9 text-sm"
            placeholder="이름·이메일·회사명 검색"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="검색어 지우기"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          className="input w-44 text-sm"
          value={companyFilter}
          onChange={e => onCompanyChange(e.target.value)}
        >
          <option value="">전체 회사</option>
          {companies.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* 결과 수 */}
      <p className="text-xs text-slate-400">{resultCount}건</p>
    </div>
  )
}
