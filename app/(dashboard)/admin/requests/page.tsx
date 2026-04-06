'use client'

import { useState } from 'react'
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'pending' | 'approved' | 'rejected'

const mockRequests = [
  { id: 'r1', company: '브이에이성형외과', type: '신규 입사 신청', name: '홍길동', email: 'hong@va.kr', date: '2026-03-18', status: 'pending' as Status },
  { id: 'r2', company: '브이에이뷰티랩',   type: '신규 입사 신청', name: '김미래', email: 'kim@beauty.kr', date: '2026-03-17', status: 'pending' as Status },
  { id: 'r3', company: '핏에이치알',       type: '퇴사 통보',     name: '이철수', email: 'lee@fit.kr',  date: '2026-03-16', status: 'pending' as Status },
  { id: 'r4', company: '브이에이성형외과', type: '기업 가입 신청', name: '—',     email: 'new@corp.kr', date: '2026-03-15', status: 'pending' as Status },
  { id: 'r5', company: '핏에이치알',       type: '신규 입사 신청', name: '박수진', email: 'park@fit.kr', date: '2026-03-01', status: 'approved' as Status },
]

export default function AdminRequestsPage() {
  const [reqs, setReqs] = useState(mockRequests)
  const [tab, setTab] = useState<Status>('pending')
  const [expanded, setExpanded] = useState<string | null>(null)

  function handle(id: string, status: 'approved' | 'rejected') {
    setReqs(r => r.map(x => x.id === id ? { ...x, status } : x))
  }

  const filtered = reqs.filter(r => r.status === tab)

  const tabCounts: Record<Status, number> = {
    pending:  reqs.filter(r => r.status === 'pending').length,
    approved: reqs.filter(r => r.status === 'approved').length,
    rejected: reqs.filter(r => r.status === 'rejected').length,
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">서류 관리</h1>
        <p className="text-sm text-slate-500 mt-0.5">입사 신청, 퇴사 통보, 기업 가입 신청을 처리하세요</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['pending','대기중'],['approved','승인'],['rejected','거절']] as [Status,string][]).map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={cn('relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              tab === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
            {l}
            {tabCounts[v] > 0 && v === 'pending' && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {tabCounts[v]}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-slate-400 text-sm">항목이 없습니다</div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(req => (
            <div key={req.id} className="card overflow-hidden">
              <button
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(expanded === req.id ? null : req.id)}
              >
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-0.5',
                  req.status === 'pending' ? 'bg-amber-500' :
                  req.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-400')} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-900">{req.type}</span>
                    <span className="badge badge-gray">{req.company}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{req.name !== '—' ? req.name + ' · ' : ''}{req.email} · {req.date}</p>
                </div>
                {expanded === req.id ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
              </button>
              {expanded === req.id && req.status === 'pending' && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => { handle(req.id, 'approved'); setExpanded(null) }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <Check size={15} />
                      승인
                    </button>
                    <button
                      onClick={() => { handle(req.id, 'rejected'); setExpanded(null) }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <X size={15} />
                      거절
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
