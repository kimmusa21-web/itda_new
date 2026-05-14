'use client'
/* ================================================================
   직원 서류신청 클라이언트 컴포넌트
================================================================ */

import { useState } from 'react'
import { FolderOpen, Plus, X, CheckCircle, Clock, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createDocumentRequest } from '@/lib/actions/document-request-actions'
import { DOCUMENT_TYPE_LABELS, type DocumentType } from '@/lib/document-types'

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
}

interface Props {
  requests:      DocRequest[]
  employeeName:  string
  hidePageTitle?: boolean
}

const STATUS_BADGE = {
  pending:  { label: '검토중',  cls: 'bg-amber-50 text-amber-700 border border-amber-200'  },
  approved: { label: '승인완료', cls: 'bg-green-50 text-green-700 border border-green-200' },
  rejected: { label: '반려됨',  cls: 'bg-red-50 text-red-700 border border-red-200'        },
}

const DIRECT_TYPES: DocumentType[] = ['employment_certificate', 'career_certificate']

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i)

export function DocumentsClient({ requests: initialRequests, employeeName, hidePageTitle }: Props) {
  const [requests, setRequests] = useState(initialRequests)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({
    document_type: 'employment_certificate' as DocumentType,
    purpose:       '',
    address:       '',
    note:          '',
    years:         [String(CURRENT_YEAR)],
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState(false)

  const isDirect  = DIRECT_TYPES.includes(form.document_type)
  const needsYear = form.document_type === 'withholding_tax'

  function toggleYear(y: string) {
    setForm(p => ({
      ...p,
      years: p.years.includes(y) ? p.years.filter(v => v !== y) : [...p.years, y],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.purpose.trim()) { setError('제출용도를 입력해주세요'); return }
    if (needsYear && form.years.length === 0) { setError('신청 연도를 하나 이상 선택해주세요'); return }

    setSubmitting(true)
    setError(null)
    const sortedYears  = [...form.years].sort()
    const noteWithYear = needsYear
      ? [`신청연도: ${sortedYears.join(', ')}`, form.note].filter(Boolean).join('\n')
      : form.note || undefined

    const res = await createDocumentRequest({
      document_type: form.document_type,
      purpose:       form.purpose,
      address:       form.address || undefined,
      note:          noteWithYear,
    })
    setSubmitting(false)

    if (!res.success) { setError(res.error ?? '오류가 발생했습니다'); return }

    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      setShowForm(false)
      setForm({ document_type: 'employment_certificate', purpose: '', address: '', note: '', years: [String(CURRENT_YEAR)] })
      window.location.reload()
    }, 1500)
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          {!hidePageTitle && (
            <h1 className="text-xl font-semibold text-slate-900">서류신청</h1>
          )}
          <p className="text-sm text-slate-500 mt-0.5">재직증명서, 원천징수영수증 등 서류를 신청합니다</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2 text-sm flex-shrink-0"
          >
            <Plus size={15} />서류 신청
          </button>
        )}
      </div>

      {/* 신청 폼 */}
      {showForm && (
        <div className="card p-5 border-blue-200 bg-blue-50/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <FolderOpen size={16} className="text-blue-500" />새 서류 신청
            </h2>
            <button onClick={() => { setShowForm(false); setError(null) }} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          {success ? (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl px-4 py-3">
              <CheckCircle size={16} />
              <span className="text-sm font-medium">신청이 접수되었습니다. 담당자 확인 후 처리됩니다.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 서류 종류 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  서류 종류 <span className="text-red-500">*</span>
                </label>
                <select
                  className="input"
                  value={form.document_type}
                  onChange={e => setForm(p => ({ ...p, document_type: e.target.value as DocumentType }))}
                >
                  {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map(k => (
                    <option key={k} value={k}>{DOCUMENT_TYPE_LABELS[k]}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  {isDirect
                    ? '✉ 승인 시 본인 이메일로 발급 문서가 발송됩니다'
                    : '✉ 승인 시 전담 세무사에게 발급 요청 이메일이 발송됩니다'}
                </p>
              </div>

              {/* 연도 선택 — 원천징수영수증(연도별)만 표시, 다중 선택 */}
              {needsYear && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    신청 연도 <span className="text-red-500">*</span>
                    <span className="ml-1.5 text-xs font-normal text-slate-400">복수 선택 가능</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {YEAR_OPTIONS.map(y => {
                      const val     = String(y)
                      const checked = form.years.includes(val)
                      return (
                        <button
                          key={y}
                          type="button"
                          onClick={() => toggleYear(val)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                            checked
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                          }`}
                        >
                          {y}년
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 제출용도 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  제출용도 <span className="text-red-500">*</span>
                </label>
                <input
                  className="input"
                  placeholder="예: 금융기관 제출용, 주택청약용"
                  value={form.purpose}
                  onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}
                />
              </div>

              {/* 주소 — 재직/경력증명서만 */}
              {isDirect && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    주소 <span className="text-xs text-slate-400">(증명서에 기재, 선택)</span>
                  </label>
                  <input
                    className="input"
                    placeholder="서울시 강남구 ..."
                    value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  />
                </div>
              )}

              {/* 메모 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  메모 <span className="text-xs text-slate-400">(선택)</span>
                </label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="추가 전달 사항이 있으면 입력해주세요"
                  value={form.note}
                  onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowForm(false); setError(null) }} className="btn-secondary">
                  취소
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
                  {submitting ? <><Loader2 size={14} className="animate-spin" />신청 중...</> : '신청하기'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 신청 내역 */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <p className="text-sm font-medium text-slate-700">신청 내역</p>
        </div>

        {requests.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FolderOpen size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">신청 내역이 없습니다</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {requests.map(r => {
              const badge  = STATUS_BADGE[r.status]
              const docLabel = DOCUMENT_TYPE_LABELS[r.document_type as DocumentType] ?? r.document_type
              const reqDate = new Date(r.requested_at).toLocaleDateString('ko-KR')
              return (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800 text-sm">{docLabel}</span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', badge.cls)}>
                          {badge.label}
                        </span>
                      </div>
                      {r.purpose && (
                        <p className="text-xs text-slate-500 mt-1">제출용도: {r.purpose}</p>
                      )}
                      {r.status === 'rejected' && r.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <XCircle size={11} />반려 사유: {r.rejection_reason}
                        </p>
                      )}
                      {r.status === 'approved' && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <CheckCircle size={11} />
                          {DIRECT_TYPES.includes(r.document_type as DocumentType)
                            ? '이메일로 발급 문서가 발송되었습니다'
                            : '세무사에게 발급 요청이 전달되었습니다'}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400">{reqDate}</p>
                      {r.status === 'pending' && (
                        <p className="text-xs text-amber-500 mt-0.5 flex items-center gap-0.5 justify-end">
                          <Clock size={10} />검토중
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
