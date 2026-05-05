'use client'

import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  Search, X, FileDown, UserMinus, AlertTriangle, Clock,
  ChevronRight, Banknote, User, Briefcase, Building2,
} from 'lucide-react'
import type { EmployeeRow } from '@/lib/supabase/queries/employee'
import { formatDateShort, cn } from '@/lib/utils'

/* ── 헬퍼 ─────────────────────────────────────────────────────── */
function calcTenure(join: string | null, quit: string | null): string {
  if (!join || !quit) return '-'
  const months =
    (new Date(quit).getFullYear() - new Date(join).getFullYear()) * 12 +
    (new Date(quit).getMonth() - new Date(join).getMonth())
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m}개월`
  if (m === 0) return `${y}년`
  return `${y}년 ${m}개월`
}

function deletionDateStr(quit: string | null): string {
  if (!quit) return '-'
  const d = new Date(quit)
  d.setFullYear(d.getFullYear() + 3)
  return d.toISOString().slice(0, 10)
}

function daysLeft(quit: string | null): number | null {
  if (!quit) return null
  const d = new Date(quit)
  d.setFullYear(d.getFullYear() + 3)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / 86400000)
}

function urgencyClass(days: number | null): string {
  if (days === null) return ''
  if (days <= 90)  return 'bg-red-50 border-red-200'
  if (days <= 365) return 'bg-amber-50 border-amber-200'
  return ''
}

function formatMoney(v: number | null | undefined): string {
  if (v == null) return '-'
  return v.toLocaleString('ko-KR') + '원'
}

const SALARY_TYPE_LABEL = { annual: '연봉', monthly: '월급', hourly: '시급' }
const SALARY_BASIS_LABEL = { gross: '세전', net: '세후' }

/* ── Props ─────────────────────────────────────────────────────── */
interface Props {
  initialEmployees: EmployeeRow[]
  companyName: string
}

export default function ManagerResignedClient({ initialEmployees, companyName }: Props) {
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<EmployeeRow | null>(null)

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return initialEmployees
    return initialEmployees.filter(e =>
      (e.name            ?? '').toLowerCase().includes(s) ||
      (e.email           ?? '').toLowerCase().includes(s) ||
      (e.employee_number ?? '').toLowerCase().includes(s)
    )
  }, [initialEmployees, search])

  function downloadExcel() {
    const today = new Date().toISOString().slice(0, 10)
    const rows = filtered.map(e => {
      const days = daysLeft(e.quit_date)
      return {
        '사번':            e.employee_number ?? '',
        '성명':            e.name ?? '',
        '이메일':          e.email ?? '',
        '부서':            e.department ?? '',
        '직위':            e.position ?? '',
        '입사일':          e.Date_of_joining ?? '',
        '퇴사일':          e.quit_date ?? '',
        '근속기간':        calcTenure(e.Date_of_joining, e.quit_date),
        '급여유형':        e.salary_type ? SALARY_TYPE_LABEL[e.salary_type] : '',
        '기준':            e.salary_basis ? SALARY_BASIS_LABEL[e.salary_basis] : '',
        '급여금액':        e.salary_amount ?? '',
        '비과세합계':      e.non_taxable_items?.reduce((s, i) => s + i.amount, 0) ?? '',
        '과세총액합계':    e.taxable_total ?? '',
        '삭제 예정일':     deletionDateStr(e.quit_date),
        '삭제까지 잔여일': days !== null ? days : '',
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '퇴사자 목록')
    XLSX.writeFile(wb, `퇴사자_${companyName}_${today}.xlsx`)
  }

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400 mb-1">{companyName} · 직원 관리</p>
          <h1 className="text-xl font-semibold text-slate-900">퇴사자 관리</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            총 {initialEmployees.length}명 · 퇴사일 기준 3년 후 자동 삭제
          </p>
        </div>
        <button
          onClick={downloadExcel}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <FileDown size={14} />
          엑셀 다운로드
        </button>
      </div>

      {/* 3년 보존 정책 안내 */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700">
          <span className="font-semibold">데이터 보존 정책:</span> 퇴사일 기준 3년이 경과한 직원 정보는 자동으로 삭제됩니다.
          삭제 예정일이 90일 이내는 <span className="font-semibold text-red-600">빨간색</span>,
          1년 이내는 <span className="font-semibold text-amber-600">노란색</span>으로 표시됩니다.
        </p>
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="이름·이메일·사번 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            onClick={() => setSearch('')}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 빈 상태 */}
      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <UserMinus size={28} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">
            {search ? '검색 결과가 없습니다' : '퇴사 처리된 직원이 없습니다'}
          </p>
        </div>
      )}

      {/* 데스크톱 테이블 */}
      {filtered.length > 0 && (
        <div className="hidden lg:block card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '860px' }}>
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['사번', '성명', '부서/직위', '입사일', '퇴사일', '근속기간', '급여정보', '삭제 예정일', '잔여일', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(emp => {
                  const days = daysLeft(emp.quit_date)
                  return (
                    <tr
                      key={emp.id}
                      className={cn('transition-colors cursor-pointer', urgencyClass(days) || 'hover:bg-slate-50')}
                      onClick={() => setSelected(emp)}
                    >
                      <td className="px-4 py-3 text-xs font-mono text-slate-600 font-medium">{emp.employee_number ?? '-'}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{emp.name}</p>
                        <p className="text-xs text-slate-400">{emp.email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <p>{emp.department ?? '-'}</p>
                        <p className="text-slate-400">{emp.position ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {formatDateShort(emp.Date_of_joining)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {formatDateShort(emp.quit_date)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {calcTenure(emp.Date_of_joining, emp.quit_date)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {emp.salary_type ? (
                          <span className="inline-flex items-center gap-1">
                            <Banknote size={11} className="text-blue-400" />
                            {SALARY_TYPE_LABEL[emp.salary_type]}
                            {emp.salary_amount != null && (
                              <span className="text-slate-400 ml-1">{emp.salary_amount.toLocaleString()}원</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span className={cn(
                          'font-medium',
                          days !== null && days <= 90  ? 'text-red-600' :
                          days !== null && days <= 365 ? 'text-amber-600' :
                          'text-slate-600'
                        )}>
                          {deletionDateStr(emp.quit_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <DaysLeftBadge days={days} />
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight size={14} className="text-slate-300" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 모바일 카드 */}
      {filtered.length > 0 && (
        <div className="lg:hidden space-y-2.5">
          {filtered.map(emp => {
            const days = daysLeft(emp.quit_date)
            return (
              <div
                key={emp.id}
                className={cn('card p-4 space-y-3 border cursor-pointer active:opacity-70', urgencyClass(days) || 'border-slate-200')}
                onClick={() => setSelected(emp)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{emp.name}</p>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">#{emp.employee_number ?? '-'}</p>
                    <p className="text-xs text-slate-400">{emp.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DaysLeftBadge days={days} />
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-t border-slate-100 pt-3">
                  <InfoPair label="사번"     value={emp.employee_number ?? '-'} mono />
                  <InfoPair label="부서"     value={emp.department ?? '-'} />
                  <InfoPair label="입사일"   value={formatDateShort(emp.Date_of_joining)} />
                  <InfoPair label="퇴사일"   value={formatDateShort(emp.quit_date)} />
                  <InfoPair label="근속"     value={calcTenure(emp.Date_of_joining, emp.quit_date)} />
                  <InfoPair label="삭제 예정" value={deletionDateStr(emp.quit_date)}
                    className={days !== null && days <= 90 ? 'text-red-600 font-semibold' :
                               days !== null && days <= 365 ? 'text-amber-600 font-semibold' : ''} />
                  {emp.salary_type && (
                    <InfoPair
                      label="급여"
                      value={`${SALARY_TYPE_LABEL[emp.salary_type]} ${emp.salary_amount != null ? emp.salary_amount.toLocaleString() + '원' : ''}`}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 상세 슬라이드 패널 */}
      {selected && (
        <DetailPanel emp={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

/* ── 상세 패널 ─────────────────────────────────────────────────── */
function DetailPanel({ emp, onClose }: { emp: EmployeeRow; onClose: () => void }) {
  const days      = daysLeft(emp.quit_date)
  const nonTaxSum = emp.non_taxable_items?.reduce((s, i) => s + i.amount, 0) ?? 0

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* 패널 */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* 패널 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <p className="text-xs text-slate-400">퇴사자 상세 정보</p>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">{emp.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* 삭제 예정 경고 */}
          {days !== null && days <= 365 && (
            <div className={cn(
              'flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-medium',
              days <= 90
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-amber-50 border border-amber-200 text-amber-700'
            )}>
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>
                {deletionDateStr(emp.quit_date)} 삭제 예정
                {days > 0 ? ` (${days}일 남음)` : ' — 삭제 대상'}
              </span>
            </div>
          )}

          {/* 기본 정보 */}
          <Section icon={<User size={14} className="text-slate-500" />} title="기본 정보">
            <Grid2>
              <Field label="성명"   value={emp.name} />
              <Field label="사번"   value={emp.employee_number} mono />
              <Field label="이메일" value={emp.email} span2 />
              <Field label="성별"   value={emp.Sex === 'M' ? '남' : emp.Sex === 'F' ? '여' : null} />
              <Field label="생년월일" value={emp.birthdate} />
              <Field label="연락처" value={emp.Tel} />
              {emp.is_foreigner && (
                <>
                  <Field label="국적"         value={emp.nationality} />
                  <Field label="비자"         value={emp.visa_type} />
                  <Field label="등록번호" value={emp.registration_number} span2 />
                </>
              )}
            </Grid2>
          </Section>

          {/* 인사 정보 */}
          <Section icon={<Briefcase size={14} className="text-slate-500" />} title="인사 정보">
            <Grid2>
              <Field label="부서"       value={emp.department} />
              <Field label="직위"       value={emp.position} />
              <Field label="직급"       value={emp.Grade} />
              <Field label="직책"       value={emp.Role} />
              <Field label="업무"       value={emp.job} />
              <Field label="근무지"     value={emp['Working place']} />
              <Field label="업무상세"   value={emp['Work details']} span2 />
              <Field label="입사일"     value={formatDateShort(emp.Date_of_joining)} />
              <Field label="퇴사일"     value={formatDateShort(emp.quit_date)} />
              <Field label="근속기간"   value={calcTenure(emp.Date_of_joining, emp.quit_date)} />
              <Field
                label="고용형태"
                value={emp.is_contract
                  ? `계약직${emp.contract_end_date ? ` (만료: ${formatDateShort(emp.contract_end_date)})` : ''}`
                  : '정규직'}
              />
              {emp.weekly_work_hours != null && (
                <Field label="주소정근로" value={`${emp.weekly_work_hours}시간`} />
              )}
            </Grid2>
          </Section>

          {/* 급여 정보 */}
          <Section icon={<Banknote size={14} className="text-blue-500" />} title="급여 정보">
            {emp.salary_type == null && emp.salary_amount == null ? (
              <p className="text-xs text-slate-400 py-1">등록된 급여 정보가 없습니다</p>
            ) : (
              <Grid2>
                <Field
                  label="급여 유형"
                  value={emp.salary_type ? SALARY_TYPE_LABEL[emp.salary_type] : null}
                />
                <Field
                  label="기준"
                  value={emp.salary_basis ? SALARY_BASIS_LABEL[emp.salary_basis] : null}
                />
                <Field
                  label={emp.salary_type ? `${SALARY_TYPE_LABEL[emp.salary_type]} 금액` : '급여 금액'}
                  value={formatMoney(emp.salary_amount)}
                  span2
                />
                {emp.non_taxable_items && emp.non_taxable_items.length > 0 && (
                  <div className="col-span-2 space-y-1.5">
                    <p className="text-xs text-slate-400 font-medium">비과세 항목</p>
                    <div className="rounded-lg border border-slate-100 divide-y divide-slate-50">
                      {emp.non_taxable_items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2">
                          <span className="text-xs text-slate-700">{item.name}</span>
                          <span className="text-xs font-medium text-slate-900">{formatMoney(item.amount)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
                        <span className="text-xs text-slate-500 font-medium">비과세 합계</span>
                        <span className="text-xs font-semibold text-slate-700">{formatMoney(nonTaxSum)}</span>
                      </div>
                    </div>
                  </div>
                )}
                {emp.taxable_total != null && (
                  <div className="col-span-2 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                    <span className="text-sm font-semibold text-blue-800">과세총액합계</span>
                    <span className="text-base font-bold text-blue-900">{formatMoney(emp.taxable_total)}</span>
                  </div>
                )}
              </Grid2>
            )}
          </Section>

          {/* 데이터 관리 */}
          <Section icon={<Building2 size={14} className="text-slate-500" />} title="데이터 관리">
            <Grid2>
              <Field label="삭제 예정일" value={deletionDateStr(emp.quit_date)}
                className={days !== null && days <= 90 ? 'text-red-600 font-semibold' :
                           days !== null && days <= 365 ? 'text-amber-600 font-semibold' : ''} />
              <div>
                <p className="text-xs text-slate-400 mb-0.5">잔여일</p>
                <DaysLeftBadge days={days} />
              </div>
            </Grid2>
          </Section>

        </div>
      </div>
    </>
  )
}

/* ── 서브 컴포넌트 ─────────────────────────────────────────────── */
function Section({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
}

function Field({ label, value, mono, span2, className }: {
  label: string
  value: string | null | undefined
  mono?: boolean
  span2?: boolean
  className?: string
}) {
  if (!value) return null
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={cn('text-sm text-slate-800 mt-0.5 font-medium', mono && 'font-mono', className)}>
        {value}
      </p>
    </div>
  )
}

function DaysLeftBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-xs text-slate-400">-</span>
  if (days <= 0)
    return <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">삭제 대상</span>
  if (days <= 90)
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
        <AlertTriangle size={11} />{days}일
      </span>
    )
  if (days <= 365)
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
        <Clock size={11} />{days}일
      </span>
    )
  return <span className="text-xs text-slate-500">{days}일</span>
}

function InfoPair({ label, value, mono, className }: {
  label: string; value: string; mono?: boolean; className?: string
}) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className={cn('text-slate-700 mt-0.5 font-medium', mono && 'font-mono', className)}>{value}</p>
    </div>
  )
}
