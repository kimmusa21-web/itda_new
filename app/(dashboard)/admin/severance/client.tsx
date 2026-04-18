'use client'
/* ================================================================
   퇴직금 산정 — Admin 전용
   근거: 근로기준법 제34조, 퇴직급여법, 소득세법 제48조
================================================================ */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  computeSegments,
  computeSeverance,
  computeRetirementTax,
  parseDate,
  fmtDate,
  type MonthSegment,
  type MonthlyPayInput,
  type SeveranceResult,
  type RetirementTaxResult,
} from '@/lib/severance-calc'
import { toAccrualDate, toAccrualMonth } from '@/lib/payslip-utils'
import { Search, Printer, RefreshCw, ChevronDown, ChevronUp, Pencil, Calculator } from 'lucide-react'

/* ── 타입 ── */
interface Company  { id: number; name: string }
interface Employee { id: number; name: string; email: string; Date_of_joining: string | null }
interface Props     { companies: Company[] }

/* ── 숫자 포맷 헬퍼 ── */
function krw(n: number) { return Math.round(n).toLocaleString('ko-KR') }

/* ── 천단위 숫자 입력 ── */
function NumInput({
  value, onChange, className = '',
}: { value: number; onChange: (v: number) => void; className?: string }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value === 0 ? '' : value.toLocaleString('ko-KR')}
      onChange={e => {
        const raw = e.target.value.replace(/[^0-9]/g, '')
        onChange(raw === '' ? 0 : Number(raw))
      }}
      className={`input text-right tabular-nums ${className}`}
    />
  )
}

