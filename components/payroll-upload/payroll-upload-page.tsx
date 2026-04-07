'use client'
/* ================================================================
   PayrollUploadPage — CSV 업로드 메인 오케스트레이터
================================================================ */

import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import {
  Upload,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Loader2,
  XCircle,
} from 'lucide-react'
import { UploadSettingsCard }    from './upload-settings-card'
import { FileDropzone }          from './file-dropzone'
import { ColumnMappingCard }     from './column-mapping-card'
import { ValidationSummaryCard } from './validation-summary-card'
import { ValidationErrorList }   from './validation-error-list'
import { PayrollPreviewList }    from './payroll-preview-list'
import { SendPayslipButton }     from '@/components/payroll/send-payslip-button'
import {
  getColumnMappings,
  getEmployeesByCompany,
  uploadPayrollCsv,
} from '@/lib/payroll-upload'
import {
  validateCsvRows,
  transformCsvRows,
} from '@/lib/payroll-upload-utils'
import type {
  ColumnMapping,
  CsvRow,
  ValidationResult,
  PreviewRow,
  EmployeeMaster,
} from '@/types/payroll-upload'
import { cn } from '@/lib/utils'

type Phase = 'setup' | 'validated' | 'uploading' | 'done' | 'failed'
type DropStatus = 'idle' | 'parsing' | 'done'

interface Props {
  companies:     { id: number; name: string }[]
  currentUserId: string
}

