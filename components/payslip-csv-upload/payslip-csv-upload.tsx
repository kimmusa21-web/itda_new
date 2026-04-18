'use client'
/* ================================================================
   itda — 급여 표준 CSV 업로드 컴포넌트
   admin: 회사 선택 → 귀속월 선택 → 파일 업로드
   manager: 귀속월 선택 → 파일 업로드
================================================================ */

import { useState, useRef } from 'react'
import {
  Upload, Download, AlertCircle, FileText, X,
  CheckCircle, XCircle, Loader2, RefreshCw, CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  downloadPayslipCsvTemplate,
  parsePayslipCsv,
  validatePayslipRow,
  checkPayslipInternalDuplicates,
} from '@/lib/payslip-csv-utils'
import { uploadPayslipCsv } from '@/lib/actions/payslip-csv-upload'
import { REQUIRED_PAYSLIP_KEYS, REQUIRED_PAYSLIP_LABELS } from '@/types/payslip-csv-upload'
import type { PayslipCsvRow, PayslipCsvResult, PayslipCsvFailure } from '@/types/payslip-csv-upload'

interface Props {
  role:              'admin' | 'manager'
  defaultCompanyId?: number
  companies?:        { id: number; name: string }[]
}

type Step = 'idle' | 'preview' | 'uploading' | 'done'

