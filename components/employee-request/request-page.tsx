'use client'
/* ================================================================
   RequestPage — 승인 시 employees 생성 포함 (최종본)
================================================================ */

import { useState, useMemo, useTransition } from 'react'
import { CheckCircle2, XCircle, X, Loader2, UserPlus } from 'lucide-react'
import type { EmployeeRequest, EmployeeRequestStatus } from '@/types/employee-request'
import {
  approveEmployeeRequestWithEmployeeCreate,
  rejectEmployeeRequest,
  getEmployeeRequests,
} from '@/lib/employee-requests'
import { RequestSummaryCards }            from './request-summary-cards'
import { RequestFilters, type FilterTab } from './request-filters'
import { RequestList }                    from './request-list'
import { RequestDetailPanel }             from './request-detail-panel'
import { cn } from '@/lib/utils'

/* ── Toast ─────────────────────────────────────────────── */
interface Toast {
  id:       string
  type:     'success' | 'error' | 'warning'
  title:    string
  body:     string
  icon?:    'user-plus'
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  function add(type: Toast['type'], title: string, body: string, icon?: Toast['icon']) {
    const id = crypto.randomUUID()
    setToasts(p => [...p, { id, type, title, body, icon }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000)
  }
  function remove(id: string) { setToasts(p => p.filter(t => t.id !== id)) }
  return { toasts, add, remove }
}

/* ── Props ────────────────────────────────────────────── */
interface Props {
  initialRequests: EmployeeRequest[]
  currentUserId:   string
}

export function RequestPage({ initialRequests, currentUserId }: Props) {
  const [requests,   setRequests]   = useState<EmployeeRequest[]>(initialRequests)
  const [tab,        setTab]        = useState<FilterTab>('pending')
  const [search,     setSearch]     = useState('')
  const [company,    setCompany]    = useState('')
  const [selected,   setSelected]   = useState<EmployeeRequest | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const { toasts, add: toast, remove } = useToast()
  const [isPending, startTransition]   = useTransition()

  /* ── 서버 재조회 ─────────────────────────────────────── */
  function refreshRequests(forStatus?: FilterTab) {
    const status = forStatus ?? tab
    startTransition(async () => {
      const fresh = await getEmployeeRequests({
        status: status === 'all' ? undefined : status as EmployeeRequestStatus,
      })
      setRequests(fresh)
    })
  }

  /* ── 낙관적 업데이트 ────────────────────────────────── */
  function optimisticUpdate(id: string, patch: Partial<EmployeeRequest>) {
    setRequests(p => p.map(r => r.id === id ? { ...r, ...patch } : r))
    setSelected(p => p?.id === id ? { ...p, ...patch } : p)
  }

  /* ── 승인 + employees 생성 ──────────────────────────── */
  async function handleApprove(id: string) {
    const now = new Date().toISOString()
    // 낙관적 반영
    optimisticUpdate(id, { status: 'approved', reviewedAt: now, reviewedBy: currentUserId })

    const result = await approveEmployeeRequestWithEmployeeCreate(Number(id))

    if (result.success) {
      const req = requests.find(r => r.id === id)
      toast(
        'success',
        '승인 완료 — 직원 생성됨',
        `${req?.name ?? ''}의 가입신청이 승인되었습니다. employees에 직원이 등록되었습니다 (id: ${result.employeeId}).`,
        'user-plus',
      )
      refreshRequests()
    } else if (result.isDuplicate) {
      // 롤백
      optimisticUpdate(id, { status: 'pending', reviewedAt: undefined, reviewedBy: undefined })
      toast('warning', '중복 직원 감지', result.error ?? '이미 등록된 직원입니다')
    } else {
      optimisticUpdate(id, { status: 'pending', reviewedAt: undefined, reviewedBy: undefined })
      toast('error', '처리 실패', result.error ?? '승인 중 오류가 발생했습니다')
    }
  }

  /* ── 거절 ──────────────────────────────────────────── */
  async function handleReject(id: string, reason: string) {
    const now = new Date().toISOString()
    optimisticUpdate(id, { status: 'rejected', rejectionReason: reason, reviewedAt: now, reviewedBy: currentUserId })

    const result = await rejectEmployeeRequest(Number(id), reason)

    if (result.success) {
      toast('success', '거절 처리 완료', '가입신청이 거절되었습니다. employees에는 등록되지 않았습니다.')
      refreshRequests()
    } else {
      optimisticUpdate(id, { status: 'pending', rejectionReason: undefined, reviewedAt: undefined })
      toast('error', '처리 실패', result.error ?? '거절 중 오류가 발생했습니다')
    }
  }

  /* ── 필터 ───────────────────────────────────────────── */
  const companies = useMemo(
    () => [...new Set(requests.map(r => r.companyName))].sort(),
    [requests],
  )

  const filtered = useMemo(() => {
    return requests
      .filter(r => tab === 'all' || r.status === tab)
      .filter(r => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return r.name.includes(q) || r.email.toLowerCase().includes(q) || r.companyName.includes(q)
      })
      .filter(r => !company || r.companyName === company)
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1
        if (b.status === 'pending' && a.status !== 'pending') return  1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }, [requests, tab, search, company])

