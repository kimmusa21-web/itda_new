'use client'
/* ================================================================
   AdminCompanies — 클라이언트 목록 컴포넌트
   검색, 상태 필터, 삭제 확인 모달 포함
================================================================ */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Search, Edit2, Trash2, Users } from 'lucide-react'
import { deleteCompany } from '@/lib/actions/company-actions'
import { cn } from '@/lib/utils'

interface CompanyRow {
  id: number
  name: string
  biz_number: string | null
  representative: string | null
  contact_name: string | null
  contact_email: string | null
  'Business type': string | null
  Industry: string | null
  Telephone: string | null
  address: string | null
  status: string
  employees?: { count: number }[]
}

interface Props {
  initialCompanies: CompanyRow[]
}

type StatusFilter = 'all' | 'active' | 'inactive'

export function CompanyListClient({ initialCompanies }: Props) {
  const router = useRouter()
  const [companies, setCompanies] = useState(initialCompanies)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [deleteTarget, setDeleteTarget] = useState<CompanyRow | null>(null)
  const [deleting, setDeleting]   = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [, startTransition]       = useTransition()

  /* ── 필터링 ──────────────────────────────────────────── */
  const filtered = companies.filter(c => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.biz_number ?? '').includes(search) ||
      (c.representative ?? '').includes(search)
    const matchStatus =
      statusFilter === 'all' ? true : c.status === statusFilter
    return matchSearch && matchStatus
  })

  /* ── 삭제 처리 ────────────────────────────────────────── */
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')

    const result = await deleteCompany(deleteTarget.id)
    if (!result.success) {
      setDeleteError(result.error ?? '삭제 중 오류가 발생했습니다')
      setDeleting(false)
      return
    }

    // 목록에서 즉시 제거
    setCompanies(prev => prev.filter(c => c.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
    startTransition(() => router.refresh())
  }

  return (
    <>
      {/* 검색 + 필터 */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="회사명, 사업자번호, 대표자 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {([['active', '운영중'], ['inactive', '비활성'], ['all', '전체']] as [StatusFilter, string][]).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                statusFilter === v
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-slate-400 text-sm">
          {search ? '검색 결과가 없습니다' : '등록된 기업이 없습니다'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const empCount = c.employees?.[0]?.count ?? 0
            return (
              <div key={c.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Building2 size={18} className="text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                        <span className={cn(
                          'badge text-xs',
                          c.status === 'active' ? 'badge-green' : 'badge-gray',
                        )}>
                          {c.status === 'active' ? '운영중' : '비활성'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Users size={11} className="text-slate-400" />
                        <span className="text-xs text-slate-400">직원 {empCount}명</span>
                      </div>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => router.push(`/admin/companies/${c.id}/edit`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <Edit2 size={12} />수정
                    </button>
                    <button
                      onClick={() => { setDeleteTarget(c); setDeleteError('') }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={12} />삭제
                    </button>
                  </div>
                </div>

                {/* 상세 정보 */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {c.biz_number     && <InfoRow label="사업자번호"   value={c.biz_number} />}
                  {c.representative && <InfoRow label="대표자"       value={c.representative} />}
                  {c.contact_name   && <InfoRow label="담당자"       value={c.contact_name} />}
                  {c.contact_email  && <InfoRow label="담당자 이메일" value={c.contact_email} />}
                  {c['Business type'] && <InfoRow label="업태"       value={c['Business type']!} />}
                  {c.Industry       && <InfoRow label="종목"         value={c.Industry} />}
                  {c.Telephone      && <InfoRow label="전화"         value={c.Telephone} />}
                  {c.address        && <InfoRow label="주소"         value={c.address} />}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">회사 삭제</h3>
                <p className="text-xs text-slate-500">소프트 삭제 — 복구 가능</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 mb-1">
              <span className="font-semibold">{deleteTarget.name}</span>을 삭제하시겠습니까?
            </p>
            <p className="text-xs text-slate-400 mb-4">
              재직 중인 직원이 있으면 삭제할 수 없습니다.
            </p>

            {deleteError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
                {deleteError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError('') }}
                className="btn-secondary flex-1"
                disabled={deleting}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger flex-1"
                disabled={deleting}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-400 flex-shrink-0 w-20 truncate">{label}</span>
      <span className="text-slate-700 truncate">{value}</span>
    </div>
  )
}
