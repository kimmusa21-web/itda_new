'use client'
/* ================================================================
   ModuHR — 직원 CSV 대량 등록 클라이언트 컴포넌트
   - admin: 회사 선택 → 파일 업로드
   - manager: 고정 companyId로 파일 업로드
================================================================ */

import { useState, useRef } from 'react'
import { Upload, Download, CheckCircle, XCircle, AlertCircle, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  downloadEmployeeCsvTemplate,
  parseEmployeeCsv,
  checkInternalDuplicates,
  validateEmployeeRow,
} from '@/lib/csv-employee-utils'
import { uploadEmployeesCsv } from '@/lib/actions/employee-bulk-upload'
import { CSV_HEADER_LABELS, REQUIRED_CSV_HEADERS } from '@/types/employee-upload'
import type { EmployeeCsvRawRow, EmployeeUploadResult } from '@/types/employee-upload'

interface Props {
  role: 'admin' | 'manager'
  /** manager는 고정값, admin은 회사 선택 후 세팅 */
  defaultCompanyId?: number
  companies?: { id: number; name: string }[]
}

type Step = 'idle' | 'preview' | 'uploading' | 'done'

export function EmployeeCsvUpload({ role, defaultCompanyId, companies = [] }: Props) {
  const [step, setStep]               = useState<Step>('idle')
  const [companyId, setCompanyId]     = useState<number | ''>(defaultCompanyId ?? '')
  const [fileName, setFileName]       = useState('')
  const [rows, setRows]               = useState<EmployeeCsvRawRow[]>([])
  const [headerError, setHeaderError] = useState<string | null>(null)
  const [previewErrors, setPreviewErrors] = useState<Record<number, string[]>>({})
  const [result, setResult]           = useState<EmployeeUploadResult | null>(null)
  const [authError, setAuthError]     = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── 파일 선택 처리 ── */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setHeaderError('CSV 파일(.csv)만 업로드할 수 있습니다.')
      return
    }

    setFileName(file.name)
    setHeaderError(null)
    setResult(null)
    setAuthError(null)

    const parsed = await parseEmployeeCsv(file)

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

    // 파일 내 중복 검사
    const dups = checkInternalDuplicates(parsed.rows)
    const dupEmailSet = new Set(dups.duplicateEmails)
    const dupEmpNumSet = new Set(dups.duplicateEmployeeNumbers)

    // 행별 미리보기 에러 계산
    const errors: Record<number, string[]> = {}
    parsed.rows.forEach((row, idx) => {
      const rowNumber = idx + 2
      const rowErrors: string[] = []

      const validation = validateEmployeeRow(row, rowNumber)
      rowErrors.push(...validation.reasons)

      if (row.email && dupEmailSet.has(row.email)) {
        rowErrors.push(`파일 내 이메일 중복: ${row.email}`)
      }
      if (row.employee_number && dupEmpNumSet.has(row.employee_number)) {
        rowErrors.push(`파일 내 사번 중복: ${row.employee_number}`)
      }

      if (rowErrors.length > 0) errors[rowNumber] = rowErrors
    })

    setPreviewErrors(errors)
    setRows(parsed.rows)
    setStep('preview')
  }

  /* ── 업로드 실행 ── */
  async function handleUpload() {
    if (!companyId || rows.length === 0) return

    setStep('uploading')
    try {
      const res = await uploadEmployeesCsv({
        companyId: companyId as number,
        rows,
        fileName,
      })

      if (res.authError) {
        setAuthError(res.authError)
        setStep('preview')
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
    setPreviewErrors({})
    setResult(null)
    setAuthError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isUploading     = step === 'uploading'
  const validRowCount   = rows.length - Object.keys(previewErrors).length
  const invalidRowCount = Object.keys(previewErrors).length
  const canUpload       = !!companyId && rows.length > 0 && validRowCount > 0 && !isUploading

  return (
    <div className="space-y-6">
      {/* 안내 카드 */}
      <div className="card p-5 bg-blue-50 border border-blue-100 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-blue-500 flex-shrink-0" />
          <p className="text-sm font-medium text-blue-800">CSV 업로드 안내</p>
        </div>
        <ul className="text-xs text-blue-700 space-y-1 ml-5 list-disc">
          <li>
            필수 컬럼: {REQUIRED_CSV_HEADERS.map(h => CSV_HEADER_LABELS[h]).join(', ')}
          </li>
          <li>이메일과 사번은 중복 등록이 불가합니다.</li>
          <li>
            재직상태(employment_status): <code className="bg-blue-100 px-1 rounded">active</code> 또는{' '}
            <code className="bg-blue-100 px-1 rounded">inactive</code>
          </li>
          <li>입사일(join_date) 형식: YYYY-MM-DD (예: 2024-01-15)</li>
          <li>양식을 변경하면 오류가 발생할 수 있습니다. 반드시 템플릿을 사용해주세요.</li>
        </ul>
        <button
          onClick={downloadEmployeeCsvTemplate}
          className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 underline-offset-2 hover:underline"
        >
          <Download size={14} />
          CSV 양식 다운로드
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
            disabled={step === 'uploading'}
          >
            <option value="">회사를 선택해주세요</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* 파일 업로드 영역 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          CSV 파일 업로드
        </label>
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
            step === 'uploading'
              ? 'bg-slate-50 border-slate-200 cursor-not-allowed'
              : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30',
          )}
          onClick={() => step !== 'uploading' && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
            disabled={step === 'uploading'}
          />
          <Upload size={28} className="mx-auto text-slate-300 mb-2" />
          {fileName ? (
            <div className="flex items-center justify-center gap-2">
              <FileText size={14} className="text-blue-500" />
              <span className="text-sm font-medium text-blue-700">{fileName}</span>
              {step !== 'uploading' && step !== 'done' && (
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
              <p className="text-xs text-slate-400 mt-1">.csv 파일만 지원</p>
            </>
          )}
        </div>

        {/* 헤더 에러 */}
        {headerError && (
          <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
            <XCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{headerError}</span>
          </div>
        )}

        {/* 인증 에러 */}
        {authError && (
          <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
            <XCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}
      </div>

      {/* 미리보기 테이블 */}
      {step === 'preview' && rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">
                미리보기 — 총 {rows.length}행
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                <span className="text-green-600 font-medium">정상 {validRowCount}건</span>
                {invalidRowCount > 0 && (
                  <> · <span className="text-red-500 font-medium">오류 {invalidRowCount}건</span> (오류 행 제외 후 등록됩니다)</>
                )}
              </p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: '700px' }}>
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-slate-500 font-semibold w-10">행</th>
                    <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">이름</th>
                    <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">이메일</th>
                    <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">사번</th>
                    <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">부서</th>
                    <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">직위</th>
                    <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((row, idx) => {
                    const rowNumber = idx + 2
                    const errors    = previewErrors[rowNumber]
                    const hasError  = Boolean(errors?.length)

                    return (
                      <tr
                        key={rowNumber}
                        className={cn(
                          'transition-colors',
                          hasError ? 'bg-red-50' : 'hover:bg-slate-50',
                        )}
                      >
                        <td className="px-3 py-2 text-slate-400">{rowNumber}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{row.name || <span className="text-red-400 italic">없음</span>}</td>
                        <td className="px-3 py-2 text-slate-600">{row.email || <span className="text-red-400 italic">없음</span>}</td>
                        <td className="px-3 py-2 text-slate-600">{row.employee_number || <span className="text-slate-300">-</span>}</td>
                        <td className="px-3 py-2 text-slate-500">{row.department || '-'}</td>
                        <td className="px-3 py-2 text-slate-500">{row.position || '-'}</td>
                        <td className="px-3 py-2">
                          {hasError ? (
                            <div className="space-y-0.5">
                              {errors.map((r, i) => (
                                <div key={i} className="flex items-start gap-1 text-red-600">
                                  <XCircle size={11} className="flex-shrink-0 mt-0.5" />
                                  <span>{r}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="badge badge-green text-xs">등록 가능</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 업로드 버튼 */}
          <div className="flex gap-3">
            <button onClick={handleReset} className="btn-secondary">
              취소
            </button>
            <button
              onClick={handleUpload}
              disabled={!canUpload}
              className="btn-primary"
            >
              <Upload size={15} />
              {isUploading ? '등록 중...' : `${validRowCount}명 등록`}
            </button>
          </div>
        </div>
      )}

      {/* 업로드 결과 */}
      {step === 'done' && result && (
        <UploadResultPanel result={result} onReset={handleReset} />
      )}
    </div>
  )
}

/* ── 결과 패널 ────────────────────────────────────────────────── */
function UploadResultPanel({
  result,
  onReset,
}: {
  result: EmployeeUploadResult
  onReset: () => void
}) {
  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          {result.failureCount === 0 ? (
            <CheckCircle size={20} className="text-green-500" />
          ) : result.successCount === 0 ? (
            <XCircle size={20} className="text-red-500" />
          ) : (
            <AlertCircle size={20} className="text-amber-500" />
          )}
          <div>
            <p className="font-semibold text-slate-900">업로드 완료</p>
            <p className="text-sm text-slate-500">
              총 {result.totalCount}건 중 성공 {result.successCount}건 / 실패 {result.failureCount}건
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1 bg-green-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{result.successCount}</p>
            <p className="text-xs text-green-700 mt-0.5">등록 성공</p>
          </div>
          <div className="flex-1 bg-red-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{result.failureCount}</p>
            <p className="text-xs text-red-600 mt-0.5">등록 실패</p>
          </div>
        </div>
      </div>

      {/* 실패 목록 */}
      {result.failures.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-red-50">
            <p className="text-sm font-medium text-red-700">실패한 행 ({result.failures.length}건)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: '600px' }}>
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2.5 text-left text-slate-500 font-semibold w-10">행</th>
                  <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">이름</th>
                  <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">이메일</th>
                  <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">실패 사유</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {result.failures.map(f => (
                  <tr key={f.rowNumber} className="bg-red-50/50">
                    <td className="px-3 py-2 text-slate-400">{f.rowNumber}</td>
                    <td className="px-3 py-2 font-medium text-slate-700">{f.rawData.name || '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{f.rawData.email || '-'}</td>
                    <td className="px-3 py-2">
                      <div className="space-y-0.5">
                        {(f.reasons ?? []).map((r, i) => (
                          <div key={i} className="flex items-start gap-1 text-red-600">
                            <XCircle size={11} className="flex-shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 성공 목록 (접힌 상태, 10건 이하면 표시) */}
      {result.successes.length > 0 && result.successes.length <= 10 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-green-50">
            <p className="text-sm font-medium text-green-700">등록 성공 ({result.successes.length}건)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: '400px' }}>
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2.5 text-left text-slate-500 font-semibold w-10">행</th>
                  <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">이름</th>
                  <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">이메일</th>
                  <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">사번</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {result.successes.map(s => (
                  <tr key={s.rowNumber} className="hover:bg-green-50/50">
                    <td className="px-3 py-2 text-slate-400">{s.rowNumber}</td>
                    <td className="px-3 py-2 font-medium text-slate-700">{s.rawData.name}</td>
                    <td className="px-3 py-2 text-slate-600">{s.rawData.email}</td>
                    <td className="px-3 py-2 text-slate-500">{s.rawData.employee_number || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result.successes.length > 10 && (
        <p className="text-xs text-slate-500 text-center">
          등록 성공 {result.successes.length}건은 직원 목록에서 확인할 수 있습니다.
        </p>
      )}

      <button onClick={onReset} className="btn-secondary w-full">
        새 파일 업로드
      </button>
    </div>
  )
}
