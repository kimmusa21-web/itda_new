'use client'
import { useEffect, useState, useRef } from 'react'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase/client'
import type { Company, CSVRow } from '@/types'
import { formatMonth, cleanAmount } from '@/lib/utils'

// DB 컬럼 목록 (CSV 매핑 대상)
const DB_COLUMNS = [
  { key: 'email',                     label: '이메일 (매칭키) *' },
  { key: 'accrual_month',             label: '귀속월 (YYYY-MM) *' },
  { key: 'payment_date',              label: '급여지급일' },
  { key: 'Start_date',                label: '기산시작일' },
  { key: 'End_date',                  label: '정산종료일' },
  { key: 'Number_of_days',            label: '당월일수' },
  { key: 'working_days',              label: '근무일수' },
  { key: 'Overtime',                  label: '연장근로시간' },
  { key: 'Holiday_working_hours',     label: '휴일근로시간' },
  { key: 'night_work_hours',          label: '야간근로시간' },
  { key: 'Remaining_annual_leave_hours', label: '잔여연차시간' },
  { key: 'base_salary',               label: '기본급' },
  { key: 'overtime_pay_fixed',        label: '고정연장근로수당' },
  { key: 'overtime_pay',              label: '연장근로수당' },
  { key: 'holidaytime_pay',           label: '휴일근로수당' },
  { key: 'nighttime_pay',             label: '야간근로수당' },
  { key: 'meal_allowance',            label: '식대' },
  { key: 'incentive',                 label: '인센티브' },
  { key: 'annual_leave_allowance',    label: '잔여연차수당' },
  { key: 'Other_allowances',          label: '기타수당1' },
  { key: 'Other_allowances2',         label: '기타수당2' },
  { key: 'Holiday_bonus',             label: '명절상여' },
  { key: 'Total_payment',             label: '지급합계' },
  { key: 'national_pension',          label: '국민연금' },
  { key: 'health_insurance',          label: '건강보험' },
  { key: 'longterm_care',             label: '장기요양보험료' },
  { key: 'employment_insurance',      label: '고용보험' },
  { key: 'income_tax',                label: '소득세' },
  { key: 'resident_tax',              label: '주민세' },
  { key: 'student_loan',              label: '학자금대출' },
  { key: 'income_tax_refund',         label: '소득세환급' },
  { key: 'resident_tax_refund',       label: '주민세환급' },
  { key: 'health_insurance_adjustment', label: '건강보험료정산' },
  { key: 'Total_deductible',          label: '공제액합계' },
  { key: 'Other_deductions',          label: '기타공제' },
  { key: 'net_pay',                   label: '최종실수령액 *' },
]

type Step = 'select' | 'mapping' | 'preview' | 'done'

