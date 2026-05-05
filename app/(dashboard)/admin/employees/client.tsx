'use client'

import { useState, useTransition } from 'react'
import { Plus, Search, Mail, Upload, X, Hash, Eye, EyeOff } from 'lucide-react'
import Link                                      from 'next/link'
import { createClient }                          from '@/lib/supabase/client'
import type { EmployeeRow }                      from '@/lib/supabase/queries/employee'
import { formatDateShort, cn }                   from '@/lib/utils'
import { formatKRW }                             from '@/lib/payslip-utils'
import { createEmployeeAdmin, deleteEmployeeAdmin, resignEmployeeAdmin } from '@/lib/actions/employee-admin-create'
import EmployeeExportButton                      from '@/components/employees/employee-export-button'

type Filter = 'active' | 'inactive' | 'all'

interface Props {
  initialEmployees: EmployeeRow[]
  companies: { id: number; name: string }[]
}

export default function AdminEmployeesClient({ initialEmployees, companies }: Props) {
  const supabase = createClient()
  const [employees, setEmployees]       = useState(initialEmployees)
  const [filter, setFilter]             = useState<Filter>('active')
  const [search, setSearch]             = useState('')
  const [company, setCompany]           = useState('')
  const [modal, setModal]               = useState<'add' | 'edit' | 'quit' | 'rehire' | 'delete' | null>(null)
  const [selected, setSelected]         = useState<EmployeeRow | null>(null)
  const [form, setForm]                 = useState<Partial<EmployeeRow>>({})
  const [saving, setSaving]             = useState(false)
  const [inviting, setInviting]         = useState<number | null>(null)
  const [regFocused, setRegFocused]     = useState(false)
  const [, startTransition]             = useTransition()

  // 퇴사 처리 — 급여 내역 요약
  interface QuitSummary {
    prevYear: number
    prevYearTaxable: number
    prevYearTotal: number
    currentYear: number
    currentYearTaxable: number
    currentYearTotal: number
    hasData: boolean
  }
  const [quitSummary, setQuitSummary]         = useState<QuitSummary | null>(null)
  const [quitSummaryLoading, setQuitSummaryLoading] = useState(false)
  const [quitDateDirty, setQuitDateDirty]     = useState(false)
  const [showRegNum, setShowRegNum]           = useState(false)

  async function reload() {
    const { data } = await supabase
      .from('employees').select('*, companies(name)').order('name')
    setEmployees(data ?? [])
  }

  async function loadQuitSummary(employeeId: number, quitDate: string) {
    if (!quitDate) return
    setQuitSummaryLoading(true)
    setQuitDateDirty(false)
    const quitYear = new Date(quitDate).getFullYear()
    const prevYear = quitYear - 1
    try {
      const { data } = await supabase
        .from('pay_info_v2')
        .select('accrual_month, total_earnings, Total_tax_salary')
        .eq('employee_id', employeeId)
        .gte('accrual_month', `${prevYear}-01-01`)
        .lte('accrual_month', `${quitYear}-12-31`)
      const records = data ?? []
      const prev = records.filter(r => r.accrual_month?.startsWith(String(prevYear)))
      const curr = records.filter(r => r.accrual_month?.startsWith(String(quitYear)))
      setQuitSummary({
        prevYear,
        prevYearTaxable: prev.reduce((s, r) => s + Number(r.Total_tax_salary ?? r.total_earnings ?? 0), 0),
        prevYearTotal:   prev.reduce((s, r) => s + Number(r.total_earnings ?? 0), 0),
        currentYear:     quitYear,
        currentYearTaxable: curr.reduce((s, r) => s + Number(r.Total_tax_salary ?? r.total_earnings ?? 0), 0),
        currentYearTotal:   curr.reduce((s, r) => s + Number(r.total_earnings ?? 0), 0),
        hasData: records.length > 0,
      })
    } catch {
      setQuitSummary({
        prevYear,
        prevYearTaxable: 0,
        prevYearTotal: 0,
        currentYear: quitYear,
        currentYearTaxable: 0,
        currentYearTotal: 0,
        hasData: false,
      })
    } finally {
      setQuitSummaryLoading(false)
    }
  }

  function openQuitModal(emp: EmployeeRow) {
    const today = new Date().toISOString().slice(0, 10)
    setSelected(emp)
    setForm({ quit_date: today })
    setQuitSummary(null)
    setQuitDateDirty(false)
    setModal('quit')
    loadQuitSummary(emp.id, today)
  }

  function closeQuitModal() {
    setModal(null)
    setQuitSummary(null)
    setQuitDateDirty(false)
    setShowRegNum(false)
  }

  /* ── 클라이언트 사이드 필터링 (빠른 UX) ── */
  const filtered = employees.filter(e => {
    const matchStatus  = filter === 'all' ? true : filter === 'active' ? e.is_active : !e.is_active
    const s            = search.toLowerCase()
    const matchSearch  = !search ||
      (e.name ?? '').toLowerCase().includes(s) ||
      (e.email ?? '').toLowerCase().includes(s) ||
      (e.employee_number ?? '').toLowerCase().includes(s)
    const matchCompany = !company || String(e.company_id) === company
    return matchStatus && matchSearch && matchCompany
  })

  async function save() {
    setSaving(true)
    try {
      if (modal === 'add') {
        // 사번은 서버 액션에서 자동 생성
        const result = await createEmployeeAdmin({
          company_id:      Number(form.company_id),
          name:            form.name ?? '',
          email:           form.email ?? '',
          birthdate:       form.birthdate ?? null,
          department:      form.department ?? null,
          position:        form.position ?? null,
          job:             form.job ?? null,
          Date_of_joining: form.Date_of_joining ?? null,
          Tel:             form.Tel ?? null,
          Sex:             form.Sex ?? null,
          Grade:           form.Grade ?? null,
          Role:            form.Role ?? null,
          'Working place':   form['Working place'] ?? null,
          'Work details':    form['Work details'] ?? null,
          is_active:           true,
          is_contract:         form.is_contract ?? false,
          contract_end_date:   form.contract_end_date ?? null,
          weekly_work_hours:   form.weekly_work_hours ?? null,
          is_foreigner:        form.is_foreigner ?? false,
          nationality:         form.nationality ?? null,
          visa_type:           form.visa_type ?? null,
          registration_number: form.registration_number ?? null,
        })
        if (!result.success) throw new Error(result.error)
      } else if (modal === 'edit' && selected) {
        const { error: editErr } = await supabase.from('employees').update({
          name: form.name, email: form.email, birthdate: form.birthdate,
          department: form.department, position: form.position, job: form.job,
          Date_of_joining: form.Date_of_joining, Tel: form.Tel, Sex: form.Sex,
          Grade: form.Grade, Role: form.Role,
          'Working place': form['Working place'], 'Work details': form['Work details'],
          is_contract:         form.is_contract ?? false,
          contract_end_date:   form.contract_end_date ?? null,
          weekly_work_hours:   form.weekly_work_hours ?? null,
          is_foreigner:        form.is_foreigner ?? false,
          nationality:         form.nationality ?? null,
          visa_type:           form.visa_type ?? null,
          registration_number: form.registration_number ?? null,
        }).eq('id', selected.id)
        if (editErr) throw new Error(editErr.message)
      } else if (modal === 'quit' && selected) {
        if (!form.quit_date) throw new Error('퇴사일을 입력해주세요')
        const result = await resignEmployeeAdmin(selected.id, form.quit_date)
        if (!result.success) throw new Error(result.error)
      } else if (modal === 'rehire' && selected) {
        await supabase.from('employees').update({
          is_active: true, quit_date: null,
        }).eq('id', selected.id)
      } else if (modal === 'delete' && selected) {
        const result = await deleteEmployeeAdmin(selected.id)
        if (!result.success) throw new Error(result.error)
      }
      setModal(null)
      setQuitSummary(null)
      setQuitDateDirty(false)
      startTransition(reload)
    } catch (e: unknown) {
      alert('오류: ' + (e instanceof Error ? e.message : String(e)))
    }
    setSaving(false)
  }

  async function sendInvite(emp: EmployeeRow) {
    setInviting(emp.id)
    try {
      const res = await fetch('/api/invite-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: emp.id, email: emp.email, name: emp.name }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.reused) {
        alert(`${emp.name}의 기존 계정(${emp.email})이 연결되었습니다.\n초대 이메일 없이 바로 로그인 가능합니다.`)
      } else {
        alert(`${emp.name}에게 초대 이메일을 발송했습니다.\n이메일: ${emp.email}`)
      }
      startTransition(reload)
    } catch (e: unknown) {
      alert('초대 실패: ' + (e instanceof Error ? e.message : String(e)))
    }
    setInviting(null)
  }

  const f = (key: keyof EmployeeRow) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">직원 관리</h1>
          <p className="text-sm text-slate-500 mt-0.5">전체 기업 직원 {employees.length}명</p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
          <EmployeeExportButton companies={companies} />
          <Link href="/admin/employees/upload" className="btn-secondary">
            <Upload size={15} />
            <span className="hidden sm:inline">CSV 대량 등록</span>
            <span className="sm:hidden">CSV</span>
          </Link>
          <button onClick={() => { setForm({ is_active: true }); setModal('add') }} className="btn-primary">
            <Plus size={16} />
            <span className="hidden sm:inline">직원 등록</span>
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
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
        <div className="flex gap-2">
          <select className="input flex-1 sm:w-36" value={company} onChange={e => setCompany(e.target.value)}>
            <option value="">전체 기업</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl flex-shrink-0">
            {(['active', 'inactive', 'all'] as Filter[]).map(v => (
              <button key={v} onClick={() => setFilter(v)}
                className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-all',
                  filter === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
                {v === 'active' ? '재직' : v === 'inactive' ? '퇴사' : '전체'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 빈 상태 ── */}
      {filtered.length === 0 && (
        <div className="card p-10 text-center text-slate-400 text-sm">
          {search || company || filter !== 'active' ? '검색 결과가 없습니다' : '직원이 없습니다'}
        </div>
      )}

      {/* ── 데스크톱 테이블 (md 이상) ── */}
      {filtered.length > 0 && (
        <div className="hidden md:block card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '780px' }}>
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['이름', '사번', '회사', '부서/직위', '입사일', '계정연결', '상태', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{emp.name}</p>
                      <p className="text-xs text-slate-400">{emp.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                      {emp.employee_number ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {(emp.companies as { name?: string } | null)?.name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p className="text-xs">{emp.department ?? '-'}</p>
                      <p className="text-xs text-slate-400">{emp.position ?? '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                      {formatDateShort(emp.Date_of_joining)}
                    </td>
                    <td className="px-4 py-3">
                      {emp.user_id ? (
                        <span className="badge badge-green">연결됨</span>
                      ) : (
                        <button
                          onClick={() => sendInvite(emp)}
                          disabled={inviting === emp.id}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline disabled:opacity-50"
                        >
                          <Mail size={12} />
                          {inviting === emp.id ? '발송중...' : '초대 발송'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${emp.is_active ? 'badge-green' : 'badge-gray'}`}>
                        {emp.is_active ? '재직' : '퇴사'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelected(emp); setForm({ ...emp }); setModal('edit') }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          수정
                        </button>
                        {emp.is_active ? (
                          <button
                            onClick={() => openQuitModal(emp)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            퇴사
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => { setSelected(emp); setModal('rehire') }}
                              className="text-xs text-emerald-600 hover:underline"
                            >
                              재직으로 변경
                            </button>
                            <button
                              onClick={() => { setSelected(emp); setModal('delete') }}
                              className="text-xs text-red-400 hover:text-red-600 hover:underline"
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 모바일 카드 (md 미만) ── */}
      {filtered.length > 0 && (
        <div className="md:hidden space-y-2.5">
          {filtered.map(emp => {
            const companyName = (emp.companies as { name?: string } | null)?.name
            return (
              <div key={emp.id} className="card p-4 space-y-3">
                {/* 상단: 이름 + 상태 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{emp.name}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{emp.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`badge ${emp.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {emp.is_active ? '재직' : '퇴사'}
                    </span>
                    {emp.user_id
                      ? <span className="badge badge-blue">계정연결</span>
                      : <span className="badge badge-yellow">미연결</span>
                    }
                  </div>
                </div>
                {/* 정보 그리드 */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-t border-slate-100 pt-3">
                  <InfoPair label="사번" value={emp.employee_number ?? '-'} mono />
                  <InfoPair label="회사" value={companyName ?? '-'} />
                  <InfoPair label="부서" value={emp.department ?? '-'} />
                  <InfoPair label="직위" value={emp.position ?? '-'} />
                  <InfoPair label="입사일" value={formatDateShort(emp.Date_of_joining)} />
                </div>
                {/* 액션 */}
                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => { setSelected(emp); setForm({ ...emp }); setModal('edit') }}
                    className="flex-1 text-xs text-blue-600 hover:underline py-1"
                  >
                    정보 수정
                  </button>
                  {!emp.user_id && (
                    <button
                      onClick={() => sendInvite(emp)}
                      disabled={inviting === emp.id}
                      className="flex-1 text-xs text-slate-600 hover:text-blue-600 disabled:opacity-50 py-1"
                    >
                      {inviting === emp.id ? '발송중...' : '초대 발송'}
                    </button>
                  )}
                  {emp.is_active ? (
                    <button
                      onClick={() => openQuitModal(emp)}
                      className="flex-1 text-xs text-red-500 hover:underline py-1"
                    >
                      퇴사 처리
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => { setSelected(emp); setModal('rehire') }}
                        className="flex-1 text-xs text-emerald-600 hover:underline py-1"
                      >
                        재직으로 변경
                      </button>
                      <button
                        onClick={() => { setSelected(emp); setModal('delete') }}
                        className="flex-1 text-xs text-red-400 hover:text-red-600 hover:underline py-1"
                      >
                        삭제
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 직원 등록/수정 모달 */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? '직원 등록' : '직원 수정'} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {/* 사번 — 수정 모달에서 읽기 전용 표시 */}
            {modal === 'edit' && selected?.employee_number && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">사번 (자동 생성)</label>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm font-mono text-slate-600">
                  <Hash size={13} className="text-slate-400" />
                  {selected.employee_number}
                </div>
              </div>
            )}
            {([
              ['이름 *',   'name',       'text'],
              ['이메일 *', 'email',      'email'],
              ['부서',     'department', 'text'],
              ['직위',     'position',   'text'],
              ['직급',     'Grade',      'text'],
              ['직책',     'Role',       'text'],
              ['직무',     'job',        'text'],
              ['전화번호', 'Tel',        'tel'],
            ] as [string, keyof EmployeeRow, string][]).map(([label, key, type]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                <input
                  className="input"
                  type={type}
                  value={(form as Record<string, unknown>)[key] as string ?? ''}
                  onChange={f(key)}
                />
              </div>
            ))}
            {/* 주민(외국인)등록번호 */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">주민(외국인)등록번호</label>
              <input
                className="input"
                placeholder="901225-1234567"
                maxLength={14}
                value={
                  !regFocused && (form.registration_number ?? '').replace(/\D/g, '').length === 13
                    ? `${(form.registration_number ?? '').slice(0, 7)}*******`
                    : (form.registration_number ?? '')
                }
                onFocus={() => setRegFocused(true)}
                onBlur={() => setRegFocused(false)}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 13)
                  const formatted = digits.length > 6 ? `${digits.slice(0, 6)}-${digits.slice(6)}` : digits
                  setForm(p => {
                    const next: Partial<EmployeeRow> = { ...p, registration_number: formatted || null }
                    if (digits.length >= 6) next.birthdate = digits.slice(0, 6)
                    return next
                  })
                }}
              />
              <p className="text-[11px] text-slate-400 mt-1">입력 시 생년월일 자동 기재 · 뒷자리 마스킹 표시</p>
            </div>
            {/* 생년월일 */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">생년월일 6자리</label>
              <input
                className="input"
                placeholder="901225"
                maxLength={6}
                value={form.birthdate ?? ''}
                onChange={e => setForm(p => ({ ...p, birthdate: e.target.value.replace(/\D/g, '').slice(0, 6) || null }))}
              />
              <p className="text-[11px] text-slate-400 mt-1">초기 비밀번호로 사용됩니다</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">소속 회사</label>
              <select className="input" value={form.company_id ?? ''} onChange={f('company_id')}>
                <option value="">선택</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">입사일</label>
              <input className="input" type="date" value={form.Date_of_joining ?? ''} onChange={f('Date_of_joining')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">성별</label>
              <select className="input" value={form.Sex ?? ''} onChange={f('Sex')}>
                <option value="">선택</option>
                <option value="M">남성</option>
                <option value="F">여성</option>
              </select>
            </div>
            {/* 외국인 여부 */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">외국인 여부</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!form.is_foreigner}
                  onClick={() => setForm(p => ({
                    ...p,
                    is_foreigner: !p.is_foreigner,
                    nationality: p.is_foreigner ? null : p.nationality,
                    visa_type:   p.is_foreigner ? null : p.visa_type,
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    form.is_foreigner ? 'bg-blue-500' : 'bg-slate-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form.is_foreigner ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
                <span className="text-sm text-slate-700">{form.is_foreigner ? '외국인' : '내국인'}</span>
              </div>
            </div>
            {form.is_foreigner && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">국가</label>
                  <input
                    className="input"
                    placeholder="예: 미국, 중국, 베트남"
                    value={(form as Record<string, unknown>).nationality as string ?? ''}
                    onChange={e => setForm(p => ({ ...p, nationality: e.target.value || null }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">비자유형</label>
                  <input
                    className="input"
                    placeholder="예: E-7, F-4, H-2"
                    value={(form as Record<string, unknown>).visa_type as string ?? ''}
                    onChange={e => setForm(p => ({ ...p, visa_type: e.target.value || null }))}
                  />
                </div>
              </>
            )}
            {/* 1주 소정근로시간 */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">1주 소정근로시간</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type="number"
                  min={1}
                  max={168}
                  placeholder="40"
                  value={(form as Record<string, unknown>).weekly_work_hours as string ?? ''}
                  onChange={e => setForm(p => ({ ...p, weekly_work_hours: e.target.value ? Number(e.target.value) : null }))}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">시간</span>
              </div>
            </div>
            {/* 고용 형태 */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">고용 형태</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!form.is_contract}
                  onClick={() => setForm(p => ({
                    ...p,
                    is_contract: !p.is_contract,
                    contract_end_date: p.is_contract ? null : p.contract_end_date,
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    form.is_contract ? 'bg-blue-500' : 'bg-slate-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form.is_contract ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
                <span className="text-sm text-slate-700">{form.is_contract ? '계약직' : '정규직'}</span>
              </div>
            </div>
            {form.is_contract && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">계약만료일</label>
                <input
                  className="input"
                  type="date"
                  value={form.contract_end_date ?? ''}
                  onChange={e => setForm(p => ({ ...p, contract_end_date: e.target.value || null }))}
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
            <button onClick={() => setModal(null)} className="btn-secondary flex-1">취소</button>
            {modal === 'edit' && selected && !selected.is_active && (
              <button
                onClick={() => setModal('rehire')}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                재직으로 변경
              </button>
            )}
            <button onClick={save} className="btn-primary flex-1" disabled={saving}>
              {saving ? '저장중...' : '저장'}
            </button>
          </div>
        </Modal>
      )}

      {/* 퇴사 처리 모달 */}
      {modal === 'quit' && selected && (
        <Modal title="퇴사 처리" onClose={closeQuitModal}>
          {/* 직원 기본 정보 */}
          <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">직원명</span>
              <span className="font-semibold text-slate-900">{selected.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">입사일</span>
              <span className="text-slate-700">{selected.Date_of_joining ?? '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">생년월일</span>
              <span className="text-slate-700">{selected.birthdate ?? '-'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">주민등록번호</span>
              {selected.registration_number ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-700 font-mono text-xs">
                    {showRegNum
                      ? selected.registration_number
                      : `${selected.registration_number.slice(0, 7)}*******`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRegNum(v => !v)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showRegNum ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              ) : (
                <span className="text-slate-400">-</span>
              )}
            </div>
          </div>

          {/* 퇴사일 입력 */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-slate-600 mb-1">퇴사일</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                type="date"
                value={form.quit_date ?? ''}
                onChange={e => {
                  setForm(p => ({ ...p, quit_date: e.target.value }))
                  setQuitDateDirty(true)
                }}
              />
              {quitDateDirty && form.quit_date && (
                <button
                  onClick={() => loadQuitSummary(selected.id, form.quit_date!)}
                  disabled={quitSummaryLoading}
                  className="btn-secondary text-xs px-3 flex-shrink-0"
                >
                  재조회
                </button>
              )}
            </div>
          </div>

          {/* 급여 내역 요약 */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">급여 내역 요약</p>
            {quitSummaryLoading && (
              <div className="text-center py-5 text-sm text-slate-400">급여 내역 조회 중...</div>
            )}
            {!quitSummaryLoading && quitSummary && (
              <div className="space-y-2">
                {/* 전년도 */}
                <div className="border border-slate-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-medium text-slate-400 mb-2">{quitSummary.prevYear}년 · 전년도</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">과세총액</span>
                      <span className="font-semibold text-slate-900">
                        {quitSummary.prevYearTaxable > 0 ? formatKRW(quitSummary.prevYearTaxable) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">총임금액</span>
                      <span className="font-semibold text-slate-900">
                        {quitSummary.prevYearTotal > 0 ? formatKRW(quitSummary.prevYearTotal) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
                {/* 퇴사연도 */}
                <div className="border border-red-200 bg-red-50/40 rounded-xl px-4 py-3">
                  <p className="text-xs font-medium text-red-500 mb-2">{quitSummary.currentYear}년 · 퇴사연도</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">과세총액</span>
                      <span className="font-semibold text-slate-900">
                        {quitSummary.currentYearTaxable > 0 ? formatKRW(quitSummary.currentYearTaxable) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">총임금액</span>
                      <span className="font-semibold text-slate-900">
                        {quitSummary.currentYearTotal > 0 ? formatKRW(quitSummary.currentYearTotal) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
                {!quitSummary.hasData && (
                  <p className="text-xs text-slate-400 text-center pt-1">등록된 급여 내역이 없습니다.</p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button onClick={closeQuitModal} className="btn-secondary flex-1">취소</button>
            <button
              onClick={save}
              className="btn-danger flex-1"
              disabled={saving || quitSummaryLoading || !quitSummary || quitDateDirty}
            >
              {saving ? '처리중...' : '최종 퇴사 처리 확인'}
            </button>
          </div>
        </Modal>
      )}

      {/* 직원 완전 삭제 확인 모달 */}
      {modal === 'delete' && selected && (
        <Modal title="직원 정보 삭제" onClose={() => setModal(null)}>
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
            <p className="text-xs text-red-700 leading-relaxed">
              이 작업은 되돌릴 수 없습니다. 직원 정보와 해당 직원의 모든 급여 데이터가 영구적으로 삭제됩니다.
            </p>
          </div>
          <p className="text-sm text-slate-700 mb-1">
            <span className="font-semibold">{selected.name}</span>님의 모든 정보를 삭제하시겠습니까?
          </p>
          {selected.quit_date && (
            <p className="text-xs text-slate-400 mb-1">퇴사일: {selected.quit_date}</p>
          )}
          <p className="text-xs text-slate-400">이메일: {selected.email}</p>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setModal(null)} className="btn-secondary flex-1">취소</button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '삭제중...' : '영구 삭제'}
            </button>
          </div>
        </Modal>
      )}

      {/* 재직 복귀 확인 모달 */}
      {modal === 'rehire' && selected && (
        <Modal title="재직으로 변경" onClose={() => setModal(null)}>
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
            <p className="text-xs text-emerald-700">
              퇴사 처리된 직원을 재직 상태로 되돌립니다. 퇴사일이 초기화됩니다.
            </p>
          </div>
          <p className="text-sm text-slate-700 mb-1">
            <span className="font-semibold">{selected.name}</span>님을 재직으로 변경하시겠습니까?
          </p>
          {selected.quit_date && (
            <p className="text-xs text-slate-400">퇴사일: {selected.quit_date}</p>
          )}
          <div className="flex gap-2 mt-5">
            <button onClick={() => setModal(null)} className="btn-secondary flex-1">취소</button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '처리중...' : '재직으로 변경'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function InfoPair({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className={cn('text-slate-700 mt-0.5 font-medium', mono && 'font-mono')}>{value}</p>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="card w-full max-w-lg p-5 my-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
