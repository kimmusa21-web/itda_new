'use client'
/* ================================================================
   itda — 급여대장 자동 인식 업로드 컴포넌트
   표준 CSV + 한국어 급여대장 양식 모두 지원
================================================================ */

import { useState, useRef } from 'react'
import {
  Upload, AlertCircle, FileText, X,
  CheckCircle, XCircle, Loader2, RefreshCw,
  Sparkles, Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  autoDetectAndParseCsv,
  type AutoDetectResult,
} from '@/lib/payroll-csv-auto-detect'
import {
  validatePayslipRow,
  checkPayslipInternalDuplicates,
} from '@/lib/payslip-csv-utils'
import { uploadPayslipCsv } from '@/lib/actions/payslip-csv-upload'
import type { PayslipCsvRow, PayslipCsvResult, PayslipCsvFailure } from '@/types/payslip-csv-upload'

interface Props {
  role:              'admin' | 'manager'
  defaultCompanyId?: number
  companies?:        { id: number; name: string }[]
}

type Step = 'idle' | 'preview' | 'uploading' | 'done'

export function AutoDetectUpload({ role, defaultCompanyId, companies = [] }: Props) {
  const [step, setStep]               = useState<Step>('idle')
  const [companyId, setCompanyId]     = useState<number | ''>(defaultCompanyId ?? '')
  const [fileName, setFileName]       = useState('')
  const [detectResult, setDetectResult] = useState<AutoDetectResult | null>(null)
  const [rows, setRows]               = useState<PayslipCsvRow[]>([])
  const [fileError, setFileError]     = useState<string | null>(null)
  const [previewErrors, setPreviewErrors] = useState<Record<number, PayslipCsvFailure[]>>({})
  const [result, setResult]           = useState<PayslipCsvResult | null>(null)
  const [authError, setAuthError]     = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── 파일 선택 ── */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('CSV 파일(.csv)만 업로드 가능합니다.')
      return
    }

    setFileName(file.name)
    setFileError(null)
    setResult(null)
    setAuthError(null)
    setDetectResult(null)

    const detected = await autoDetectAndParseCsv(file)
    setDetectResult(detected)

    if (detected.headerError) {
      setFileError(detected.headerError)
      setRows([])
      setStep('idle')
      return
    }

    if (detected.rows.length === 0) {
      setFileError('파일에 유효한 데이터가 없습니다.')
      setRows([])
      setStep('idle')
      return
    }

    const { duplicates } = checkPayslipInternalDuplicates(detected.rows)

    const errors: Record<number, PayslipCsvFailure[]> = {}
    detected.rows.forEach((row, idx) => {
      const rowNumber = idx + 2
      const rowFails: PayslipCsvFailure[] = []

      rowFails.push(...validatePayslipRow(row, rowNumber))

      const key = `${row.email.toLowerCase()}|${row.accrual_month}`
      if (duplicates.has(key)) {
        rowFails.push({ rowNumber, email: row.email, reason: `파일 내 중복 (${row.email} / ${row.accrual_month})` })
      }

      if (rowFails.length > 0) errors[rowNumber] = rowFails
    })

    setPreviewErrors(errors)
    setRows(detected.rows)
    setStep('preview')
  }

  /* ── 업로드 ── */
  async function handleUpload() {
    if (!companyId || rows.length === 0) return

    setStep('uploading')
    try {
      const res = await uploadPayslipCsv({ companyId: companyId as number, rows, fileName })

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
    setFileError(null)
    setDetectResult(null)
    setPreviewErrors({})
    setResult(null)
    setAuthError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const validRowCount   = rows.length - Object.keys(previewErrors).length
  const invalidRowCount = Object.keys(previewErrors).length
  const canUpload       = !!companyId && rows.length > 0 && validRowCount > 0
  const isUploading     = step === 'uploading'

  if (step === 'done' && result) {
    return <UploadResultPanel result={result} authError={authError} onReset={handleReset} />
  }

  return (
    <div className="space-y-6">

      {/* 안내 */}
      <div className="card p-5 bg-violet-50 border-violet-100 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-violet-500 flex-shrink-0" />
          <p className="text-sm font-medium text-violet-800">자동 인식 업로드</p>
        </div>
        <ul className="text-xs text-violet-700 space-y-1 ml-5 list-disc">
          <li><strong>표준 CSV</strong>: email + pay_month 헤더가 있는 표준 양식을 자동 감지합니다.</li>
          <li><strong>한국어 급여대장</strong>: 귀속월·성명·기본급 등 한국어 헤더를 자동으로 매핑합니다.</li>
          <li>이메일 컬럼이 없는 경우: 직원 매칭 실패로 업로드가 불가합니다 — 직원 목록에 이메일을 등록하세요.</li>
          <li>인식되지 않은 컬럼은 업로드 시 무시됩니다.</li>
        </ul>
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
              : 'border-violet-200 hover:border-violet-400 hover:bg-violet-50/30',
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
          <Sparkles size={28} className="mx-auto text-violet-300 mb-2" />
          {fileName ? (
            <div className="flex items-center justify-center gap-2">
              <FileText size={14} className="text-violet-500" />
              <span className="text-sm font-medium text-violet-700">{fileName}</span>
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
              <p className="text-sm text-slate-500">급여대장 CSV 파일을 클릭하거나 드래그하여 업로드</p>
              <p className="text-xs text-slate-400 mt-1">표준 CSV · 한국어 급여대장 자동 인식</p>
            </>
          )}
        </div>

        {fileError && (
          <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
            <XCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span className="whitespace-pre-line">{fileError}</span>
          </div>
        )}
        {authError && step !== 'done' && (
          <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
            <XCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}
      </div>

      {/* 감지 결과 배지 */}
      {detectResult && !detectResult.headerError && (
        <FormatBadge result={detectResult} />
      )}

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
                    <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">성명</th>
                    <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">귀속월</th>
                    <th className="px-3 py-2.5 text-right text-slate-500 font-semibold">기본급</th>
                    <th className="px-3 py-2.5 text-right text-slate-500 font-semibold">지급합계</th>
                    <th className="px-3 py-2.5 text-right text-slate-500 font-semibold">차인지급액</th>
                    <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((row, idx) => {
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
                          {row.email || <span className="text-amber-500 italic">없음</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.employee_name || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.accrual_month || <span className="text-red-400 italic">없음</span>}
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
                            : <span className="text-slate-300">계산됨</span>
                          }
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-700">
                          {row.net_pay
                            ? Number(row.net_pay.replace(/,/g, '')).toLocaleString()
                            : <span className="text-slate-300">계산됨</span>
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
                  오류를 수정 후 다시 업로드해주세요.
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

/* ── 형식 감지 배지 ───────────────────────────────────────── */
function FormatBadge({ result }: { result: AutoDetectResult }) {
  const isKorean   = result.format === 'korean'
  const isStandard = result.format === 'standard'

  return (
    <div className={cn(
      'rounded-xl border px-4 py-3 space-y-2',
      isKorean   ? 'bg-amber-50 border-amber-200'  : '',
      isStandard ? 'bg-green-50 border-green-200'  : '',
    )}>
      <div className="flex items-center gap-2">
        {isStandard ? (
          <>
            <CheckCircle size={14} className="text-green-500" />
            <span className="text-sm font-semibold text-green-800">표준 CSV 형식 감지</span>
          </>
        ) : (
          <>
            <Sparkles size={14} className="text-amber-500" />
            <span className="text-sm font-semibold text-amber-800">한국어 급여대장 자동 변환 중</span>
          </>
        )}
        <span className={cn(
          'ml-auto text-xs px-2 py-0.5 rounded-full font-medium',
          isStandard ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700',
        )}>
          {result.rows.length}행 인식
        </span>
      </div>

      {isKorean && (
        <MappingSummaryPanel unmappedHeaders={result.unmappedHeaders} />
      )}
    </div>
  )
}

/* ── 매핑 요약 ────────────────────────────────────────────── */
function MappingSummaryPanel({ unmappedHeaders }: { unmappedHeaders: string[] }) {
  if (unmappedHeaders.length === 0) return null

  return (
    <div className="flex items-start gap-2 bg-amber-100/60 rounded-lg px-3 py-2">
      <Info size={12} className="text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-medium text-amber-800">인식되지 않은 컬럼 (무시됨)</p>
        <p className="text-xs text-amber-700 mt-0.5">
          {unmappedHeaders.join(', ')}
        </p>
      </div>
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