/* ── 세율 표 행 ── */
function TaxRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-1.5 px-3 rounded-lg text-xs ${highlight ? 'bg-amber-50 font-semibold' : ''}`}>
      <span className="text-slate-500">{label}</span>
      <span className={highlight ? 'text-amber-700' : 'text-slate-700 font-medium tabular-nums'}>{value}</span>
    </div>
  )
}

/* ── 메인 컴포넌트 ── */
export default function SeveranceClient({ companies }: Props) {
  const supabase = createClient()

  /* ── Step 1: 기본 정보 ── */
  const [companyId,      setCompanyId]      = useState<number>(0)
  const [employees,      setEmployees]      = useState<Employee[]>([])
  const [empLoading,     setEmpLoading]     = useState(false)
  const [employeeId,     setEmployeeId]     = useState<number>(0)
  const [selectedEmp,    setSelectedEmp]    = useState<Employee | null>(null)
  const [retirementDate, setRetirementDate] = useState<string>('')

  /* ── Step 2: 급여 데이터 ── */
  const [segments,    setSegments]    = useState<MonthSegment[]>([])
  const [monthlyData, setMonthlyData] = useState<Record<string, MonthlyPayInput>>({})
  const [fetching,    setFetching]    = useState(false)
  const [fetched,     setFetched]     = useState(false)

  /* ── Step 3: 추가 입력 ── */
  const [annualBonus,      setAnnualBonus]      = useState(0)
  const [annualLeaveAllow, setAnnualLeaveAllow] = useState(0)
  const [otherDeductions,  setOtherDeductions]  = useState(0)

  /* ── 퇴직소득세 모드 ── */
  const [taxMode,     setTaxMode]     = useState<'auto' | 'manual'>('auto')
  const [incomeTax,   setIncomeTax]   = useState(0)
  const [taxOpen,     setTaxOpen]     = useState(false)

  /* ── 회사 선택 → 직원 조회 ── */
  const handleCompanyChange = useCallback(async (cid: number) => {
    setCompanyId(cid)
    setEmployeeId(0)
    setSelectedEmp(null)
    setFetched(false)
    setSegments([])
    if (!cid) { setEmployees([]); return }
    setEmpLoading(true)
    const { data } = await supabase
      .from('employees')
      .select('id, name, email, Date_of_joining')
      .eq('company_id', cid)
      .order('name')
    setEmployees((data ?? []) as Employee[])
    setEmpLoading(false)
  }, [supabase])

  /* ── 직원 선택 ── */
  function handleEmployeeChange(eid: number) {
    setEmployeeId(eid)
    setSelectedEmp(employees.find(e => e.id === eid) ?? null)
    setFetched(false)
    setSegments([])
  }

  /* ── 자동 조회 ── */
  async function handleFetch() {
    if (!employeeId || !retirementDate || !selectedEmp?.Date_of_joining) return
    setFetching(true)
    setFetched(false)

    const segs = computeSegments(retirementDate)
    setSegments(segs)

    const accrualMonths = segs.map(s => toAccrualDate(s.yearMonth))
    const { data } = await supabase
      .from('pay_info_v2')
      .select('accrual_month, base_salary, total_earnings')
      .eq('employee_id', employeeId)
      .in('accrual_month', accrualMonths)

    const newData: Record<string, MonthlyPayInput> = {}
    for (const row of (data ?? [])) {
      const ym    = toAccrualMonth(row.accrual_month as string)
      const base  = Number(row.base_salary   ?? 0)
      const total = Number(row.total_earnings ?? 0)
      newData[ym] = { yearMonth: ym, baseSalary: base, allowances: Math.max(0, total - base) }
    }
    for (const seg of segs) {
      if (!newData[seg.yearMonth]) {
        newData[seg.yearMonth] = { yearMonth: seg.yearMonth, baseSalary: 0, allowances: 0 }
      }
    }

    setMonthlyData(newData)
    setFetched(true)
    setFetching(false)
  }

  /* ── 월별 급여 수정 ── */
  function updateMonthlyData(ym: string, field: 'baseSalary' | 'allowances', value: number) {
    setMonthlyData(prev => ({ ...prev, [ym]: { ...prev[ym], [field]: value } }))
  }

  /* ── 퇴직금 산정 결과 ── */
  const result = useMemo<SeveranceResult | null>(() => {
    if (!fetched || segments.length === 0 || !selectedEmp?.Date_of_joining || !retirementDate) return null
    try {
      return computeSeverance({
        hireDate: selectedEmp.Date_of_joining,
        retirementDate,
        segments,
        monthlyData,
        annualBonus,
        annualLeaveAllow,
        incomeTax,
        otherDeductions,
      })
    } catch { return null }
  }, [fetched, segments, monthlyData, annualBonus, annualLeaveAllow, incomeTax, otherDeductions, selectedEmp, retirementDate])

  /* ── 퇴직소득세 자동 계산 ── */
  const taxBreakdown = useMemo<RetirementTaxResult | null>(() => {
    if (!result || !selectedEmp?.Date_of_joining || !retirementDate || result.severancePay <= 0) return null
    try {
      return computeRetirementTax(result.severancePay, selectedEmp.Date_of_joining, retirementDate)
    } catch { return null }
  }, [result?.severancePay, selectedEmp?.Date_of_joining, retirementDate])

  /* ── auto 모드일 때 세액 동기화 ── */
  useEffect(() => {
    if (taxMode === 'auto' && taxBreakdown) {
      setIncomeTax(taxBreakdown.incomeTax)
    }
  }, [taxMode, taxBreakdown])

  const canFetch = companyId > 0 && employeeId > 0 && retirementDate !== '' && !!selectedEmp?.Date_of_joining

  /* ── 렌더 ── */
  return (
    <div className="space-y-6 max-w-5xl mx-auto print:max-w-none">

      {/* 페이지 헤더 */}
      <div className="flex items-start justify-between print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">퇴직금 산정</h1>
          <p className="text-sm text-slate-500 mt-0.5">근로기준법 제34조 · 소득세법 제48조</p>
        </div>
        {result && (
          <button onClick={() => window.print()} className="flex items-center gap-1.5 btn-secondary text-sm">
            <Printer size={14} /> 인쇄
          </button>
        )}
      </div>

      {/* ── Step 1: 기본 정보 ── */}
      <div className="card p-5 space-y-4 print:hidden">
        <h2 className="text-sm font-bold text-slate-700">기본 정보 입력</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">회사</label>
            <select className="input" value={companyId} onChange={e => handleCompanyChange(Number(e.target.value))}>
              <option value={0}>회사 선택</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">직원</label>
            <select
              className="input"
              value={employeeId}
              onChange={e => handleEmployeeChange(Number(e.target.value))}
              disabled={!companyId || empLoading}
            >
              <option value={0}>{empLoading ? '조회 중...' : '직원 선택'}</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">퇴사일 (산정사유발생일)</label>
            <input
              type="date"
              className="input"
              value={retirementDate}
              onChange={e => { setRetirementDate(e.target.value); setFetched(false) }}
            />
          </div>
        </div>

        {selectedEmp && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-2.5">
            <span className="font-medium text-slate-700">{selectedEmp.name}</span>
            <span>·</span>
            <span>입사일: <span className="font-medium text-slate-700">{selectedEmp.Date_of_joining ?? '미등록'}</span></span>
            {retirementDate && selectedEmp.Date_of_joining && (
              <>
                <span>·</span>
                <span>근속일수: <span className="font-semibold text-blue-600">
                  {Math.round((parseDate(retirementDate).getTime() - parseDate(selectedEmp.Date_of_joining).getTime()) / 86400000).toLocaleString('ko-KR')}일
                </span></span>
              </>
            )}
          </div>
        )}

        <button
          onClick={handleFetch}
          disabled={!canFetch || fetching}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {fetching
            ? <><RefreshCw size={14} className="animate-spin" />조회 중...</>
            : <><Search size={14} />급여 자동 조회 · 산정 시작</>
          }
        </button>
      </div>

      {/* 인쇄용 헤더 */}
      {result && (
        <div className="hidden print:block border-b-2 border-slate-800 pb-3 mb-4">
          <h1 className="text-2xl font-bold text-center mb-3">퇴직금 산정 내역서</h1>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>사업장명: <strong>{companies.find(c => c.id === companyId)?.name}</strong></div>
            <div>근로자성명: <strong>{selectedEmp?.name}</strong></div>
            <div>입사일: <strong>{result.hireDate}</strong></div>
            <div>퇴사일: <strong>{result.retirementDate}</strong></div>
          </div>
        </div>
      )}

      {/* ── 근속 정보 ── */}
      {result && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card rounded-xl text-center">
            <p className="stat-label">입사일</p>
            <p className="text-base font-semibold text-slate-900 mt-1">{result.hireDate}</p>
          </div>
          <div className="stat-card rounded-xl text-center">
            <p className="stat-label">퇴사일</p>
            <p className="text-base font-semibold text-slate-900 mt-1">{result.retirementDate}</p>
          </div>
          <div className="stat-card rounded-xl text-center">
            <p className="stat-label">총 근속일수</p>
            <p className="text-base font-semibold text-blue-600 mt-1">{result.serviceDays.toLocaleString('ko-KR')}일</p>
          </div>
        </div>
      )}

      {/* ── 평균임금 산정표 ── */}
      {fetched && segments.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Calculator size={15} className="text-blue-500" />
            <h2 className="text-sm font-bold text-slate-700">평균임금 산정 — 최근 3개월</h2>
            <span className="text-xs text-slate-400 ml-1">(총 {result?.totalDays ?? 0}일)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: 560 }}>
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-slate-500 font-semibold w-32">항목</th>
                  {segments.map(seg => (
                    <th key={seg.yearMonth} className="px-3 py-2.5 text-center text-slate-600 font-semibold whitespace-nowrap">
                      {Number(seg.yearMonth.split('-')[1])}월
                      <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                        {seg.periodStart.slice(5)} ~ {seg.periodEnd.slice(5)}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center text-slate-700 font-bold bg-blue-50/60">합계</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <tr className="bg-slate-50/40">
                  <td className="px-4 py-2 text-slate-500 font-medium">산정일수(분자)</td>
                  {segments.map(seg => (
                    <td key={seg.yearMonth} className="px-3 py-2 text-center font-medium text-slate-700">{seg.daysInPeriod}일</td>
                  ))}
                  <td className="px-3 py-2 text-center font-bold text-blue-600 bg-blue-50/40">{result?.totalDays ?? 0}일</td>
                </tr>
                <tr className="bg-slate-50/40">
                  <td className="px-4 py-2 text-slate-500 font-medium">해당월 일수(분모)</td>
                  {segments.map(seg => (
                    <td key={seg.yearMonth} className="px-3 py-2 text-center text-slate-500">{seg.daysInMonth}일</td>
                  ))}
                  <td className="px-3 py-2 bg-blue-50/40" />
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-slate-700 font-medium">기본급 (월)</td>
                  {segments.map(seg => (
                    <td key={seg.yearMonth} className="px-2 py-1.5">
                      <NumInput
                        value={monthlyData[seg.yearMonth]?.baseSalary ?? 0}
                        onChange={v => updateMonthlyData(seg.yearMonth, 'baseSalary', v)}
                        className="w-full text-xs py-1.5"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-medium text-slate-700 bg-blue-50/40 whitespace-nowrap">
                    {krw(result?.totalBasePay ?? 0)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-slate-700 font-medium">제수당 (월)</td>
                  {segments.map(seg => (
                    <td key={seg.yearMonth} className="px-2 py-1.5">
                      <NumInput
                        value={monthlyData[seg.yearMonth]?.allowances ?? 0}
                        onChange={v => updateMonthlyData(seg.yearMonth, 'allowances', v)}
                        className="w-full text-xs py-1.5"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-medium text-slate-700 bg-blue-50/40 whitespace-nowrap">
                    {krw(result?.totalAllowances ?? 0)}
                  </td>
                </tr>
                <tr className="border-t-2 border-slate-200">
                  <td className="px-4 py-2 text-slate-400 text-[10px]">기본급 (일할)</td>
                  {(result?.segmentResults ?? []).map(sr => (
                    <td key={sr.segment.yearMonth} className="px-3 py-2 text-right text-slate-400 whitespace-nowrap">{krw(sr.proRatedBase)}</td>
                  ))}
                  <td className="px-3 py-2 bg-blue-50/40" />
                </tr>
                <tr>
                  <td className="px-4 py-2 text-slate-400 text-[10px]">제수당 (일할)</td>
                  {(result?.segmentResults ?? []).map(sr => (
                    <td key={sr.segment.yearMonth} className="px-3 py-2 text-right text-slate-400 whitespace-nowrap">{krw(sr.proRatedAllow)}</td>
                  ))}
                  <td className="px-3 py-2 bg-blue-50/40" />
                </tr>
                <tr className="bg-blue-50/30 font-semibold">
                  <td className="px-4 py-2.5 text-slate-800">소계</td>
                  {(result?.segmentResults ?? []).map(sr => (
                    <td key={sr.segment.yearMonth} className="px-3 py-2.5 text-right text-slate-800 whitespace-nowrap">{krw(sr.subtotal)}</td>
                  ))}
                  <td className="px-3 py-2.5 text-right font-bold text-blue-700 bg-blue-50 whitespace-nowrap">
                    {krw((result?.totalBasePay ?? 0) + (result?.totalAllowances ?? 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 상여금 / 연차수당 ── */}
      {fetched && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">상여금 · 연차수당 (연간 총액 입력)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                연간 상여금 총액 <span className="text-slate-400 font-normal">(3개월분 = × 3/12)</span>
              </label>
              <NumInput value={annualBonus} onChange={setAnnualBonus} />
              {annualBonus > 0 && <p className="text-xs text-blue-600 mt-1">→ 3개월: {krw(annualBonus * 3 / 12)}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                연간 연차수당 총액 <span className="text-slate-400 font-normal">(3개월분 = × 3/12)</span>
              </label>
              <NumInput value={annualLeaveAllow} onChange={setAnnualLeaveAllow} />
              {annualLeaveAllow > 0 && <p className="text-xs text-blue-600 mt-1">→ 3개월: {krw(annualLeaveAllow * 3 / 12)}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── 평균임금 + 퇴직금 ── */}
      {result && (
        <>
          <div className="card p-5 bg-slate-800 text-white">
            <h2 className="text-xs font-semibold text-slate-400 mb-3">평균임금 계산</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-slate-300">3개월 총임금액</span>
              <span className="text-white font-bold text-base">{krw(result.total3mAmount)}</span>
              <span className="text-slate-400">÷</span>
              <span className="text-slate-300">총일수 {result.totalDays}일</span>
              <span className="text-slate-400">=</span>
              <span className="text-yellow-300 font-bold text-lg">1일 평균임금 {krw(result.averageWage)}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-400">
              <div>기본급 합계<br /><span className="text-white font-medium">{krw(result.totalBasePay)}</span></div>
              <div>제수당 합계<br /><span className="text-white font-medium">{krw(result.totalAllowances)}</span></div>
              <div>3개월 상여금<br /><span className="text-white font-medium">{krw(result.bonus3m)}</span></div>
              <div>3개월 연차수당<br /><span className="text-white font-medium">{krw(result.leaveAllow3m)}</span></div>
            </div>
          </div>

          <div className="card p-5 border-2 border-blue-200 bg-blue-50/30">
            <h2 className="text-xs font-semibold text-slate-500 mb-3">퇴직금 계산</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-slate-600">1일 평균임금 {krw(result.averageWage)}</span>
              <span className="text-slate-400">× 30일 ×</span>
              <span className="text-slate-600">근속일수 {result.serviceDays.toLocaleString('ko-KR')}일</span>
              <span className="text-slate-400">÷ 365 =</span>
              <span className="text-blue-700 font-bold text-xl">{krw(result.severancePay)}</span>
            </div>
          </div>
        </>
      )}

      {/* ── 퇴직소득세 ── */}
      {result && taxBreakdown && (
        <div className="card overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">퇴직소득세 계산</h2>
            <div className="flex items-center gap-2">
              {/* 자동/수동 토글 */}
              <span className="text-xs text-slate-400">세액 모드:</span>
              <button
                onClick={() => setTaxMode(taxMode === 'auto' ? 'manual' : 'auto')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  taxMode === 'auto'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-orange-100 text-orange-700'
                }`}
              >
                {taxMode === 'auto'
                  ? <><Calculator size={12} />자동 계산</>
                  : <><Pencil size={12} />수동 입력</>
                }
              </button>
              {/* 세부 내역 토글 */}
              <button
                onClick={() => setTaxOpen(!taxOpen)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
              >
                세부 내역
                {taxOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          </div>

          {/* 세부 내역 (펼침) */}
          {taxOpen && (
            <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">소득세법 제48조 산출 근거</p>
              <TaxRow label="근속월수" value={`${taxBreakdown.serviceMonths}개월`} />
              <TaxRow label="근속연수" value={`${taxBreakdown.serviceYears}년`} />
              <TaxRow label="퇴직금액" value={`${krw(result.severancePay)}원`} />
              <TaxRow label="근속년수별 퇴직소득공제" value={`${krw(taxBreakdown.serviceYearDeduction)}원`} />
              <TaxRow label="환산급여  = (퇴직금 − 공제) × 12 ÷ 근속연수" value={`${krw(taxBreakdown.convertedSalary)}원`} />
              <TaxRow label="환산급여공제" value={`${krw(taxBreakdown.convertedSalaryDeduction)}원`} />
              <TaxRow label="과세표준  = 환산급여 − 환산급여공제" value={`${krw(taxBreakdown.taxBase)}원`} highlight />
              <TaxRow label="환산산출세액 (기본세율 적용)" value={`${krw(taxBreakdown.convertedTax)}원`} />
              <TaxRow label="산출세액  = 환산산출세액 ÷ 12 × 근속연수" value={`${krw(taxBreakdown.calculatedTax)}원`} />
              <div className="border-t border-slate-200 pt-2 mt-2 space-y-1">
                <TaxRow label="소득세 (10원 단위 절사)" value={`${krw(taxBreakdown.incomeTax)}원`} highlight />
                <TaxRow label="주민세 = 소득세 × 10% (10원 단위 절사)" value={`${krw(taxBreakdown.residentTax)}원`} highlight />
                <TaxRow label="납부세액 합계" value={`${krw(taxBreakdown.totalTax)}원`} highlight />
              </div>
            </div>
          )}

          {/* 공제 입력 */}
          <div className="p-5 space-y-3">
            {/* 소득세 */}
            <div className="grid grid-cols-3 gap-4 items-center text-sm">
              <label className="text-slate-600 text-right">퇴직소득세</label>
              <div className="col-span-2 max-w-52">
                {taxMode === 'auto' ? (
                  <div className="flex items-center gap-2">
                    <div className="input bg-blue-50 text-right font-medium text-blue-700 tabular-nums flex-1">
                      {krw(incomeTax)}
                    </div>
                    <span className="text-xs text-blue-500 whitespace-nowrap">자동</span>
                  </div>
                ) : (
                  <NumInput value={incomeTax} onChange={setIncomeTax} />
                )}
              </div>
            </div>
            {/* 주민세 */}
            <div className="grid grid-cols-3 gap-4 items-center text-sm">
              <label className="text-slate-600 text-right">퇴직주민세 <span className="text-xs text-slate-400">(소득세×10%)</span></label>
              <div className="col-span-2 px-4 py-2 bg-slate-50 rounded-xl text-slate-700 font-medium max-w-52 text-right tabular-nums">
                {krw(result.residentTax)}
              </div>
            </div>
            {/* 기타 공제 */}
            <div className="grid grid-cols-3 gap-4 items-center text-sm">
              <label className="text-slate-600 text-right">기타 공제</label>
              <div className="col-span-2 max-w-52">
                <NumInput value={otherDeductions} onChange={setOtherDeductions} />
              </div>
            </div>
            {/* 합계 */}
            <div className="grid grid-cols-3 gap-4 items-center text-sm pt-2 border-t border-slate-100">
              <label className="text-slate-700 font-semibold text-right">공제 합계</label>
              <div className="col-span-2 text-red-600 font-bold text-base px-4">
                −{krw(result.totalDeductions)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 세금 계산 전 공제 카드 (taxBreakdown 없을 때) */}
      {fetched && result && !taxBreakdown && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">공제액</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4 items-center text-sm">
              <label className="text-slate-600 text-right">퇴직소득세</label>
              <div className="col-span-2 max-w-52">
                <NumInput value={incomeTax} onChange={setIncomeTax} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 items-center text-sm">
              <label className="text-slate-600 text-right">퇴직주민세 <span className="text-xs text-slate-400">(소득세×10%)</span></label>
              <div className="col-span-2 px-4 py-2 bg-slate-50 rounded-xl text-slate-700 font-medium max-w-52 text-right tabular-nums">
                {krw(result.residentTax)}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 items-center text-sm">
              <label className="text-slate-600 text-right">기타 공제</label>
              <div className="col-span-2 max-w-52">
                <NumInput value={otherDeductions} onChange={setOtherDeductions} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 실지급액 ── */}
      {result && (
        <div className="card p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-blue-200 text-sm">실 지급액</p>
              <p className="text-3xl font-bold mt-1">{krw(result.netPay)}</p>
              <p className="text-blue-300 text-xs mt-2">
                퇴직금 {krw(result.severancePay)} − 공제 {krw(result.totalDeductions)}
              </p>
            </div>
            <div className="text-right text-xs text-blue-200 space-y-1">
              <p>1일 평균임금: {krw(result.averageWage)}</p>
              <p>근속일수: {result.serviceDays.toLocaleString('ko-KR')}일</p>
              {taxBreakdown && <p>근속연수: {taxBreakdown.serviceYears}년 ({taxBreakdown.serviceMonths}개월)</p>}
              <p>산정일수: {result.totalDays}일</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 인쇄용 상세 내역 ── */}
      {result && (
        <div className="hidden print:block text-xs space-y-4 mt-4">
          <table className="w-full border border-slate-300">
            <tbody>
              <tr className="border-b border-slate-200 bg-slate-50">
                <td className="p-2 font-semibold w-32">사업장명</td>
                <td className="p-2">{companies.find(c => c.id === companyId)?.name}</td>
                <td className="p-2 font-semibold">근로자성명</td>
                <td className="p-2">{selectedEmp?.name}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2 font-semibold">산정사유발생일</td>
                <td className="p-2">{result.retirementDate}</td>
                <td className="p-2 font-semibold">입사일</td>
                <td className="p-2">{result.hireDate}</td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50">
                <td className="p-2 font-semibold">산정기간</td>
                <td className="p-2">{result.hireDate} ~ {fmtDate(new Date(parseDate(result.retirementDate).getTime() - 86400000))}</td>
                <td className="p-2 font-semibold">근속일수</td>
                <td className="p-2">{result.serviceDays.toLocaleString('ko-KR')}일{taxBreakdown ? ` (${taxBreakdown.serviceYears}년)` : ''}</td>
              </tr>
            </tbody>
          </table>

          <table className="w-full border border-slate-300">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 border-r border-slate-200 text-left">구분</th>
                {result.segments.map(seg => (
                  <th key={seg.yearMonth} className="p-2 border-r border-slate-200 text-center">
                    {Number(seg.yearMonth.split('-')[1])}월
                    <br /><span className="font-normal text-[10px]">{seg.periodStart.slice(5)}~{seg.periodEnd.slice(5)}</span>
                  </th>
                ))}
                <th className="p-2 text-center">합계</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200">
                <td className="p-2 border-r border-slate-200">총일수</td>
                {result.segments.map(s => <td key={s.yearMonth} className="p-2 border-r border-slate-200 text-center">{s.daysInPeriod}일</td>)}
                <td className="p-2 text-center font-bold">{result.totalDays}일</td>
              </tr>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td className="p-2 border-r border-slate-200">기본급</td>
                {result.segmentResults.map(sr => <td key={sr.segment.yearMonth} className="p-2 border-r border-slate-200 text-right">{krw(sr.proRatedBase)}</td>)}
                <td className="p-2 text-right font-bold">{krw(result.totalBasePay)}</td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="p-2 border-r border-slate-200">제수당</td>
                {result.segmentResults.map(sr => <td key={sr.segment.yearMonth} className="p-2 border-r border-slate-200 text-right">{krw(sr.proRatedAllow)}</td>)}
                <td className="p-2 text-right font-bold">{krw(result.totalAllowances)}</td>
              </tr>
              <tr className="border-t-2 border-slate-400 bg-slate-50 font-bold">
                <td className="p-2 border-r border-slate-200">소계</td>
                {result.segmentResults.map(sr => <td key={sr.segment.yearMonth} className="p-2 border-r border-slate-200 text-right">{krw(sr.subtotal)}</td>)}
                <td className="p-2 text-right">{krw(result.totalBasePay + result.totalAllowances)}</td>
              </tr>
            </tbody>
          </table>

          <table className="w-full border border-slate-300">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-2 font-semibold w-40">3개월 상여금</td>
                <td className="p-2 text-right">{krw(result.bonus3m)}</td>
                <td className="p-2 font-semibold">3개월 연차수당</td>
                <td className="p-2 text-right">{krw(result.leaveAllow3m)}</td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50">
                <td className="p-2 font-semibold">3개월 총액</td>
                <td className="p-2 text-right font-bold">{krw(result.total3mAmount)}</td>
                <td className="p-2 font-semibold">총 산정일수</td>
                <td className="p-2 text-right">{result.totalDays}일</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2 font-semibold">평균임금(1일)</td>
                <td className="p-2 text-right font-bold">{krw(result.averageWage)}</td>
                <td className="p-2 font-semibold">퇴직금액</td>
                <td className="p-2 text-right font-bold">{krw(result.severancePay)}</td>
              </tr>
              {taxBreakdown && (
                <>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <td className="p-2 font-semibold">근속연수</td>
                    <td className="p-2 text-right">{taxBreakdown.serviceYears}년 ({taxBreakdown.serviceMonths}개월)</td>
                    <td className="p-2 font-semibold">근속년수별공제</td>
                    <td className="p-2 text-right">{krw(taxBreakdown.serviceYearDeduction)}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 font-semibold">환산급여</td>
                    <td className="p-2 text-right">{krw(taxBreakdown.convertedSalary)}</td>
                    <td className="p-2 font-semibold">환산급여공제</td>
                    <td className="p-2 text-right">{krw(taxBreakdown.convertedSalaryDeduction)}</td>
                  </tr>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <td className="p-2 font-semibold">과세표준</td>
                    <td className="p-2 text-right">{krw(taxBreakdown.taxBase)}</td>
                    <td className="p-2 font-semibold">환산산출세액</td>
                    <td className="p-2 text-right">{krw(taxBreakdown.convertedTax)}</td>
                  </tr>
                </>
              )}
              <tr className="border-b border-slate-200">
                <td className="p-2 font-semibold">퇴직소득세</td>
                <td className="p-2 text-right">{krw(result.incomeTax)}</td>
                <td className="p-2 font-semibold">퇴직주민세</td>
                <td className="p-2 text-right">{krw(result.residentTax)}</td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50">
                <td className="p-2 font-semibold">기타 공제</td>
                <td className="p-2 text-right">{krw(result.otherDeductions)}</td>
                <td className="p-2 font-semibold">공제 합계</td>
                <td className="p-2 text-right">{krw(result.totalDeductions)}</td>
              </tr>
              <tr className="bg-slate-800 text-white font-bold">
                <td className="p-3" colSpan={2}>실 지급액</td>
                <td className="p-3 text-right text-lg" colSpan={2}>{krw(result.netPay)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
          body { font-size: 11px; }
        }
      `}</style>
    </div>
  )
}
