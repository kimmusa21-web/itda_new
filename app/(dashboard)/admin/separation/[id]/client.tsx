'use client'
/* ================================================================
   이직확인서 — 고용보험 피보험자 이직확인서 (고용보험법 제42조)
================================================================ */

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Printer, ArrowLeft, Calculator, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  computeSegments,
  computeSeverance,
  parseDate,
  type MonthSegment,
  type MonthlyPayInput,
  type SeveranceResult,
} from '@/lib/severance-calc'
import { toAccrualDate, toAccrualMonth } from '@/lib/payslip-utils'

/* ── 타입 ─────────────────────────────────────────────────────── */
interface Company {
  id: number
  name: string
  biz_number: string | null
  address: string | null
  telephone: string | null
}

interface Employee {
  id: number
  name: string
  email: string
  Tel: string | null
  Sex: string | null
  birthdate: string | null
  department: string | null
  position: string | null
  Grade: string | null
  job: string | null
  Date_of_joining: string | null
  quit_date: string | null
  quit_reason: string | null
  unemployment_claim: boolean
  unemployment_code: string | null
  registration_number: string | null
  salary_type: string | null
  salary_amount: number | null
  is_contract: boolean
  weekly_work_hours: number | null
  companies: Company | null
}

interface Props { employee: Employee }

/* ── 이직 사유 코드 목록 ──────────────────────────────────────── */
const SEPARATION_CODES: Record<string, string> = {
  '11': '자발적 이직 — 개인 사정',
  '12': '자발적 이직 — 직장 내 사유',
  '13': '자발적 이직 — 결혼·임신·출산·육아·가족 돌봄',
  '22': '계약기간 만료',
  '23': '계약기간 만료 (갱신 기대권 있음)',
  '26': '권고사직 (회사 사정)',
  '27': '해고 (징계)',
  '31': '정년퇴직',
  '32': '임금체불·근로조건 위반',
  '41': '사업장 폐업·도산',
  '42': '대량 감원',
}

