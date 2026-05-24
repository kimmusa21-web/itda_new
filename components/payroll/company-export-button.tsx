'use client'
/* ================================================================
   ModuHR — 전직원 급여내역 CSV 내보내기 버튼 + 모달
   - 단일 월 또는 시작월~종료월 기간 선택
   - admin/manager 공용 (companyId 필수)
================================================================ */

import { useState } from 'react'
import { Download, X, FileDown } from 'lucide-react'
import { formatAccrualMonth } from '@/lib/payslip-utils'

interface Props {
  companyId:       number | null   // null이면 회사 미선택 → 비활성
  companyName?:    string
  availableMonths: string[]        // YYYY-MM 목록 (최신순)
  currentMonth:    string          // 현재 선택된 월 (기본값)
}

export default function CompanyExportButton({
  companyId,
  companyName,
  availableMonths,
  currentMonth,
}: Props) {
  const [open,        setOpen]        = useState(false)
  const [startMonth,  setStartMonth]  = useState(currentMonth)
  const [endMonth,    setEndMonth]    = useState(currentMonth)
  const [downloading, setDownloading] = useState(false)

  /* currentMonth 변화 시 동기화 */
  function openModal() {
    setStartMonth(currentMonth)
    setEndMonth(currentMonth)
    setOpen(true)
  }

  async function handleDownload() {
    if (!companyId) return
    setDownloading(true)
    try {
      const params = new URLSearchParams({
        companyId:  String(companyId),
        startMonth,
        endMonth,
      })
      const res = await fetch(`/api/payroll/company-export?${params}`)
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || '다운로드 실패')
      }
      const blob     = await res.blob()
      const url      = URL.createObjectURL(blob)
      const a        = document.createElement('a')
      const today    = new Date().toISOString().slice(0, 10)
      const period   = startMonth === endMonth ? startMonth : `${startMonth}_${endMonth}`
      const name     = companyName ?? String(companyId)
      a.href         = url
      a.download     = `payroll_${name}_${period}_${today}.csv`
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

  /* 유효 기간 검사: startMonth <= endMonth */
  const isValid = availableMonths.length > 0 && startMonth <= endMonth

  /* 내보낼 월 수 계산 (표시용) */
  const monthCount = (() => {
    if (!isValid) return 0
    const start = availableMonths.indexOf(startMonth)
    const end   = availableMonths.indexOf(endMonth)
    if (start === -1 || end === -1) return 0
    // availableMonths는 최신순이므로 end가 더 작은 인덱스
    return Math.abs(start - end) + 1
  })()

  return (
    <>
      {/* 트리거 버튼 */}
      <button
        onClick={companyId ? openModal : undefined}
        disabled={!companyId || availableMonths.length === 0}
        title={!companyId ? '회사를 먼저 선택하세요' : '전직원 급여내역 CSV 내보내기'}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <FileDown size={14} />
        전직원 CSV
      </button>

      {/* 내보내기 모달 */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="card w-full max-w-md p-5 my-auto">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-slate-900">전직원 급여내역 내보내기</h3>
                {companyName && (
                  <p className="text-xs text-slate-400 mt-0.5">{companyName}</p>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                <X size={18} />
              </button>
            </div>

            {/* 기간 선택 */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  시작 월
                </label>
                <select
                  className="input"
                  value={startMonth}
                  onChange={e => {
                    setStartMonth(e.target.value)
                    // 시작월이 종료월보다 최신이면 종료월도 맞춤
                    if (e.target.value > endMonth) setEndMonth(e.target.value)
                  }}
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{formatAccrualMonth(m)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  종료 월
                </label>
                <select
                  className="input"
                  value={endMonth}
                  onChange={e => {
                    setEndMonth(e.target.value)
                    // 종료월이 시작월보다 이전이면 시작월도 맞춤
                    if (e.target.value < startMonth) setStartMonth(e.target.value)
                  }}
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{formatAccrualMonth(m)}</option>
                  ))}
                </select>
              </div>

              {/* 기간 요약 */}
              {isValid && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <Download size={14} className="text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    {startMonth === endMonth
                      ? <><span className="font-semibold">{formatAccrualMonth(startMonth)}</span> 1개월분 전직원 급여내역을 내보냅니다</>
                      : <><span className="font-semibold">{formatAccrualMonth(startMonth)}</span> ~ <span className="font-semibold">{formatAccrualMonth(endMonth)}</span> ({monthCount}개월) 전직원 급여내역을 내보냅니다</>
                    }
                  </p>
                </div>
              )}

              {!isValid && startMonth > endMonth && (
                <p className="text-xs text-red-500">종료 월은 시작 월보다 같거나 이후여야 합니다</p>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
              <button onClick={() => setOpen(false)} className="btn-secondary flex-1">
                취소
              </button>
              <button
                onClick={handleDownload}
                disabled={!isValid || downloading}
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
