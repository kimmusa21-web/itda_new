'use client'

import { useEffect, useState, useRef } from 'react'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase/client'
import { formatMonth, cleanAmount } from '@/lib/utils'
import { Upload, CheckCircle2, AlertTriangle, ChevronRight, FileText } from 'lucide-react'

const DB_COLUMNS = [
  { key: 'email',              label: '이메일 (매칭키) *' },
  { key: 'accrual_month',      label: '귀속월 (YYYY-MM) *' },
  { key: 'payment_date',       label: '급여지급일' },
  { key: 'base_salary',        label: '기본급' },
  { key: 'meal_allowance',     label: '식대' },
  { key: 'overtime_pay_fixed', label: '고정연장근로수당' },
  { key: 'overtime_pay',       label: '연장근로수당' },
  { key: 'holidaytime_pay',    label: '휴일근로수당' },
  { key: 'nighttime_pay',      label: '야간근로수당' },
  { key: 'incentive',          label: '인센티브' },
  { key: 'Other_allowances',   label: '기타수당1' },
  { key: 'Other_allowances2',  label: '기타수당2' },
  { key: 'Holiday_bonus',      label: '명절상여' },
  { key: 'Total_payment',      label: '지급합계' },
  { key: 'national_pension',   label: '국민연금' },
  { key: 'health_insurance',   label: '건강보험' },
  { key: 'longterm_care',      label: '장기요양보험료' },
  { key: 'employment_insurance', label: '고용보험' },
  { key: 'income_tax',         label: '소득세' },
  { key: 'resident_tax',       label: '주민세' },
  { key: 'Total_deductible',   label: '공제합계' },
  { key: 'net_pay',            label: '최종실수령액 *' },
  { key: 'working_days',       label: '근무일수' },
  { key: 'Overtime',           label: '연장근로시간' },
]

type Step = 'select' | 'mapping' | 'preview' | 'done'