export function PayslipCsvUpload({ role, defaultCompanyId, companies = [] }: Props) {
  const [step, setStep]               = useState<Step>('idle')
  const [companyId, setCompanyId]     = useState<number | ''>(defaultCompanyId ?? '')
  const [selectedMonth, setSelectedMonth] = useState('')   // YYYY-MM, 선택 시 CSV pay_month 덮어쓰기
  const [fileName, setFileName]       = useState('')
  const [rows, setRows]               = useState<PayslipCsvRow[]>([])
  const [headerError, setHeaderError] = useState<string | null>(null)
  const [result, setResult]           = useState<PayslipCsvResult | null>(null)
  const [authError, setAuthError]     = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── 귀속월 override 적용된 실효 행 ── */
  const effectiveRows: PayslipCsvRow[] = selectedMonth
    ? rows.map(r => ({ ...r, pay_month: selectedMonth }))
    : rows

  /* ── 유효성 검사 (effectiveRows 기준, 렌더 시 계산) ── */
  const previewErrors: Record<number, PayslipCsvFailure[]> = {}
  if (rows.length > 0) {
    const { duplicates } = checkPayslipInternalDuplicates(effectiveRows)
    effectiveRows.forEach((row, idx) => {
      const rowNumber = idx + 2
      const rowFails: PayslipCsvFailure[] = []
      rowFails.push(...validatePayslipRow(row, rowNumber))
      const key = `${row.email.toLowerCase()}|${row.pay_month}`
      if (duplicates.has(key)) {
        rowFails.push({ rowNumber, email: row.email, reason: `파일 내 중복 (${row.email} / ${row.pay_month})` })
      }
      if (rowFails.length > 0) previewErrors[rowNumber] = rowFails
    })
  }

  /* ── 파일 선택 ── */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setHeaderError('CSV 파일(.csv)만 업로드 가능합니다.')
      return
    }

    setFileName(file.name)
    setHeaderError(null)
    setResult(null)
    setAuthError(null)

    const parsed = await parsePayslipCsv(file)

    if (parsed.headerError) {
      setHeaderError(parsed.headerError)
      setRows([])
      setStep('idle')
      return
    }

    if (parsed.rows.length === 0) {
      setHeaderError('CSV 파일에 데이터가 없습니다.')
      setRows([])
      setStep('idle')
      return
    }

    setRows(parsed.rows)
    setStep('preview')
  }

  /* ── 업로드 ── */
  async function handleUpload() {
    if (!companyId || effectiveRows.length === 0) return

    setStep('uploading')
    try {
      const res = await uploadPayslipCsv({ companyId: companyId as number, rows: effectiveRows, fileName })

      if (res.authError) {
        setAuthError(res.authError)
        setResult(res)
        setStep('done')
        return
      }

      setResult(res)
      setStep('done')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.'
      setAuthError(msg)
      setStep('preview')
    }
  }

  /* ── 초기화 ── */
  function handleReset() {
    setStep('idle')
    setRows([])
    setFileName('')
    setHeaderError(null)
    setResult(null)
    setAuthError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const validRowCount   = effectiveRows.length - Object.keys(previewErrors).length
  const invalidRowCount = Object.keys(previewErrors).length
  const canUpload       = !!companyId && effectiveRows.length > 0 && validRowCount > 0
  const isUploading     = step === 'uploading'

  if (step === 'done' && result) {
    return <UploadResultPanel result={result} authError={authError} onReset={handleReset} />
  }

  return (
    <div className="space-y-6">

      {/* 안내 */}
      <div className="card p-5 bg-blue-50 border-blue-100 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-blue-500 flex-shrink-0" />
          <p className="text-sm font-medium text-blue-800">표준 CSV 업로드 안내</p>
        </div>
        <ul className="text-xs text-blue-700 space-y-1 ml-5 list-disc">
          <li>
            필수 컬럼: {REQUIRED_PAYSLIP_KEYS.map(k => REQUIRED_PAYSLIP_LABELS[k]).join(', ')}
          </li>
          <li>귀속월: <code className="bg-blue-100 px-1 rounded">YYYY-MM</code> (예: 2026-04) — 지급합계·공제합계·차인지급액 미입력 시 자동 계산</li>
          <li>직원 매칭 기준: <strong>회사 + 이메일</strong> — 한 명이라도 없으면 전체 중단</li>
          <li>같은 직원 + 귀속월로 재업로드 시 자동 덮어쓰기됩니다.</li>
        </ul>
        <button
          onClick={downloadPayslipCsvTemplate}
          className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 underline-offset-2 hover:underline"
        >
          <Download size={14} />
          표준 양식 다운로드 (35컬럼)
        </button>
      </div>

      {/* 회사 선택 (admin only) */}
      {role === 'admin' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            업로드 대상 회사 <span className="text-red-500">*</span>
          </label>
          <select
            className="input max-w-xs"
            value={companyId}
            onChange={e => setCompanyId(e.target.value ? Number(e.target.value) : '')}
            disabled={isUploading}
          >
            <option value="">회사를 선택해주세요</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* 귀속월 선택 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
          <CalendarDays size={14} className="text-slate-400" />
          귀속월
          <span className="text-xs font-normal text-slate-400">(선택 — CSV 값을 이 월로 일괄 덮어씁니다)</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="month"
            className="input max-w-[180px]"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            disabled={isUploading}
          />
          {selectedMonth && (
            <button
              type="button"
              onClick={() => setSelectedMonth('')}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
              disabled={isUploading}
            >
              <X size={12} />초기화
            </button>
          )}
        </div>
        {selectedMonth && (
          <p className="mt-1 text-[11px] text-blue-600">
            전체 행의 귀속월을 <strong>{selectedMonth}</strong>로 적용합니다
          </p>
        )}
      </div>

      {/* 파일 업로드 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          CSV 파일 업로드
        </label>
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
            isUploading
              ? 'bg-slate-50 border-slate-200 cursor-not-allowed'
              : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30',
          )}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <Upload size={28} className="mx-auto text-slate-300 mb-2" />
          {fileName ? (
            <div className="flex items-center justify-center gap-2">
              <FileText size={14} className="text-blue-500" />
              <span className="text-sm font-medium text-blue-700">{fileName}</span>
              {!isUploading && (
                <button
                  onClick={e => { e.stopPropagation(); handleReset() }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500">CSV 파일을 클릭하거나 드래그하여 업로드</p>
              <p className="text-xs text-slate-400 mt-1">.csv 파일만 지원 (UTF-8 인코딩)</p>
            </>
          )}
        </div>

        {headerError && (
          <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
            <XCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{headerError}</span>
          </div>
        )}
        {authError && step !== 'done' && (
          <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
            <XCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}
      </div>

      {/* 미리보기 */}
      {step === 'preview' && rows.length > 0 && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-slate-700">미리보기 — 총 {rows.length}행</p>
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="text-green-600 font-medium">정상 {validRowCount}건</span>
              {invalidRowCount > 0 && (
                <>
                  {' · '}
                  <span className="text-red-500 font-medium">오류 {invalidRowCount}건</span>
                  {' '}— 오류가 있으면 전체 업로드가 중단됩니다
                </>
              )}
            </p>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: '720px' }}>
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-slate-500 font-semibold w-10">행</th>
                    <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">이메일</th>
                    <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">
                      귀속월{selectedMonth && <span className="ml-1 text-blue-500 font-normal text-[10px]">(일괄적용)</span>}
                    </th>
                    <th className="px-3 py-2.5 text-right text-slate-500 font-semibold">기본급</th>
                    <th className="px-3 py-2.5 text-right text-slate-500 font-semibold">지급합계</th>
                    <th className="px-3 py-2.5 text-right text-slate-500 font-semibold">공제합계</th>
                    <th className="px-3 py-2.5 text-right text-slate-500 font-semibold">차인지급액</th>
                    <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {effectiveRows.map((row, idx) => {
                    const rowNumber = idx + 2
                    const errs      = previewErrors[rowNumber]
                    const hasError  = Boolean(errs?.length)

                    return (
                      <tr
                        key={rowNumber}
                        className={cn('transition-colors', hasError ? 'bg-red-50' : 'hover:bg-slate-50')}
                      >
                        <td className="px-3 py-2 text-slate-400">{rowNumber}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.email || <span className="text-red-400 italic">없음</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.pay_month
                            ? <span className={selectedMonth ? 'text-blue-600 font-medium' : ''}>{row.pay_month}</span>
                            : <span className="text-red-400 italic">없음</span>
                          }
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {row.base_salary
                            ? Number(row.base_salary.replace(/,/g, '')).toLocaleString()
                            : <span className="text-red-400 italic">없음</span>
                          }
                        </td>
                        <td className="px-3 py-2 text-right text-slate-500">
                          {row.Total_payment
                            ? Number(row.Total_payment.replace(/,/g, '')).toLocaleString()
                            : <span className="text-slate-300">자동계산</span>
                          }
                        </td>
                        <td className="px-3 py-2 text-right text-slate-500">
                          {row.Total_deductible
                            ? Number(row.Total_deductible.replace(/,/g, '')).toLocaleString()
                            : <span className="text-slate-300">자동계산</span>
                          }
                        </td>
                        <td className="px-3 py-2 text-right text-slate-500">
                          {row.net_pay
                            ? Number(row.net_pay.replace(/,/g, '')).toLocaleString()
                            : <span className="text-slate-300">자동계산</span>
                          }
                        </td>
                        <td className="px-3 py-2">
                          {hasError ? (
                            <div className="space-y-0.5">
                              {errs.map((f, i) => (
                                <div key={i} className="flex items-start gap-1 text-red-600">
                                  <XCircle size={11} className="flex-shrink-0 mt-0.5" />
                                  <span>{f.reason}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="badge badge-green text-xs">업로드 가능</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {invalidRowCount > 0 && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">오류 {invalidRowCount}건 — 업로드 불가</p>
                <p className="text-xs text-red-600 mt-0.5">
                  CSV 파일의 오류를 수정 후 다시 업로드해주세요. 한 행이라도 오류가 있으면 전체 업로드가 차단됩니다.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleReset} className="btn-secondary flex items-center gap-1.5">
              <RefreshCw size={14} />초기화
            </button>
            <button
              onClick={handleUpload}
              disabled={!canUpload || invalidRowCount > 0 || isUploading}
              className={cn(
                'btn-primary flex items-center gap-2',
                (!canUpload || invalidRowCount > 0) && 'opacity-50 cursor-not-allowed',
              )}
            >
              {isUploading
                ? <><Loader2 size={15} className="animate-spin" />업로드 중...</>
                : <><Upload size={15} />{validRowCount}명 급여 업로드</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── 결과 패널 ────────────────────────────────────────────── */
function UploadResultPanel({
  result,
  authError,
  onReset,
}: {
  result:    PayslipCsvResult
  authError: string | null
  onReset:   () => void
}) {
  const isSuccess = result.successCount > 0 && result.failureCount === 0
  const isPartial = result.successCount > 0 && result.failureCount > 0

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          {isSuccess ? (
            <CheckCircle size={20} className="text-green-500" />
          ) : isPartial ? (
            <AlertCircle size={20} className="text-amber-500" />
          ) : (
            <XCircle size={20} className="text-red-500" />
          )}
          <div>
            <p className="font-semibold text-slate-900">
              {isSuccess ? '업로드 완료' : isPartial ? '일부 성공' : '업로드 실패'}
            </p>
            <p className="text-sm text-slate-500">
              총 {result.totalCount}건 중 성공 {result.successCount}건 / 실패 {result.failureCount}건
            </p>
          </div>
        </div>

        {authError && (
          <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{authError}</p>
          </div>
        )}

        <div className="flex gap-4">
          <div className="flex-1 bg-green-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{result.successCount}</p>
            <p className="text-xs text-green-700 mt-0.5">업로드 성공</p>
          </div>
          <div className="flex-1 bg-red-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{result.failureCount}</p>
            <p className="text-xs text-red-600 mt-0.5">업로드 실패</p>
          </div>
        </div>
      </div>

      {result.failures.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-red-50">
            <p className="text-sm font-medium text-red-700">실패 상세 ({result.failures.length}건)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: '480px' }}>
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2.5 text-left text-slate-500 font-semibold w-12">행</th>
                  <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">이메일</th>
                  <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">실패 사유</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {result.failures.map((f, i) => (
                  <tr key={i} className="bg-red-50/50">
                    <td className="px-3 py-2 text-slate-400">{f.rowNumber}</td>
                    <td className="px-3 py-2 text-slate-600">{f.email || '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-start gap-1 text-red-600">
                        <XCircle size={11} className="flex-shrink-0 mt-0.5" />
                        <span>{f.reason}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button onClick={onReset} className="btn-secondary w-full flex items-center justify-center gap-2">
        <RefreshCw size={14} />새 파일 업로드
      </button>
    </div>
  )
}