export function PayrollUploadPage({ companies, currentUserId: _currentUserId }: Props) {
  // 설정
  const [companyId,    setCompanyId]    = useState(0)
  const [accrualMonth, setAccrualMonth] = useState('')
  const [paymentDate,  setPaymentDate]  = useState('')

  // 파일
  const [fileName,   setFileName]   = useState('')
  const [dropStatus, setDropStatus] = useState<DropStatus>('idle')
  const [csvRows,    setCsvRows]    = useState<CsvRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])

  // Supabase 데이터
  const [mappings,    setMappings]    = useState<ColumnMapping[]>([])
  const [employees,   setEmployees]   = useState<EmployeeMaster[]>([])
  const [loadingMeta, setLoadingMeta] = useState(false)

  // 검증/미리보기
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [previews,   setPreviews]   = useState<PreviewRow[]>([])
  const [phase,      setPhase]      = useState<Phase>('setup')
  const [resultMsg,  setResultMsg]  = useState('')
  const [uploadLogId, setUploadLogId] = useState<number | null>(null)

  /* ── 회사 변경 → 매핑 + 직원 재조회 ── */
  const handleCompanyChange = useCallback(async (id: number) => {
    setCompanyId(id)
    setValidation(null)
    setPreviews([])
    setPhase('setup')
    if (!id) {
      setMappings([])
      setEmployees([])
      return
    }
    setLoadingMeta(true)
    try {
      const [maps, emps] = await Promise.all([
        getColumnMappings(id),
        getEmployeesByCompany(id),
      ])
      setMappings(maps)
      setEmployees(emps)
    } catch (err) {
      console.error('[handleCompanyChange]', err)
    } finally {
      setLoadingMeta(false)
    }
  }, [])

  /* ── 파일 파싱 ── */
  function handleFile(file: File) {
    setFileName(file.name)
    setDropStatus('parsing')
    setValidation(null)
    setPreviews([])
    setPhase('setup')

    Papa.parse<CsvRow>(file, {
      header:         true,
      skipEmptyLines: true,
      encoding:       'UTF-8',
      complete: result => {
        setCsvRows(result.data)
        setCsvHeaders(result.meta.fields ?? [])
        setDropStatus('done')
      },
      error: () => {
        setDropStatus('idle')
        alert('CSV 파일을 읽을 수 없습니다. UTF-8 인코딩 파일인지 확인해주세요.')
      },
    })
  }

  /* ── 클라이언트 검증 ── */
  function handleValidate() {
    if (!companyId || !accrualMonth || csvRows.length === 0 || mappings.length === 0) return
    const result = validateCsvRows(csvRows, employees, mappings, companyId)
    const prevs  = transformCsvRows(
      csvRows, employees, mappings,
      companyId, accrualMonth, paymentDate || null,
    )
    setValidation(result)
    setPreviews(prevs)
    setPhase('validated')
  }

  /* ── 업로드 확정 ── */
  async function handleUpload() {
    if (!validation?.canUpload) return
    setPhase('uploading')

    const result = await uploadPayrollCsv({
      companyId,
      accrualMonth,
      paymentDate: paymentDate || null,
      fileName,
      rows: csvRows,
    })

    if (result.success) {
      setPhase('done')
      setResultMsg(result.message)
      setUploadLogId(result.logId ?? null)
      if (result.validationResult) setValidation(result.validationResult)
    } else {
      setPhase('failed')
      setResultMsg(result.message)
      if (result.validationResult) setValidation(result.validationResult)
    }
  }

  /* ── 초기화 ── */
  function handleReset() {
    setFileName('')
    setDropStatus('idle')
    setCsvRows([])
    setCsvHeaders([])
    setValidation(null)
    setPreviews([])
    setPhase('setup')
    setResultMsg('')
    setUploadLogId(null)
  }

  const canValidate = companyId > 0 && accrualMonth !== '' && csvRows.length > 0 && mappings.length > 0
  const canUpload   = (phase === 'validated' && (validation?.canUpload ?? false)) as boolean
  const stepIdx     = phase === 'setup' ? 0 : phase === 'validated' || phase === 'failed' ? 1 : 2

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* 헤더 */}
      <div>
        <p className="text-xs text-slate-400 mb-1">어드민 › 급여 관리</p>
        <h1 className="text-2xl font-bold text-slate-900">급여 CSV 업로드</h1>
        <p className="text-sm text-slate-500 mt-1">
          검증 후 pay_info_v2에 upsert 저장됩니다. 같은 귀속월 재업로드 시 자동 덮어쓰기.
        </p>
      </div>

      {/* 완료/실패 배너 */}
      {(phase === 'done' || phase === 'failed') && (
        <div className={cn(
          'flex items-start gap-3 px-5 py-4 rounded-2xl',
          phase === 'done' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white',
        )}>
          {phase === 'done'
            ? <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
            : <XCircle size={20} className="flex-shrink-0 mt-0.5" />
          }
          <div className="flex-1">
            <p className="text-sm font-bold">{phase === 'done' ? '업로드 완료!' : '업로드 실패'}</p>
            <p className="text-xs opacity-80 mt-0.5">{resultMsg}</p>
            {phase === 'done' && uploadLogId != null && (
              <p className="text-xs opacity-60 mt-0.5">
                로그 ID: {uploadLogId} (upload_logs 테이블에서 확인)
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {phase === 'done' && companyId > 0 && accrualMonth && (
              <SendPayslipButton
                companyId={companyId}
                accrualMonth={accrualMonth}
                className="bg-white/15 hover:bg-white/25 !text-white !border-white/40 text-xs"
              />
            )}
            <button onClick={handleReset} className="text-white/80 hover:text-white text-xs underline">
              {phase === 'done' ? '새 파일 업로드' : '다시 시도'}
            </button>
          </div>
        </div>
      )}

      {/* 2단 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* 좌: 설정 + 파일 + 매핑 */}
        <div className="space-y-4">
          <UploadSettingsCard
            companies={companies}
            companyId={companyId}
            setCompanyId={handleCompanyChange}
            accrualMonth={accrualMonth}
            setAccrualMonth={setAccrualMonth}
            paymentDate={paymentDate}
            setPaymentDate={setPaymentDate}
            loading={loadingMeta}
          />
          <FileDropzone
            fileName={fileName}
            status={dropStatus}
            onFile={handleFile}
            onClear={handleReset}
          />
          {mappings.length > 0 && (
            <ColumnMappingCard
              mappings={mappings}
              csvHeaders={csvHeaders.length > 0 ? csvHeaders : undefined}
            />
          )}
        </div>

        {/* 우: 검증 결과 + 미리보기 */}
        <div className="space-y-4">
          {!validation && (
            <div className="card border-dashed p-10 text-center text-slate-400">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm font-medium text-slate-500 mb-1">검증 결과가 여기에 표시됩니다</p>
              <p className="text-xs">설정 완료 후 검증하기를 클릭하세요</p>
            </div>
          )}
          {validation && (
            <>
              <ValidationSummaryCard result={validation} />
              {validation.errors.length > 0 && <ValidationErrorList errors={validation.errors} />}
              {previews.length > 0 && <PayrollPreviewList previews={previews} />}
            </>
          )}
        </div>
      </div>

      {/* 액션 바 */}
      <div className="card p-4 space-y-3">
        {/* 진행 단계 */}
        <div className="flex items-center">
          {(['설정·파일', '검증', '확정'] as const).map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                  stepIdx > i  ? 'bg-emerald-500 text-white' :
                  stepIdx === i ? 'bg-blue-600 text-white' :
                  'bg-slate-200 text-slate-500',
                )}>
                  {stepIdx > i ? '✓' : i + 1}
                </div>
                <span className={cn(
                  'text-[10px] font-medium',
                  stepIdx >= i ? 'text-blue-600' : 'text-slate-400',
                )}>{s}</span>
              </div>
              {i < 2 && (
                <div className={cn(
                  'h-0.5 flex-1 mx-1 mb-4',
                  stepIdx > i ? 'bg-emerald-300' : 'bg-slate-200',
                )} />
              )}
            </div>
          ))}
        </div>

        {/* 버튼 영역 */}
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="btn-secondary flex items-center gap-1.5 px-3 text-sm"
          >
            <RefreshCw size={14} />초기화
          </button>

          <button
            onClick={handleValidate}
            disabled={!canValidate || phase === 'uploading'}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
              canValidate && phase !== 'uploading'
                ? 'bg-slate-800 text-white hover:bg-slate-900 active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed',
            )}
          >
            <ShieldCheck size={16} />
            검증하기
            {!canValidate && (
              <span className="text-xs font-normal opacity-60">(설정·파일 필요)</span>
            )}
          </button>

          <button
            onClick={handleUpload}
            disabled={!canUpload || phase === 'done'}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
              canUpload && phase !== 'done'
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed',
            )}
          >
            {phase === 'uploading' ? (
              <><Loader2 size={16} className="animate-spin" />업로드 중...</>
            ) : (
              <><Upload size={16} />업로드 확정</>
            )}
            {phase === 'validated' && !canUpload && (
              <span className="text-xs font-normal opacity-60">(오류 해결 후 가능)</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
