'use client'
/* ================================================================
   매니저 서류관리 클라이언트 컴포넌트
   - 서류신청 목록 조회
   - 승인 (이메일 발송) / 반려 처리
================================================================ */

import { useState } from 'react'
import {
  FolderOpen, CheckCircle, XCircle, Clock,
  AlertCircle, Loader2, ChevronDown, Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  approveDocumentRequest,
  rejectDocumentRequest,
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
} from '@/lib/actions/document-request-actions'

interface Employee { id: number; name: string; email: string; department: string | null; position: string | null }

interface DocRequest {
  id:               number
  document_type:    string
  purpose:          string | null
  address:          string | null
  note:             string | null
  status:           'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  requested_at:     string
  approved_at:      string | null
  rejected_at:      string | null
  employees:        Employee | null
}

interface Props {
  requests:        DocRequest[]
  hasTaxAccountant: boolean
}

type Tab = 'pending' | 'done'

const STATUS_BADGE = {
  pending:  { label: '검토중',  cls: 'bg-amber-50 text-amber-700 border border-amber-200'  },
  approved: { label: '승인완료', cls: 'bg-green-50 text-green-700 border border-green-200' },
  rejected: { label: '반려됨',  cls: 'bg-red-50 text-red-700 border border-red-200'        },
}

const DIRECT_TYPES: DocumentType[] = ['employment_certificate', 'career_certificate']

export function ManagerDocumentsClient({ requests: initialRequests, hasTaxAccountant }: Props) {
  const [requests, setRequests] = useState(initialRequests)
  const [tab, setTab]           = useState<Tab>('pending')
  const [processing, setProcessing] = useState<number | null>(null)
  const [rejectId, setRejectId]     = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null)

  const pending = requests.filter(r => r.status === 'pending')
  const done    = requests.filter(r => r.status !== 'pending')

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleApprove(id: number) {
    setProcessing(id)
    const res = await approveDocumentRequest(id)
    setProcessing(null)
    if (!res.success) { showToast(res.error ?? '오류가 발생했습니다', false); return }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved', approved_at: new Date().toISOString() } : r))
    showToast('승인 완료 — 이메일이 발송되었습니다')
  }

  async function handleReject() {
    if (!rejectId) return
    setProcessing(rejectId)
    const res = await rejectDocumentRequest(rejectId, rejectReason)
    setProcessing(null)
    if (!res.success) { showToast(res.error ?? '오류가 발생했습니다', false); return }
    setRequests(prev => prev.map(r => r.id === rejectId ? { ...r, status: 'rejected', rejection_reason: rejectReason, rejected_at: new Date().toISOString() } : r))
    setRejectId(null)
    setRejectReason('')
    showToast('반려 처리되었습니다')
  }

  const list = tab === 'pending' ? pending : done

  return (
    <div className="space-y-5 max-w-3xl">

      {/* 세무사 미등록 안내 */}
      {!hasTaxAccountant && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            세무사/회계사 이메일이 미등록 상태입니다.
            원천징수영수증 등 세무 서류 승인 시 이메일 발송이 불가합니다.{' '}
            <a href="/manager/company" className="underline font-medium">기업관리 → 세무사 정보 등록</a>
          </p>
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['pending', `검토중 ${pending.length}`], ['done', `처리완료 ${done.length}`]] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div className="card overflow-hidden">
        {list.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FolderOpen size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{tab === 'pending' ? '검토 대기 중인 신청이 없습니다' : '처리된 신청이 없습니다'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map(r => {
              const emp      = r.employees
              const badge    = STATUS_BADGE[r.status]
              const docLabel = DOCUMENT_TYPE_LABELS[r.document_type as DocumentType] ?? r.document_type
              const isDirect = DIRECT_TYPES.includes(r.document_type as DocumentType)
              const reqDate  = new Date(r.requested_at).toLocaleDateString('ko-KR')
              const isProc   = processing === r.id

              return (
                <li key={r.id} className="px-5 py-4">
                  {/* 상단: 직원 + 서류 + 상태 */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">
                          {emp?.name ?? '—'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {[emp?.department, emp?.position].filter(Boolean).join(' · ')}
                        </span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', badge.cls)}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {docLabel}
                        </span>
                        {r.purpose && (
                          <span className="text-xs text-slate-500">제출용도: {r.purpose}</span>
                        )}
                      </div>

                      {r.address && (
                        <p className="text-xs text-slate-400 mt-1">주소: {r.address}</p>
                      )}
                      {r.note && (
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <Info size={10} />메모: {r.note}
                        </p>
                      )}

                      {/* 발급 경로 안내 */}
                      <p className="text-xs text-slate-400 mt-1">
                        {isDirect
                          ? `✉ 승인 시 ${emp?.email ?? '직원'} 이메일로 발송`
                          : hasTaxAccountant
                            ? '✉ 승인 시 세무사 이메일로 발급 요청'
                            : '⚠ 세무사 이메일 미등록 — 승인 불가'}
                      </p>

                      {r.status === 'rejected' && r.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1">반려 사유: {r.rejection_reason}</p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400">{reqDate}</p>
                      {emp?.email && (
                        <p className="text-xs text-slate-300 mt-0.5 truncate max-w-[140px]">{emp.email}</p>
                      )}
                    </div>
                  </div>

                  {/* 액션 버튼 — 검토중일 때만 */}
                  {r.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleApprove(r.id)}
                        disabled={isProc || (!isDirect && !hasTaxAccountant)}
                        className={cn(
                          'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                          (!isDirect && !hasTaxAccountant)
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700',
                        )}
                      >
                        {isProc
                          ? <><Loader2 size={12} className="animate-spin" />처리중</>
                          : <><CheckCircle size={12} />승인</>}
                      </button>
                      <button
                        onClick={() => { setRejectId(r.id); setRejectReason('') }}
                        disabled={isProc}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <XCircle size={12} />반려
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* 반려 사유 모달 */}
      {rejectId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-slate-900 mb-1">반려 사유 입력</h3>
            <p className="text-xs text-slate-400 mb-4">반려 사유를 직원에게 안내하기 위해 입력해주세요 (선택)</p>
            <textarea
              className="input resize-none w-full"
              rows={3}
              placeholder="반려 사유 (선택 입력)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setRejectId(null); setRejectReason('') }}
                className="btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={processing !== null}
                className="flex-1 bg-red-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                {processing !== null
                  ? <><Loader2 size={14} className="animate-spin" />처리중</>
                  : '반려 처리'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-full shadow-lg text-sm font-medium z-50 transition-all',
          toast.ok ? 'bg-slate-900 text-white' : 'bg-red-600 text-white',
        )}>
          {toast.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