export default function AdminPayrollPage() {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [companies, setCompanies] = useState<any[]>([])
  const [companyId, setCompanyId] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [fileName, setFileName] = useState('')
  const [step, setStep] = useState<Step>('select')
  const [errors, setErrors] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [batches, setBatches] = useState<any[]>([])

  useEffect(() => {
    supabase.from('companies').select('id,name').order('name').then(({ data }) => setCompanies(data ?? []))
    loadBatches()
  }, [])

  async function loadBatches() {
    const { data } = await supabase
      .from('payroll_batches').select('*, companies(name)')
      .order('created_at', { ascending: false }).limit(10)
    setBatches(data ?? [])
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    Papa.parse(file, {
      header: true, skipEmptyLines: true, encoding: 'UTF-8',
      complete: (result) => {
        const rows = result.data as Record<string,string>[]
        const hdrs = result.meta.fields ?? []
        setCsvRows(rows); setHeaders(hdrs)
        const autoMap: Record<string, string> = {}
        hdrs.forEach(h => {
          const found = DB_COLUMNS.find(c => c.key === h || c.label.replace(' *','') === h)
          if (found) autoMap[h] = found.key
        })
        setMapping(autoMap)
        setStep('mapping'); setErrors([])
      },
      error: () => setErrors(['CSV 파일을 읽을 수 없습니다. UTF-8 인코딩을 확인하세요.']),
    })
  }

  function validate() {
    const errs: string[] = []
    if (!companyId) errs.push('기업을 선택해주세요')
    if (!Object.values(mapping).includes('email')) errs.push('이메일 컬럼 매핑이 필요합니다')
    if (!Object.values(mapping).includes('accrual_month')) errs.push('귀속월 컬럼 매핑이 필요합니다')
    if (!Object.values(mapping).includes('net_pay')) errs.push('최종실수령액 컬럼 매핑이 필요합니다')
    return errs
  }

  function goPreview() {
    const errs = validate(); if (errs.length) { setErrors(errs); return }
    setErrors([]); setStep('preview')
  }

  async function upload() {
    const errs = validate(); if (errs.length) { setErrors(errs); return }
    setUploading(true); setErrors([])
    try {
      const monthKey = Object.entries(mapping).find(([,db]) => db === 'accrual_month')?.[0]!
      const rawMonth = csvRows[0]?.[monthKey] ?? ''
      const accrualMonth = rawMonth.match(/^\d{4}-\d{2}$/) ? rawMonth :
        rawMonth.match(/^\d{4}년\d{1,2}월$/) ?
          `${rawMonth.match(/(\d{4})년/)![1]}-${String(rawMonth.match(/(\d{1,2})월/)![1]).padStart(2,'0')}` : rawMonth

      const { data: batch } = await supabase.from('payroll_batches')
        .upsert({ company_id: Number(companyId), accrual_month: accrualMonth,
                  file_name: fileName, row_count: csvRows.length, status: 'processing' },
                 { onConflict: 'company_id,accrual_month' })
        .select().single()

      const { data: employees } = await supabase.from('employees').select('id,email').eq('company_id', companyId)
      const emailMap = new Map(employees?.map(e => [e.email.toLowerCase(), e.id]) ?? [])
      const uploadErrors: string[] = []
      const rows: any[] = []

      for (const [i, row] of csvRows.entries()) {
        const emailKey = Object.entries(mapping).find(([,db]) => db === 'email')?.[0]!
        const email = row[emailKey]?.trim().toLowerCase()
        const employeeId = emailMap.get(email)
        if (!employeeId) { uploadErrors.push(`행 ${i+2}: "${email}" 직원 없음`); continue }
        const record: any = { employee_id: employeeId, company_id: Number(companyId), batch_id: batch?.id }
        for (const [csvCol, dbCol] of Object.entries(mapping)) {
          if (!dbCol || dbCol === 'email') continue
          let val = row[csvCol]?.trim() ?? ''
          if (dbCol === 'accrual_month' && val.match(/^\d{4}년\d{1,2}월$/))
            val = `${val.match(/(\d{4})년/)![1]}-${String(val.match(/(\d{1,2})월/)![1]).padStart(2,'0')}`
          record[dbCol] = val || null
        }
        rows.push(record)
      }

      if (rows.length > 0) {
        await supabase.from('pay_info').upsert(rows, { onConflict: 'employee_id,accrual_month' })
      }
      await supabase.from('column_mappings')
        .upsert(Object.entries(mapping).filter(([,db])=>db).map(([csv,db]) =>
          ({ company_id: Number(companyId), csv_column: csv, db_column: db })),
          { onConflict: 'company_id,csv_column' })
      await supabase.from('payroll_batches').update({
        status: uploadErrors.length > 0 ? 'error' : 'done',
        row_count: rows.length, error_log: uploadErrors.length ? uploadErrors as any : null,
      }).eq('id', batch?.id)

      if (uploadErrors.length) setErrors(uploadErrors)
      setStep('done'); loadBatches()
    } catch (e: any) { setErrors([e.message]) }
    setUploading(false)
  }

  function reset() {
    setCsvRows([]); setHeaders([]); setFileName(''); setErrors([]); setStep('select')
    if (fileRef.current) fileRef.current.value = ''
  }

  const previewRows = csvRows.slice(0, 3)
  const mappedCols = Object.entries(mapping).filter(([,db]) => db)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">급여 관리</h1>
        <p className="text-sm text-slate-500 mt-0.5">CSV 업로드로 월별 급여 데이터를 등록하세요</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        {(['select','mapping','preview','done'] as Step[]).map((s, i) => {
          const labels = ['파일 선택','컬럼 매핑','미리보기','완료']
          const stepIdx = ['select','mapping','preview','done'].indexOf(step)
          const active = step === s; const done = stepIdx > i
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                ${active ? 'bg-blue-600 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {done ? '✓' : i+1}
              </div>
              <span className={active ? 'text-blue-600 font-medium' : done ? 'text-emerald-600' : 'text-slate-400'}>{labels[i]}</span>
              {i < 3 && <ChevronRight size={12} className="text-slate-300" />}
            </div>
          )
        })}
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle size={15} className="text-red-500" />
            <p className="text-sm font-medium text-red-700">오류가 있습니다</p>
          </div>
          <ul className="text-xs text-red-600 space-y-0.5">
            {errors.map((e, i) => <li key={i}>· {e}</li>)}
          </ul>
        </div>
      )}

      {step === 'select' && (
        <div className="card p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">기업 선택</label>
            <select className="input max-w-xs" value={companyId} onChange={e => setCompanyId(e.target.value)}>
              <option value="">기업을 선택하세요</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">CSV 파일</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer"
            >
              <FileText size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-600">{fileName || 'CSV 파일을 클릭하여 선택하세요'}</p>
              <p className="text-xs text-slate-400 mt-1">UTF-8 인코딩 · Excel에서 "CSV UTF-8"으로 저장</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </div>
          </div>
        </div>
      )}

      {step === 'mapping' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">컬럼 매핑</p>
            <p className="text-xs text-slate-500 mt-0.5">CSV 헤더와 급여 항목을 연결하세요</p>
          </div>
          <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
            {headers.map(h => (
              <div key={h} className="px-5 py-3 flex items-center gap-3">
                <span className="text-sm font-mono text-slate-700 w-40 shrink-0 truncate">{h}</span>
                <ChevronRight size={13} className="text-slate-300 shrink-0" />
                <select className="input flex-1 py-1.5 text-sm" value={mapping[h] ?? ''}
                  onChange={e => setMapping(p => ({ ...p, [h]: e.target.value }))}>
                  <option value="">(매핑 안함)</option>
                  {DB_COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
            <button onClick={reset} className="btn-secondary">처음으로</button>
            <button onClick={goPreview} className="btn-primary flex-1">미리보기 →</button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            총 <strong>{csvRows.length}명</strong>의 급여 데이터를 업로드합니다. 아래에서 샘플 3행을 확인하세요.
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: '600px' }}>
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {mappedCols.map(([,db]) => (
                      <th key={db} className="px-3 py-2.5 text-left text-slate-500 font-medium whitespace-nowrap">
                        {DB_COLUMNS.find(c => c.key === db)?.label ?? db}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {mappedCols.map(([csv, db]) => (
                        <td key={db} className="px-3 py-2.5 text-slate-700 whitespace-nowrap">{row[csv] ?? '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep('mapping')} className="btn-secondary">매핑 수정</button>
            <button onClick={upload} className="btn-primary flex-1" disabled={uploading}>
              {uploading ? '업로드 중...' : `${csvRows.length}명 업로드 확정`}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="card p-10 text-center">
          <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-4" />
          <p className="text-base font-semibold text-slate-900 mb-1">
            {errors.length > 0 ? '일부 오류가 발생했습니다' : '업로드 완료!'}
          </p>
          <p className="text-sm text-slate-500 mb-6">
            {errors.length > 0 ? `${csvRows.length - errors.length}건 성공 · ${errors.length}건 실패` : `${csvRows.length}명 등록 완료`}
          </p>
          <button onClick={reset} className="btn-primary">새 파일 업로드</button>
        </div>
      )}

      {/* Upload history */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">업로드 이력</p>
        </div>
        <div className="divide-y divide-slate-50">
          {batches.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400 text-center">이력이 없습니다</p>
          ) : batches.map((b: any) => (
            <div key={b.id} className="px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">{b.companies?.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatMonth(b.accrual_month)} · {b.row_count}명 · {b.file_name}
                </p>
              </div>
              <span className={`badge ${b.status==='done' ? 'badge-green' : b.status==='error' ? 'badge-red' : 'badge-yellow'}`}>
                {b.status==='done' ? '완료' : b.status==='error' ? '오류' : '처리중'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
