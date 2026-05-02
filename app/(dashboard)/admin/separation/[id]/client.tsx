'use client'
/* ================================================================
   이직확인서 — 고용보험 피보험자 이직확인서 (고용보험법 제42조)
   + 퇴직금 산정 내역 (근로기준법 제34조)
================================================================ */

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Printer, ArrowLeft, Calculator, ChevronDown, ChevronUp } from 'lucide-react'

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

/* ── 피보험단위기간 계산 ──────────────────────────────────────── */
interface InsuranceSegment {
  period: string        // "YYYY.MM.DD ~ YYYY.MM.DD"
  startDate: string
  endDate: string
  baseDays: number      // 보수지급 기초일수
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
    /* 해당 월의 마지막 날 */
    const monthEnd = new Date(segStart.getFullYear(), segStart.getMonth() + 1, 0)
    const segEnd   = monthEnd < quit ? monthEnd : new Date(quit)

    const baseDays = Math.round((segEnd.getTime() - segStart.getTime()) / 86400000) + 1
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

/* ── 퇴직금 계산 (평균임금 기반) ────────────────────────────── */
interface RetirementCalc {
  serviceDays:     number
  serviceYears:    number
  avgWageDaily:    number
  severancePay:    number
  /* 세금 (소득세법 제48조 2023년 현행) */
  serviceYearDed:  number  // 근속연수공제
  convertedSalary: number  // 환산급여
  convertedSalDed: number  // 환산급여공제
  taxBase:         number  // 과세표준
  convertedTax:    number  // 환산산출세액
  incomeTax:       number  // 소득세
  residentTax:     number  // 지방소득세
  netPay:          number
}

function computeServiceYearDeduction(years: number): number {
  if (years <= 5)       return 300_000 * years
  if (years <= 10)      return 1_500_000 + 500_000 * (years - 5)
  if (years <= 20)      return 4_000_000 + 800_000 * (years - 10)
  return 12_000_000 + 1_200_000 * (years - 20)
}

function computeConvertedSalaryDeduction(v: number): number {
  const M = 10_000
  if (v <= 800 * M)  return v
  if (v <= 7_000 * M) return 800 * M + (v - 800 * M) * 0.6
  if (v <= 10_000 * M) return 4_520 * M + (v - 7_000 * M) * 0.55
  if (v <= 30_000 * M) return 6_170 * M + (v - 10_000 * M) * 0.45
  return 15_170 * M + (v - 30_000 * M) * 0.35
}

function computeIncomeTax(taxBase: number): number {
  const M = 10_000
  if (taxBase <= 0) return 0
  if (taxBase <= 1_400 * M)  return taxBase * 0.06
  if (taxBase <= 5_000 * M)  return 840_000 + (taxBase - 1_400 * M) * 0.15
  if (taxBase <= 8_800 * M)  return 6_240_000 + (taxBase - 5_000 * M) * 0.24
  if (taxBase <= 15_000 * M) return 15_360_000 + (taxBase - 8_800 * M) * 0.35
  if (taxBase <= 30_000 * M) return 37_060_000 + (taxBase - 15_000 * M) * 0.38
  if (taxBase <= 50_000 * M) return 94_060_000 + (taxBase - 30_000 * M) * 0.40
  if (taxBase <= 100_000 * M) return 174_060_000 + (taxBase - 50_000 * M) * 0.42
  return 384_060_000 + (taxBase - 100_000 * M) * 0.45
}

function computeRetirementCalc(
  joinDate: string,
  quitDate: string,
  monthlySalary: number,
  avgWageOverride?: number,
): RetirementCalc {
  const serviceDays  = daysBetween(joinDate, quitDate)
  const serviceMonths = serviceDays / 30.44
  const serviceYears  = Math.max(1, Math.ceil(serviceMonths / 12))

  /* 1일 평균임금: 월급 ÷ 30 (간이 산출) */
  const avgWageDaily = avgWageOverride ?? (monthlySalary / 30)

  /* 퇴직금 = 1일평균임금 × 30 × 근속일수/365 */
  const severancePay = Math.round(avgWageDaily * 30 * serviceDays / 365)

  /* 소득세법 제48조 현행 계산 */
  const serviceYearDed  = computeServiceYearDeduction(serviceYears)
  const convertedSalary = Math.max(0, (severancePay - serviceYearDed) / serviceYears * 12)
  const convertedSalDed = computeConvertedSalaryDeduction(convertedSalary)
  const taxBase         = Math.max(0, convertedSalary - convertedSalDed)
  const convertedTax    = computeIncomeTax(taxBase)
  const calculatedTax   = convertedTax / 12 * serviceYears
  const incomeTax       = Math.floor(calculatedTax / 10) * 10
  const residentTax     = Math.floor(incomeTax * 0.1 / 10) * 10
  const netPay          = severancePay - incomeTax - residentTax

  return {
    serviceDays, serviceYears, avgWageDaily, severancePay,
    serviceYearDed, convertedSalary, convertedSalDed, taxBase,
    convertedTax, incomeTax, residentTax, netPay,
  }
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
  const company = emp.companies

  /* 편집 가능한 필드 */
  const [quitDate,         setQuitDate]         = useState(emp.quit_date ?? '')
  const [quitReason,       setQuitReason]        = useState(emp.quit_reason ?? '')
  const [unemploymentCode, setUnemploymentCode]  = useState(emp.unemployment_code ?? '')
  const [regNumber,        setRegNumber]         = useState(emp.registration_number ?? '')
  const [salaryInput,      setSalaryInput]       = useState(emp.salary_amount ?? 0)
  const [taxOpen,          setTaxOpen]           = useState(false)

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

  /* 퇴직금 계산 */
  const calc = useMemo<RetirementCalc | null>(() => {
    if (!emp.Date_of_joining || !quitDate || salaryInput <= 0) return null
    try { return computeRetirementCalc(emp.Date_of_joining, quitDate, salaryInput) }
    catch { return null }
  }, [emp.Date_of_joining, quitDate, salaryInput])

  /* 임금지급방법 */
  const salaryTypeLabel = { annual: '월급(연봉)', monthly: '월급', hourly: '시급' }[emp.salary_type ?? ''] ?? '월급'

  /* 이직사유 코드 설명 */
  const codeDesc = SEPARATION_CODES[unemploymentCode] ?? unemploymentCode

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
            {insuranceSegments.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">입사일과 이직일을 입력하면 자동 계산됩니다</p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-slate-500 font-medium">피보험단위기간 산정 대상 기간</th>
                      <th className="px-3 py-2 text-center text-slate-500 font-medium w-24">보수지급 기초일수</th>
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

      {/* ── 퇴직금 산정 내역 ── */}
      <div className="card overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-slate-100 cursor-pointer print:cursor-auto"
          onClick={() => setTaxOpen(v => !v)}
        >
          <div className="flex items-center gap-2">
            <Calculator size={15} className="text-blue-500" />
            <h2 className="text-sm font-bold text-slate-700">퇴직금 산정 내역서</h2>
            <span className="text-xs text-slate-400">근로기준법 제34조 · 소득세법 제48조</span>
          </div>
          <div className="print:hidden">
            {taxOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
          </div>
        </div>

        {(taxOpen || typeof window === 'undefined') && calc && (
          <div className="p-5 print:p-4 space-y-4">
            {/* 기본 정보 */}
            <table className="w-full border border-slate-200 rounded-xl overflow-hidden text-xs">
              <tbody>
                <PrintRow label="사업장명" value={company?.name ?? ''} />
                <PrintRow label="근로자성명" value={emp.name} />
                <PrintRow label="입사일" value={formatDateDot(emp.Date_of_joining)} />
                <PrintRow label="퇴사일" value={formatDateDot(quitDate)} />
                <PrintRow label="근속일수" value={`${calc.serviceDays.toLocaleString('ko-KR')}일 (${calc.serviceYears}년 기준)`} />
              </tbody>
            </table>

            {/* 평균임금 및 퇴직금 */}
            <div className="bg-slate-800 text-white rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-3 font-semibold">평균임금 및 퇴직금 계산</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-slate-400">1일 평균임금</p>
                  <p className="text-base font-bold text-yellow-300 mt-1">{krw(calc.avgWageDaily)}원</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">× 30일 × {calc.serviceDays.toLocaleString('ko-KR')}일 ÷ 365</p>
                  <p className="text-base font-bold text-white mt-1">= 퇴직금</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">퇴직금액</p>
                  <p className="text-lg font-bold text-blue-300 mt-1">{krw(calc.severancePay)}원</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">월 기본급 기준</p>
                  <p className="text-xs text-slate-300 mt-1">{krw(salaryInput)}원</p>
                </div>
              </div>
            </div>

            {/* 퇴직소득세 상세 */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">퇴직소득세 산출 근거 (소득세법 제48조)</p>
              </div>
              <div className="divide-y divide-slate-50 text-xs">
                {[
                  ['1항 — 근속연수',              `${calc.serviceYears}년`],
                  ['2항 — 퇴직금액',              `${krw(calc.severancePay)}원`],
                  ['3항 — 근속연수공제',           `${krw(calc.serviceYearDed)}원`],
                  ['4항 — 환산급여 = (2항−3항) ÷ 1항 × 12', `${krw(calc.convertedSalary)}원`],
                  ['5항 — 환산급여공제',            `${krw(calc.convertedSalDed)}원`],
                  ['6항 — 과세표준 = 4항−5항',    `${krw(calc.taxBase)}원`],
                  ['7항 — 환산산출세액 (기본세율)', `${krw(calc.convertedTax)}원`],
                  ['8항 — 산출세액 = 7항 ÷ 12 × 1항', `${krw(Math.round(calc.convertedTax / 12 * calc.serviceYears))}원`],
                  ['소득세 (10원 단위 절사)',       `${krw(calc.incomeTax)}원`],
                  ['지방소득세 = 소득세 × 10%',    `${krw(calc.residentTax)}원`],
                  ['세금 합계',                    `${krw(calc.incomeTax + calc.residentTax)}원`],
                ].map(([label, value], i) => (
                  <div
                    key={i}
                    className={`flex justify-between px-4 py-2 ${
                      i >= 8 ? 'bg-amber-50 font-semibold' : ''
                    }`}
                  >
                    <span className="text-slate-500">{label}</span>
                    <span className={`tabular-nums font-medium ${i >= 8 ? 'text-amber-700' : 'text-slate-700'}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 실지급액 */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-5">
              <p className="text-blue-200 text-xs mb-1">실 지급액 (퇴직금 − 소득세 − 지방소득세)</p>
              <p className="text-3xl font-bold">{krw(calc.netPay)}원</p>
              <p className="text-blue-300 text-xs mt-2">
                퇴직금 {krw(calc.severancePay)} − 소득세 {krw(calc.incomeTax)} − 지방소득세 {krw(calc.residentTax)}
              </p>
            </div>

            <p className="text-[11px] text-slate-400">
              * 위 퇴직금 산정은 월 기본급만을 기준으로 한 간이 계산입니다. 정확한 산정은{' '}
              <Link href="/admin/severance" className="text-blue-500 underline">퇴직금 정밀 산정</Link>{' '}
              메뉴를 이용하세요.
            </p>
          </div>
        )}

        {(taxOpen || typeof window === 'undefined') && !calc && (
          <div className="p-5 text-center text-sm text-slate-400">
            <p>이직일과 월 기본급을 입력하면 퇴직금이 자동 계산됩니다.</p>
          </div>
        )}

        {!taxOpen && (
          <div className="px-5 py-3 text-xs text-slate-400 print:hidden">
            클릭하여 퇴직금 산정 내역 펼치기
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
