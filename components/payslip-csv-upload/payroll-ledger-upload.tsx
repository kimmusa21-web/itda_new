'use client'
/* ================================================================
   itda — 급여대장 엑셀/CSV 자동 인식 업로드 컴포넌트
   직원 식별: 1순위 사번, 2순위 이름(단일 매칭)
   저장 대상: pay_info_v2
================================================================ */

import { useState, useRef } from 'react'
import {
  Upload, FileSpreadsheet, X, RefreshCw,
  CheckCircle, XCircle, Loader2, AlertCircle,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { parsePayrollFile, type ParsedLedgerRow } from '@/lib/payroll-ledger-utils'
import { uploadPayrollLedger, type LedgerUploadResult } from '@/lib/actions/payroll-ledger-upload'

interface Props {
  role:              'admin' | 'manager'
  defaultCompanyId?: number
  companies?:        { id: number; name: string }[]
}

type Step = 'idle' | 'preview' | 'uploading' | 'done'

function fmt(n: number) {
  return n.toLocaleString('ko-KR')
}

export function PayrollLedgerUpload({ role, defaultCompanyId, companies = [] }: Props) {
  const [step, setStep]             = useState<Step>('idle')
  const [companyId, setCompanyId]   = useState<number | ''>(defaultCompanyId ?? '')
  const [fileName, setFileName]     = useState('')
  const [rows, setRows]             = useState<ParsedLedgerRow[]>([])
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([])
  const [fileError, setFileError]   = useState<string | null>(null)
  const [result, setResult]         = useState<LedgerUploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── 파일 선택 ─────────────────────────────────────────────── */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
      setFileError('xlsx, xls, csv 파일만 업로드 가능합니다.')
      return
    }

    setFileName(file.name)
    setFileError(null)
    setResult(null)
    setRows([])
    setDetectedHeaders([])

    const { rows: parsed, error, detectedHeaders: headers } = await parsePayrollFile(file)

    if (error) {
      setFileError(error)
      setStep('idle')
      return
    }

    if (parsed.length === 0) {
      setFileError('유효한 데이터 행이 없습니다.')
      setStep('idle')
      return
    }

    setRows(parsed)
    setDetectedHeaders(headers)
    setStep('preview')
  }

  /* ── 업로드 실행 ───────────────────────────────────────────── */
  async function handleUpload() {
    if (!companyId || rows.length === 0) return
    setStep('uploading')

    try {
      const res = await uploadPayrollLedger({
        companyId: companyId as number,
        rows,
        fileName,
      })
      setResult(res)
      setStep('done')
    } catch (e: unknown) {
      setResult({
        totalCount:   rows.length,
        successCount: 0,
        failureCount: rows.length,
        results:      [],
        authError:    e instanceof Error ? e.message : '알 수 없는 오류',
      })
      setStep('done')
    }
  }

  /* ── 초기화 ────────────────────────────────────────────────── */
  function handleReset() {
    setStep('idle')
    setRows([])
    setFileName('')
    setFileError(null)
    setDetectedHeaders([])
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isUploading = step === 'uploading'
  const canUpload   = !!companyId && rows.length > 0 && !isUploading

  /* ── 완료 화면 ─────────────────────────────────────────────── */
  if (step === 'done' && result) {
    return <UploadResultPanel result={result} onReset={handleReset} />
  }

  /* ── 메인 화면 ─────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* 안내 배너 */}
      <div className="card p-5 bg-emerald-50 border-emerald-100 space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-800">급여대장 자동 인식 업로드</p>
        </div>
        <ul className="text-xs text-emerald-700 space-y-1 ml-5 list-disc">
          <li><strong>xlsx / xls / csv</strong> 형식의 급여대장 파일을 그대로 업로드하세요.</li>
          <li>한국어 컬럼명(성명, 사번, 기본급, 국민연금 등)을 자동으로 인식합니다.</li>
          <li>직원 매칭: <strong>1순위 사번</strong> → <strong>2순위 이름</strong>(동명이인 불가)</li>
          <li>같은 귀속월 재업로드 시 기존 데이터를 덮어씁니다.</li>
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

      {/* 파일 드롭존 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          급여대장 파일 선택
        </label>
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer',
            isUploading
              ? 'bg-slate-50 border-slate-200 cursor-not-allowed'
              : 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/30',
          )}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <FileSpreadsheet size={32} className="mx-auto text-emerald-300 mb-3" />
          {fileName ? (
            <div className="flex items-center justify-center gap-2">
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">{fileName}</span>
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
              <p className="text-sm text-slate-500">
                클릭하거나 파일을 드래그하여 업로드
              </p>
              <p className="text-xs text-slate-400 mt-1">
                xlsx · xls · csv — 한국어 급여대장 자동 인식
              </p>
            </>
          )}
        </div>

        {fileError && (
          <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <XCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-700 whitespace-pre-line">{fileError}</span>
          </div>
        )}
      </div>

      {/* 인식된 컬럼 배지 */}
      {detectedHeaders.length > 0 && step === 'preview' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-800">
              {detectedHeaders.length}개 컬럼 인식 · {rows.length}행 파싱됨
            </span>
          </div>
          <p className="text-xs text-emerald-700 pl-5">
            {detectedHeaders.slice(0, 12).join(' · ')}
            {detectedHeaders.length > 12 && ` 외 ${detectedHeaders.length - 12}개`}
          </p>
        </div>
      )}

      {/* 미리보기 테이블 */}
      {step === 'preview' && rows.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-700">
            파싱 결과 미리보기 — 총 <strong>{rows.length}행</strong>
            <span className="text-xs text-slate-400 ml-2 font-normal">
              (업로드 시 직원 매칭 후 저장됩니다)
            </span>
          </p>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: '700px' }}>
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['행', '성명', '사번', '귀속월', '기본급', '지급합계', '차인지급액'].map(h => (
                      <th
                        key={h}
                        className={cn(
                          'px-3 py-2.5 text-slate-500 font-semibold text-left whitespace-nowrap',
                          ['기본급', '지급합계', '차인지급액'].includes(h) && 'text-right',
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map(row => {
                    const hasNoMonth = !row.accrualMonth
                    const hasNoId    = !row.rawName && !row.rawEmployeeNumber

                    return (
                      <tr
                        key={row.rowIndex}
                        className={cn(
                          'transition-colors',
                          (hasNoMonth || hasNoId) ? 'bg-red-50' : 'hover:bg-slate-50',
                        )}
                      >
                        <td className="px-3 py-2 text-slate-400">{row.rowIndex}</td>
                        <td className="px-3 py-2 text-slate-700 font-medium">
                          {row.rawName || <span className="text-red-400 italic">없음</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600 font-mono">
                          {row.rawEmployeeNumber || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.accrualMonth
                            ? <span className="badge badge-blue text-xs">{row.accrualMonth}</span>
                            : <span className="text-red-400 italic">없음</span>
                          }
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {row.base_salary ? fmt(row.base_salary) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-500">
                          {row.Total_payment ? fmt(row.Total_payment) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-800">
                          {row.net_pay ? fmt(row.net_pay) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="btn-secondary flex items-center gap-1.5"
            >
              <RefreshCw size={14} />초기화
            </button>
            <button
              onClick={handleUpload}
              disabled={!canUpload}
              className={cn(
                'btn-primary flex items-center gap-2',
                !canUpload && 'opacity-50 cursor-not-allowed',
              )}
            >
              {isUploading
                ? <><Loader2 size={15} className="animate-spin" />업로드 중...</>
                : <><Upload size={15} />{rows.length}명 급여 업로드</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── 업로드 결과 패널 ─────────────────────────────────────────── */
function UploadResultPanel({
  result,
  onReset,
}: {
  result:  LedgerUploadResult
  onReset: () => void
}) {
  const isSuccess = result.successCount > 0 && result.failureCount === 0
  const isPartial = result.successCount > 0 && result.failureCount > 0
  const failures  = result.results.filter(r => r.status === 'failure')
  const successes = result.results.filter(r => r.status === 'success')

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
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

        {result.authError && (
          <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{result.authError}</p>
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

      {/* 실패 상세 */}
      {failures.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-red-50">
            <p className="text-sm font-medium text-red-700">실패 상세 ({failures.length}건)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: '560px' }}>
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['행', '성명', '사번', '귀속월', '실패 사유'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-slate-500 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {failures.map((f, i) => (
                  <tr key={i} className="bg-red-50/50">
                    <td className="px-3 py-2 text-slate-400">{f.rowIndex}</td>
                    <td className="px-3 py-2 text-slate-700 font-medium">{f.name || '—'}</td>
                    <td className="px-3 py-2 text-slate-500 font-mono">{f.employeeNumber || '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{f.accrualMonth || '—'}</td>
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

      {/* 성공 상세 (접이식) */}
      {successes.length > 0 && (
        <details className="card overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-slate-700 hover:bg-slate-50 select-none">
            성공 상세 ({successes.length}건) ▸
          </summary>
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full text-xs" style={{ minWidth: '480px' }}>
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['행', '성명', '사번', '귀속월', '상태'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-slate-500 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {successes.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-400">{s.rowIndex}</td>
                    <td className="px-3 py-2 text-slate-700 font-medium">{s.name}</td>
                    <td className="px-3 py-2 text-slate-500 font-mono">{s.employeeNumber || '—'}</td>
                    <td className="px-3 py-2">
                      <span className="badge badge-blue text-xs">{s.accrualMonth}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="badge badge-green text-xs">저장 완료</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <button
        onClick={onReset}
        className="btn-secondary w-full flex items-center justify-center gap-2"
      >
        <RefreshCw size={14} />새 파일 업로드
      </button>
    </div>
  )
}