  function handleTabChange(t: FilterTab) {
    setTab(t); setSelected(null); setShowDetail(false); refreshRequests(t)
  }

  return (
    <div className="space-y-5">

      {/* ── Toast ── */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-84 max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={cn(
            'flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-lg border pointer-events-auto',
            t.type === 'success' ? 'bg-emerald-600 border-emerald-500' :
            t.type === 'warning' ? 'bg-amber-600 border-amber-500' :
            'bg-red-600 border-red-500',
          )}>
            {t.type === 'success'
              ? (t.icon === 'user-plus'
                  ? <UserPlus  size={17} className="text-white flex-shrink-0 mt-0.5" />
                  : <CheckCircle2 size={17} className="text-white flex-shrink-0 mt-0.5" />)
              : t.type === 'warning'
              ? <span className="text-white text-sm flex-shrink-0 mt-0.5 font-bold">!</span>
              : <XCircle size={17} className="text-white flex-shrink-0 mt-0.5" />
            }
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{t.title}</p>
              <p className="text-xs text-white/80 mt-0.5 leading-relaxed">{t.body}</p>
            </div>
            <button onClick={() => remove(t.id)} className="text-white/70 hover:text-white mt-0.5 flex-shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* ── 헤더 ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400 mb-1">어드민 › 사용자 관리</p>
          <h1 className="text-2xl font-bold text-slate-900">직원 가입신청 승인</h1>
          <p className="text-sm text-slate-500 mt-1">
            승인 시 employees 테이블에 직원 정보가 자동으로 생성됩니다
          </p>
        </div>
        {isPending && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 flex-shrink-0">
            <Loader2 size={13} className="animate-spin" />목록 갱신 중
          </div>
        )}
      </div>

      {/* ── 요약 카드 ── */}
      <RequestSummaryCards
        requests={requests}
        activeStatus={tab}
        onStatusChange={s => handleTabChange(s as FilterTab)}
      />

      {/* ── 2단 레이아웃 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5 items-start">
        <div className={cn('space-y-4', showDetail && 'hidden lg:block')}>
          <RequestFilters
            tab={tab} onTabChange={handleTabChange}
            search={search} onSearchChange={setSearch}
            companyFilter={company} onCompanyChange={setCompany}
            companies={companies} resultCount={filtered.length}
          />
          <RequestList requests={filtered} selectedId={selected?.id ?? null} onSelect={r => { setSelected(r); setShowDetail(true) }} />
        </div>
        <div className={cn('lg:sticky lg:top-6', !showDetail && 'hidden lg:block')}>
          {selected ? (
            <RequestDetailPanel
              request={selected}
              onBack={() => setShowDetail(false)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center h-72 bg-white rounded-2xl border border-dashed border-slate-200">
              <div className="text-4xl mb-4">👤</div>
              <p className="text-sm font-medium text-slate-500">신청 건을 선택하면</p>
              <p className="text-sm text-slate-400">상세 정보가 여기에 표시됩니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
