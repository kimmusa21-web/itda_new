'use client'
/* ================================================================
   itda — 직원 정보 CSV 내보내기 버튼
   admin: 회사 필터 + 재직상태 필터
   manager: 재직상태 필터만 (companyId 고정)
================================================================ */

import { useState } from 'react'
import { FileDown, Download, X } from 'lucide-react'

type Status = 'active' | 'inactive' | 'all'

interface Props {
  /** admin은 null 가능 (전체), manager는 고정값 전달 */
  companyId?:   number | null
  companyName?: string
  /** admin 전용: 회사 목록 */
  companies?:   { id: number; name: string }[]
}

export default function EmployeeExportButton({ companyId, companyName, companies }: Props) {
  const [open,        setOpen]        = useState(false)
  const [selCompany,  setSelCompany]  = useState<string>(companyId ? String(companyId) : '')
  const [status,      setStatus]      = useState<Status>('all')
  const [downloading, setDownloading] = useState(false)

  const isAdmin = !!companies  // companies prop이 있으면 admin 모드

  function openModal() {
    setSelCompany(companyId ? String(companyId) : '')
    setStatus('all')
    setOpen(true)
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const params = new URLSearchParams({ status })
      const targetCompany = isAdmin ? selCompany : (companyId ? String(companyId) : '')
      if (targetCompany) params.set('companyId', targetCompany)

      const res = await fetch(`/api/employees/export?${params}`)
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || '다운로드 실패')
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url

      /* Content-Disposition 헤더에서 파일명 파싱 시도 */
      const disp = res.headers.get('Content-Disposition') ?? ''
      const match = disp.match(/filename\*=UTF-8''(.+)/)
      a.download  = match ? decodeURIComponent(match[1]) : 'employees.csv'

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setOpen(false)
    } catch (e) {
      alert('CSV 다운로드 중 오류가 발생했습니다: ' + (e instanceof Error ? e.message : String(e)))
    }
    setDownloading(false)
  }

  const STATUS_OPTIONS: [Status, string][] = [
    ['all',      '전체'],
    ['active',   '재직중'],
    ['inactive', '퇴사'],
  ]

  /* 선택된 회사명 표시 */
  const selectedCompanyName = isAdmin
    ? (selCompany ? companies?.find(c => String(c.id) === selCompany)?.name ?? '선택된 회사' : '전체 회사')
    : (companyName ?? '')

  return (
    <>
      <button
        onClick={openModal}
        title="직원 정보 CSV 내보내기"
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
      >
        <FileDown size={14} />
        직원정보 CSV
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="card w-full max-w-md p-5 my-auto">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-slate-900">직원 정보 내보내기</h3>
                {!isAdmin && companyName && (
                  <p className="text-xs text-slate-400 mt-0.5">{companyName}</p>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Admin 전용: 회사 선택 */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    회사 선택
                  </label>
                  <select
                    className="input"
                    value={selCompany}
                    onChange={e => setSelCompany(e.target.value)}
                  >
                    <option value="">전체 회사</option>
                    {companies!.map(c => (
                      <option key={c.id} value={String(c.id)}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 재직 상태 필터 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  재직 상태
                </label>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                  {STATUS_OPTIONS.map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => setStatus(v)}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        status === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* 요약 */}
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <Download size={14} className="text-blue-500 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">{selectedCompanyName}</span>의{' '}
                  <span className="font-semibold">
                    {status === 'all' ? '전체' : status === 'active' ? '재직중' : '퇴사'}
                  </span>{' '}
                  직원 정보를 CSV로 내보냅니다
                </p>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
              <button onClick={() => setOpen(false)} className="btn-secondary flex-1">
                취소
              </button>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                <Download size={14} />
                {downloading ? 'CSV 생성중...' : 'CSV 다운로드'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