/* ── 유틸 ─────────────────────────────────────────────────────── */
function formatDate(d: string | null | undefined) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`
}

function formatDateDot(d: string | null | undefined) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function daysBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

function krw(n: number) { return Math.round(n).toLocaleString('ko-KR') }

/* ── 토요일을 제외한 일수 카운트 ─────────────────────────────── */
function countNonSaturdayDays(start: Date, end: Date): number {
  let count = 0
  const d = new Date(start)
  while (d <= end) {
    if (d.getDay() !== 6) count++   // 6 = 토요일
    d.setDate(d.getDate() + 1)
  }
  return count
}

/* ── 피보험단위기간 계산 ──────────────────────────────────────── */
interface InsuranceSegment {
  period: string        // "YYYY.MM.DD ~ YYYY.MM.DD"
  startDate: string
  endDate: string
  baseDays: number      // 보수지급 기초일수 (토요일 제외)
}

function computeInsuranceSegments(joinDate: string, quitDate: string): InsuranceSegment[] {
  /* 이직일 기준 18개월 이전부터 이직일까지, 월별로 분리 */
  const quit  = new Date(quitDate)
  const start18 = new Date(quit)
  start18.setMonth(start18.getMonth() - 18)

  const rangeStart = new Date(Math.max(new Date(joinDate).getTime(), start18.getTime()))

  const segments: InsuranceSegment[] = []
  let cursor = new Date(rangeStart)

  while (cursor <= quit) {
    const segStart = new Date(cursor)
    const monthEnd = new Date(segStart.getFullYear(), segStart.getMonth() + 1, 0)
    const segEnd   = monthEnd < quit ? monthEnd : new Date(quit)

    /* 토요일을 제외한 일수 */
    const baseDays = countNonSaturdayDays(segStart, segEnd)

    const fmt = (d: Date) =>
      `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`

    segments.push({
      period:    `${fmt(segStart)} ~ ${fmt(segEnd)}`,
      startDate: segStart.toISOString().slice(0, 10),
      endDate:   segEnd.toISOString().slice(0, 10),
      baseDays,
    })

    cursor = new Date(segEnd.getFullYear(), segEnd.getMonth() + 1, 1)
  }

  return segments
}

/* ── 인쇄용 구분선 ──────────────────────────────────────────── */
function PrintRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <tr className="border-b border-slate-200">
      <td className="p-2 bg-slate-50 font-medium text-slate-600 w-40 text-xs whitespace-nowrap">{label}</td>
      <td className={`p-2 text-slate-900 text-xs ${mono ? 'font-mono tracking-wide' : ''}`}>{value}</td>
    </tr>
  )
}

/* ── 메인 컴포넌트 ──────────────────────────────────────────── */
export default function SeparationClient({ employee: emp }: Props) {
  const supabase = createClient()
  const company  = emp.companies

  /* 편집 가능한 필드 */
  const [quitDate,         setQuitDate]         = useState(emp.quit_date ?? '')
  const [quitReason,       setQuitReason]        = useState(emp.quit_reason ?? '')
  const [unemploymentCode, setUnemploymentCode]  = useState(emp.unemployment_code ?? '')
  const [regNumber,        setRegNumber]         = useState(emp.registration_number ?? '')
  const [salaryInput,      setSalaryInput]       = useState(emp.salary_amount ?? 0)

  /* 피보험단위기간 */
  const insuranceSegments = useMemo<InsuranceSegment[]>(() => {
    if (!emp.Date_of_joining || !quitDate) return []
    try { return computeInsuranceSegments(emp.Date_of_joining, quitDate) }
    catch { return [] }
  }, [emp.Date_of_joining, quitDate])

  const totalInsuranceDays = useMemo(
    () => insuranceSegments.reduce((s, seg) => s + seg.baseDays, 0),
    [insuranceSegments],
  )

  /* ── 1일 평균임금 산정 (이직 전 3개월) ── */
  const [avgSegs,        setAvgSegs]        = useState<MonthSegment[]>([])
  const [avgData,        setAvgData]        = useState<Record<string, MonthlyPayInput>>({})
  const [avgFetching,    setAvgFetching]    = useState(false)
  const [avgFetched,     setAvgFetched]     = useState(false)
  const [avgAnnualBonus, setAvgAnnualBonus] = useState(0)
  const [avgAnnualLeave, setAvgAnnualLeave] = useState(0)
  const [lastFetchDate,  setLastFetchDate]  = useState('')

  const fetchAvgWageData = useCallback(async (qDate: string) => {
    if (!qDate) return
    setAvgFetching(true)
    setAvgFetched(false)

    const segs = computeSegments(qDate)
    setAvgSegs(segs)

    const accrualMonths = segs.map(s => toAccrualDate(s.yearMonth))
    const { data } = await supabase
      .from('pay_info_v2')
      .select('accrual_month, base_salary, total_earnings')
      .eq('employee_id', emp.id)
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

    setAvgData(newData)
    setAvgFetched(true)
    setAvgFetching(false)
    setLastFetchDate(qDate)
  }, [supabase, emp.id])

  /* 마운트 시 초기 조회 */
  useEffect(() => {
    if (emp.quit_date) fetchAvgWageData(emp.quit_date)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const avgResult = useMemo<SeveranceResult | null>(() => {
    if (!avgFetched || avgSegs.length === 0 || !emp.Date_of_joining || !quitDate) return null
    try {
      return computeSeverance({
        hireDate:       emp.Date_of_joining,
        retirementDate: quitDate,
        segments:       avgSegs,
        monthlyData:    avgData,
        annualBonus:    avgAnnualBonus,
        annualLeaveAllow: avgAnnualLeave,
        incomeTax:      0,
        otherDeductions: 0,
      })
    } catch { return null }
  }, [avgFetched, avgSegs, avgData, avgAnnualBonus, avgAnnualLeave, emp.Date_of_joining, quitDate])

  /* 임금지급방법 */
  const salaryTypeLabel = { annual: '월급(연봉)', monthly: '월급', hourly: '시급' }[emp.salary_type ?? ''] ?? '월급'

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:space-y-4 print:max-w-none">

      {/* 상단 헤더 */}
      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin/separation" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={14} />목록으로
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/severance`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Calculator size={13} />퇴직금 정밀 산정
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 transition-colors"
          >
            <Printer size={13} />인쇄 / PDF
          </button>
        </div>
      </div>

      {/* ── 이직확인서 본문 ── */}
      <div className="card overflow-hidden">
        {/* 제목 */}
        <div className="bg-slate-800 text-white text-center py-4">
          <h1 className="text-xl font-bold tracking-widest">이 직 확 인 서</h1>
          <p className="text-xs text-slate-400 mt-1">고용보험법 제42조 · 고용보험법 시행령 제68조</p>
        </div>

        <div className="p-5 print:p-4 space-y-5">

          {/* 사업장 정보 */}
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">① 사업장 정보</h2>
            <table className="w-full border border-slate-200 rounded-xl overflow-hidden text-sm">
              <tbody>
                <PrintRow label="사업장명" value={company?.name ?? ''} />
                <PrintRow label="사업자등록번호" value={company?.biz_number ?? ''} mono />
                <PrintRow label="소재지" value={company?.address ?? ''} />
                <PrintRow label="전화번호" value={company?.telephone ?? ''} />
              </tbody>
            </table>
          </section>

          {/* 피보험자 정보 */}
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">② 피보험자 정보</h2>
            <table className="w-full border border-slate-200 rounded-xl overflow-hidden text-sm">
              <tbody>
                <PrintRow label="성명" value={emp.name} />
                <tr className="border-b border-slate-200">
                  <td className="p-2 bg-slate-50 font-medium text-slate-600 w-40 text-xs whitespace-nowrap">주민등록번호</td>
                  <td className="p-2">
                    <input
                      className="font-mono tracking-wide text-slate-900 text-xs w-full border-0 bg-transparent focus:outline-none print:pointer-events-none"
                      placeholder="000000-0000000"
                      value={regNumber}
                      onChange={e => setRegNumber(e.target.value)}
                      maxLength={14}
                    />
                  </td>
                </tr>
                <PrintRow label="부서 / 직위" value={[emp.department, emp.position].filter(Boolean).join(' / ')} />
              </tbody>
            </table>
          </section>

          {/* 피보험자격 및 이직 */}
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">③ 피보험자격 취득 / 이직</h2>
            <table className="w-full border border-slate-200 rounded-xl overflow-hidden text-sm">
              <tbody>
                <PrintRow label="입사일 (취득일)" value={formatDate(emp.Date_of_joining)} />
                <tr className="border-b border-slate-200">
                  <td className="p-2 bg-slate-50 font-medium text-slate-600 w-40 text-xs whitespace-nowrap">이직일 (마지막 근무일)</td>
                  <td className="p-2">
                    <input
                      type="date"
                      className="text-xs text-slate-900 border-0 bg-transparent focus:outline-none print:pointer-events-none"
                      value={quitDate}
                      onChange={e => setQuitDate(e.target.value)}
                    />
                    {quitDate && <span className="text-xs text-slate-400 ml-2">{formatDate(quitDate)}</span>}
                  </td>
                </tr>
                <PrintRow
                  label="근속기간"
                  value={emp.Date_of_joining && quitDate
                    ? `${formatDate(emp.Date_of_joining)} ~ ${formatDate(quitDate)} (${daysBetween(emp.Date_of_joining, quitDate).toLocaleString('ko-KR')}일)`
                    : '-'}
                />
                <PrintRow label="고용형태" value={emp.is_contract ? '계약직 (기간제)' : '상용직 (정규직)'} />
              </tbody>
            </table>
          </section>

          {/* 이직 사유 */}
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">④ 이직 사유</h2>
            <table className="w-full border border-slate-200 rounded-xl overflow-hidden text-sm">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-2 bg-slate-50 font-medium text-slate-600 w-40 text-xs whitespace-nowrap">이직 사유 코드</td>
                  <td className="p-2">
                    <select
                      className="text-xs text-slate-900 border-0 bg-transparent focus:outline-none print:pointer-events-none w-full"
                      value={unemploymentCode}
                      onChange={e => setUnemploymentCode(e.target.value)}
                    >
                      <option value="">코드 선택</option>
                      {Object.entries(SEPARATION_CODES).map(([code, desc]) => (
                        <option key={code} value={code}>{code} — {desc}</option>
                      ))}
                    </select>
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 bg-slate-50 font-medium text-slate-600 w-40 text-xs whitespace-nowrap">이직 사유 내용</td>
                  <td className="p-2">
                    <input
                      className="text-xs text-slate-900 border-0 bg-transparent focus:outline-none print:pointer-events-none w-full"
                      placeholder="퇴사 사유를 입력하세요"
                      value={quitReason}
                      onChange={e => setQuitReason(e.target.value)}
                    />
                  </td>
                </tr>
                <PrintRow
                  label="실업급여 신청"
                  value={emp.unemployment_claim ? `신청 (코드: ${unemploymentCode || '-'})` : '미신청'}
                />
              </tbody>
            </table>
          </section>

          {/* 임금 정보 */}
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">⑤ 임금 정보</h2>
            <table className="w-full border border-slate-200 rounded-xl overflow-hidden text-sm">
              <tbody>
                <PrintRow label="임금지급방법" value={salaryTypeLabel} />
                <tr className="border-b border-slate-200">
                  <td className="p-2 bg-slate-50 font-medium text-slate-600 w-40 text-xs whitespace-nowrap">월 기본급</td>
                  <td className="p-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="text-xs text-slate-900 border-0 bg-transparent focus:outline-none print:pointer-events-none w-32 text-right tabular-nums"
                      value={salaryInput === 0 ? '' : salaryInput.toLocaleString('ko-KR')}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9]/g, '')
                        setSalaryInput(raw === '' ? 0 : Number(raw))
                      }}
                      placeholder="0"
                    />
                    <span className="text-xs text-slate-400 ml-1">원</span>
                  </td>
                </tr>
                <PrintRow label="주 소정근로시간" value={emp.weekly_work_hours ? `${emp.weekly_work_hours}시간` : '미입력'} />
              </tbody>
            </table>
          </section>

          {/* 피보험단위기간 */}
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              ⑥ 피보험단위기간 산정 (이직일 이전 18개월)
            </h2>
            <p className="text-[11px] text-slate-400 mb-2">※ 보수지급 기초일수: 해당 기간의 총일수에서 토요일을 제외한 일수</p>
            {insuranceSegments.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">입사일과 이직일을 입력하면 자동 계산됩니다</p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-slate-500 font-medium">피보험단위기간 산정 대상 기간</th>
                      <th className="px-3 py-2 text-center text-slate-500 font-medium w-32">보수지급 기초일수 (토요일 제외)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {insuranceSegments.map((seg, i) => (
                      <tr key={i} className="hover:bg-slate-50/40">
                        <td className="px-3 py-1.5 font-mono text-slate-600">{seg.period}</td>
                        <td className="px-3 py-1.5 text-center text-slate-700 font-medium">{seg.baseDays}일</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-300 bg-blue-50/40">
                    <tr>
                      <td className="px-3 py-2 font-bold text-slate-700">통산 피보험단위기간 합계</td>
                      <td className="px-3 py-2 text-center font-bold text-blue-700">{totalInsuranceDays}일</td>
                    </tr>
                  </tfoot>
                </table>
                <div className={`px-3 py-2 text-xs flex items-center gap-2 border-t ${
                  totalInsuranceDays >= 180
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                  {totalInsuranceDays >= 180
                    ? `✓ 통산 피보험단위기간 ${totalInsuranceDays}일 — 실업급여 수급 요건 충족 (180일 이상)`
                    : `⚠ 통산 피보험단위기간 ${totalInsuranceDays}일 — 실업급여 수급 요건 미충족 (180일 미만)`
                  }
                </div>
              </div>
            )}
          </section>

          {/* 확인 서명란 */}
          <section className="border-t-2 border-slate-200 pt-4">
            <p className="text-center text-xs text-slate-600 mb-4">
              위의 사실을 확인합니다.
            </p>
            <div className="flex justify-between items-end">
              <div className="text-xs text-slate-400 space-y-1">
                <p>작성일: {new Date().toLocaleDateString('ko-KR')}</p>
              </div>
              <div className="flex gap-12 text-center text-xs text-slate-600">
                <div>
                  <p className="mb-8">사업주 (사용자)</p>
                  <p className="border-t border-slate-300 pt-1 w-32">(서명 또는 인)</p>
                </div>
                <div>
                  <p className="mb-8">피보험자 (근로자)</p>
                  <p className="border-t border-slate-300 pt-1 w-32">(서명 또는 인)</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── 1일 평균임금 산정 ── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calculator size={15} className="text-blue-500" />
            <h2 className="text-sm font-bold text-slate-700">1일 평균임금 산정</h2>
            <span className="text-xs text-slate-400">이직 전 3개월 기준</span>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            {lastFetchDate && lastFetchDate !== quitDate && (
              <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                이직일 변경됨 — 재조회 필요
              </span>
            )}
            <button
              onClick={() => fetchAvgWageData(quitDate)}
              disabled={!quitDate || avgFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={12} className={avgFetching ? 'animate-spin' : ''} />
              {avgFetching ? '조회 중...' : '급여 자동 조회'}
            </button>
          </div>
        </div>

        {!avgFetched && !avgFetching && (
          <div className="p-8 text-center text-sm text-slate-400">
            이직일을 입력한 후 급여 자동 조회를 눌러주세요.
          </div>
        )}

        {avgFetching && (
          <div className="p-8 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin" />급여 데이터 조회 중...
          </div>
        )}

        {avgFetched && avgSegs.length > 0 && (
          <div className="p-5 space-y-4">
            {/* 3개월 급여 테이블 */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: 480 }}>
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-slate-500 font-semibold w-28">항목</th>
                    {avgSegs.map(seg => (
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
                    <td className="px-4 py-2 text-slate-500 font-medium">산정일수</td>
                    {avgSegs.map(seg => (
                      <td key={seg.yearMonth} className="px-3 py-2 text-center font-medium text-slate-700">{seg.daysInPeriod}일</td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold text-blue-600 bg-blue-50/40">{avgResult?.totalDays ?? 0}일</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-700 font-medium">기본급 (월)</td>
                    {avgSegs.map(seg => (
                      <td key={seg.yearMonth} className="px-2 py-1.5">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={(avgData[seg.yearMonth]?.baseSalary ?? 0) === 0 ? '' : (avgData[seg.yearMonth]?.baseSalary ?? 0).toLocaleString('ko-KR')}
                          onChange={e => {
                            const raw = e.target.value.replace(/[^0-9]/g, '')
                            setAvgData(prev => ({
                              ...prev,
                              [seg.yearMonth]: { ...prev[seg.yearMonth], yearMonth: seg.yearMonth, baseSalary: raw === '' ? 0 : Number(raw) },
                            }))
                          }}
                          className="input text-right tabular-nums text-xs py-1.5 w-full print:pointer-events-none"
                          placeholder="0"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-medium text-slate-700 bg-blue-50/40 whitespace-nowrap">
                      {krw(avgResult?.totalBasePay ?? 0)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-700 font-medium">제수당 (월)</td>
                    {avgSegs.map(seg => (
                      <td key={seg.yearMonth} className="px-2 py-1.5">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={(avgData[seg.yearMonth]?.allowances ?? 0) === 0 ? '' : (avgData[seg.yearMonth]?.allowances ?? 0).toLocaleString('ko-KR')}
                          onChange={e => {
                            const raw = e.target.value.replace(/[^0-9]/g, '')
                            setAvgData(prev => ({
                              ...prev,
                              [seg.yearMonth]: { ...prev[seg.yearMonth], yearMonth: seg.yearMonth, allowances: raw === '' ? 0 : Number(raw) },
                            }))
                          }}
                          className="input text-right tabular-nums text-xs py-1.5 w-full print:pointer-events-none"
                          placeholder="0"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-medium text-slate-700 bg-blue-50/40 whitespace-nowrap">
                      {krw(avgResult?.totalAllowances ?? 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 상여금 / 연차수당 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  연간 상여금 총액 <span className="text-slate-400 font-normal">(3개월분 = ×3/12)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={avgAnnualBonus === 0 ? '' : avgAnnualBonus.toLocaleString('ko-KR')}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, '')
                    setAvgAnnualBonus(raw === '' ? 0 : Number(raw))
                  }}
                  className="input text-right tabular-nums text-xs"
                  placeholder="0"
                />
                {avgAnnualBonus > 0 && (
                  <p className="text-xs text-blue-600 mt-1">→ 3개월: {krw(avgAnnualBonus * 3 / 12)}원</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  연간 연차수당 총액 <span className="text-slate-400 font-normal">(3개월분 = ×3/12)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={avgAnnualLeave === 0 ? '' : avgAnnualLeave.toLocaleString('ko-KR')}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, '')
                    setAvgAnnualLeave(raw === '' ? 0 : Number(raw))
                  }}
                  className="input text-right tabular-nums text-xs"
                  placeholder="0"
                />
                {avgAnnualLeave > 0 && (
                  <p className="text-xs text-blue-600 mt-1">→ 3개월: {krw(avgAnnualLeave * 3 / 12)}원</p>
                )}
              </div>
            </div>

            {/* 1일 평균임금 결과 */}
            {avgResult && (
              <div className="bg-slate-800 text-white rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-3">평균임금 계산</p>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-slate-300">3개월 총임금액</span>
                  <span className="text-white font-bold text-base">{krw(avgResult.total3mAmount)}원</span>
                  <span className="text-slate-500">÷</span>
                  <span className="text-slate-300">총일수 {avgResult.totalDays}일</span>
                  <span className="text-slate-500">=</span>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-slate-400">1일 평균임금</p>
                    <p className="text-2xl font-bold text-yellow-300">{krw(avgResult.averageWage)}원</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-400">
                  <div>기본급 합계<br /><span className="text-white font-medium">{krw(avgResult.totalBasePay)}</span></div>
                  <div>제수당 합계<br /><span className="text-white font-medium">{krw(avgResult.totalAllowances)}</span></div>
                  <div>3개월 상여금<br /><span className="text-white font-medium">{krw(avgResult.bonus3m)}</span></div>
                  <div>3개월 연차수당<br /><span className="text-white font-medium">{krw(avgResult.leaveAllow3m)}</span></div>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400">
              * 급여 데이터가 없는 월은 직접 입력하세요. 정밀 퇴직금 산정은{' '}
              <Link href="/admin/severance" className="text-blue-500 underline">퇴직금 정밀 산정</Link>{' '}
              메뉴를 이용하세요.
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          nav, header, aside { display: none !important; }
          body { font-size: 10px; }
          .card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
          .print\\:p-4 { padding: 1rem !important; }
          .print\\:pointer-events-none { pointer-events: none; }
        }
      `}</style>
    </div>
  )
}