export default function AdminPayrollPage() {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyId, setCompanyId] = useState('')
  const [csvRows, setCsvRows] = useState<CSVRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [step, setStep] = useState<Step>('select')
  const [errors, setErrors] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [batches, setBatches] = useState<any[]>([])

  useEffect(() => {
    supabase.from('companies').select('id,name').order('name').then(({ data }) => setCompanies(data ?? []))
    loadBatches()
  }, [])

  async function loadBatches() {
    const { data } = await supabase
      .from('payroll_batches')
      .select('*, companies(name)')
      .order('created_at', { ascending: false })
      .limit(20)
    setBatches(data ?? [])
  }

  async function loadSavedMapping(cid: string) {
    const { data } = await supabase
      .from('column_mappings')
      .select('csv_column, db_column')
      .eq('company_id', cid)
    if (data && data.length > 0) {
      const m: Record<string, string> = {}
      data.forEach(r => { m[r.csv_column] = r.db_column })
      setMapping(m)
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: result => {
        const rows = result.data as CSVRow[]
        const hdrs = result.meta.fields ?? []
        setCsvRows(rows)
        setHeaders(hdrs)
        // 자동 매핑 시도: CSV 헤더와 DB 컬럼 레이블 비교
        const autoMap: Record<string, string> = {}
        hdrs.forEach(h => {
          const found = DB_COLUMNS.find(c =>
            c.key === h || c.label.replace(' *', '') === h ||
            h.toLowerCase().includes(c.key.toLowerCase())
          )
          if (found) autoMap[h] = found.key
        })
        setMapping(prev => ({ ...autoMap, ...prev }))
        setStep('mapping')
        setErrors([])
      },
      error: () => setErrors(['CSV 파일을 읽을 수 없습니다. UTF-8 인코딩을 확인해주세요.'])
    })
  }

  async function handleCompanyChange(cid: string) {
    setCompanyId(cid)
    if (cid) await loadSavedMapping(cid)
  }

  function validate(): string[] {
    const errs: string[] = []
    const emailCol = Object.entries(mapping).find(([, db]) => db === 'email')?.[0]
    const monthCol = Object.entries(mapping).find(([, db]) => db === 'accrual_month')?.[0]
    const payCol   = Object.entries(mapping).find(([, db]) => db === 'net_pay')?.[0]
    if (!emailCol)  errs.push('이메일 컬럼 매핑이 필요합니다 (직원 매칭 기준)')
    if (!monthCol)  errs.push('귀속월 컬럼 매핑이 필요합니다')
    if (!payCol)    errs.push('최종실수령액 컬럼 매핑이 필요합니다')
    if (!companyId) errs.push('업로드할 기업을 선택해주세요')
    return errs
  }

  function goPreview() {
    const errs = validate()
    if (errs.length > 0) { setErrors(errs); return }
    setErrors([])
    setStep('preview')
  }

  async function upload() {
    const errs = validate()
    if (errs.length > 0) { setErrors(errs); return }
    setUploading(true)
    setErrors([])

    try {
      // 1. 첫 행에서 귀속월 파악
      const monthKey = Object.entries(mapping).find(([, db]) => db === 'accrual_month')?.[0]!
      const rawMonth = csvRows[0]?.[monthKey] ?? ''
      const accrualMonth = rawMonth.match(/^\d{4}-\d{2}$/) ? rawMonth :
        rawMonth.match(/^\d{4}년\d{1,2}월$/) ?
          `${rawMonth.match(/(\d{4})년/)![1]}-${String(rawMonth.match(/(\d{1,2})월/)![1]).padStart(2,'0')}` :
          rawMonth

      // 2. batch 생성 (중복 시 업데이트)
      const { data: batch, error: batchErr } = await supabase
        .from('payroll_batches')
        .upsert({ company_id: Number(companyId), accrual_month: accrualMonth,
                  file_name: fileName, row_count: csvRows.length, status: 'processing' },
                 { onConflict: 'company_id,accrual_month' })
        .select().single()
      if (batchErr) throw batchErr

      // 3. 직원 이메일 목록 가져오기
      const { data: employees } = await supabase
        .from('employees')
        .select('id, email')
        .eq('company_id', companyId)
      const emailMap = new Map(employees?.map(e => [e.email.toLowerCase(), e.id]) ?? [])

      // 4. 각 행 변환 후 upsert
      const uploadErrors: string[] = []
      const rows: any[] = []

      for (const [i, row] of csvRows.entries()) {
        const emailKey = Object.entries(mapping).find(([, db]) => db === 'email')?.[0]!
        const email = row[emailKey]?.trim().toLowerCase()
        const employeeId = emailMap.get(email)
        if (!employeeId) {
          uploadErrors.push(`행 ${i+2}: 이메일 "${email}" 직원을 찾을 수 없습니다`)
          continue
        }

        const record: any = { employee_id: employeeId, company_id: Number(companyId), batch_id: batch.id }
        for (const [csvCol, dbCol] of Object.entries(mapping)) {
          if (!dbCol || dbCol === 'email') continue
          let val = row[csvCol]?.trim() ?? ''
          // 금액 컬럼 정제
          if (['base_salary','overtime_pay_fixed','overtime_pay','holidaytime_pay',
               'nighttime_pay','meal_allowance','incentive','annual_leave_allowance',
               'Other_allowances','Other_allowances2','Holiday_bonus','Total_payment',
               'national_pension','health_insurance','longterm_care','employment_insurance',
               'income_tax','resident_tax','net_pay','student_loan','income_tax_refund',
               'resident_tax_refund','Total_deductible','Other_deductions',
               'health_insurance_adjustment'].includes(dbCol)) {
            val = cleanAmount(val)
          }
          if (dbCol === 'accrual_month' && val.match(/^\d{4}년\d{1,2}월$/)) {
            val = `${val.match(/(\d{4})년/)![1]}-${String(val.match(/(\d{1,2})월/)![1]).padStart(2,'0')}`
          }
          record[dbCol] = val || null
        }
        rows.push(record)
      }

      if (rows.length > 0) {
        const { error: upsertErr } = await supabase
          .from('pay_info')
          .upsert(rows, { onConflict: 'employee_id,accrual_month' })
        if (upsertErr) throw upsertErr
      }

      // 5. 매핑 저장
      const mappingRows = Object.entries(mapping)
        .filter(([, db]) => db)
        .map(([csv, db]) => ({ company_id: Number(companyId), csv_column: csv, db_column: db }))
      await supabase.from('column_mappings')
        .upsert(mappingRows, { onConflict: 'company_id,csv_column' })

      // 6. batch 완료 처리
      await supabase.from('payroll_batches').update({
        status: uploadErrors.length > 0 ? 'error' : 'done',
        row_count: rows.length,
        error_log: uploadErrors.length > 0 ? uploadErrors as any : null,
      }).eq('id', batch.id)

      if (uploadErrors.length > 0) setErrors(uploadErrors)
      setStep('done')
      loadBatches()
    } catch (e: any) {
      setErrors([e.message])
    } finally {
      setUploading(false)
    }
  }

  function reset() {
    setCsvRows([]); setHeaders([]); setFileName('')
    setErrors([]); setStep('select')
    if (fileRef.current) fileRef.current.value = ''
  }

  // 미리보기용 매핑된 데이터 (최대 3행)
  const previewRows = csvRows.slice(0, 3).map(row => {
    const mapped: Record<string, string> = {}
    Object.entries(mapping).forEach(([csv, db]) => {
      if (db) mapped[db] = row[csv] ?? ''
    })
    return mapped
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">급여 CSV 업로드</h1>
        <p className="text-sm text-gray-500 mt-0.5">엑셀 작업 후 CSV로 저장해서 업로드하세요</p>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2 text-xs">
        {['파일 선택', '컬럼 매핑', '미리보기', '완료'].map((s, i) => {
          const stepKeys: Step[] = ['select', 'mapping', 'preview', 'done']
          const active = step === stepKeys[i]
          const done = ['select','mapping','preview','done'].indexOf(step) > i
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                ${active ? 'bg-brand-500 text-white' : done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {done ? '✓' : i+1}
              </div>
              <span className={active ? 'text-brand-600 font-medium' : done ? 'text-green-600' : 'text-gray-400'}>{s}</span>
              {i < 3 && <span className="text-gray-300">›</span>}
            </div>
          )
        })}
      </div>

      {/* 오류 메시지 */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-medium text-red-700 mb-2">처리 중 오류가 발생했습니다</p>
          <ul className="text-xs text-red-600 space-y-1">
            {errors.map((e, i) => <li key={i}>• {e}</li>)}
          </ul>
        </div>
      )}

      {/* STEP 1: 파일 선택 */}
      {step === 'select' && (
        <div className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">기업 선택</label>
            <select className="input max-w-xs" value={companyId} onChange={e => handleCompanyChange(e.target.value)}>
              <option value="">기업을 선택하세요</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">CSV 파일</label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-brand-400 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}>
              <div className="text-4xl mb-3">📄</div>
              <p className="text-sm font-medium text-gray-700">{fileName || 'CSV 파일을 선택하세요'}</p>
              <p className="text-xs text-gray-400 mt-1">UTF-8 인코딩 CSV 파일 · Excel에서 "CSV UTF-8"로 저장</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: 컬럼 매핑 */}
      {step === 'mapping' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">컬럼 매핑</h2>
              <p className="text-xs text-gray-500 mt-0.5">CSV 헤더와 급여 항목을 연결하세요. 저장되면 다음에 자동 적용됩니다.</p>
            </div>
          </div>
          <div className="divide-y divide-gray-50 max-h-[50vh] overflow-y-auto">
            {headers.map(h => (
              <div key={h} className="px-5 py-3 flex items-center gap-4">
                <span className="text-sm font-mono text-gray-700 w-48 shrink-0 truncate" title={h}>{h}</span>
                <span className="text-gray-300">→</span>
                <select className="input flex-1"
                  value={mapping[h] ?? ''}
                  onChange={e => setMapping(p => ({ ...p, [h]: e.target.value }))}>
                  <option value="">(매핑 안함)</option>
                  {DB_COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
            <button onClick={reset} className="btn-secondary">처음으로</button>
            <button onClick={goPreview} className="btn-primary flex-1">미리보기 확인 →</button>
          </div>
        </div>
      )}

      {/* STEP 3: 미리보기 */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="card p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-700">
              총 <strong>{csvRows.length}명</strong>의 급여 데이터를 업로드합니다.
              아래에서 처음 3명의 데이터를 확인하세요.
            </p>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.entries(mapping).filter(([,db]) => db).map(([,db]) => (
                      <th key={db} className="px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap">
                        {DB_COLUMNS.find(c => c.key === db)?.label ?? db}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {Object.entries(mapping).filter(([,db]) => db).map(([,db]) => (
                        <td key={db} className="px-3 py-2 text-gray-700 whitespace-nowrap">{row[db] ?? '-'}</td>
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

      {/* STEP 4: 완료 */}
      {step === 'done' && (
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">{errors.length > 0 ? '⚠️' : '✅'}</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {errors.length > 0 ? '일부 오류가 발생했습니다' : '업로드 완료!'}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {errors.length > 0
              ? `${csvRows.length - errors.length}건 성공 · ${errors.length}건 실패`
              : `${csvRows.length}명의 급여 데이터가 등록되었습니다`}
          </p>
          <button onClick={reset} className="btn-primary">새 파일 업로드</button>
        </div>
      )}

      {/* 업로드 이력 */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">업로드 이력</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {batches.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">이력이 없습니다</p>
          ) : batches.map((b: any) => (
            <div key={b.id} className="px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{b.companies?.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatMonth(b.accrual_month)} · {b.row_count}명 · {b.file_name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(b.created_at).toLocaleString('ko-KR')}
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
