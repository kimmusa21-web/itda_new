'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Employee, Company } from '@/types'
import { formatDate } from '@/lib/utils'

export default function AdminEmployeesPage() {
  const supabase = createClient()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active')
  const [modal, setModal] = useState<'add' | 'edit' | 'quit' | null>(null)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [form, setForm] = useState<Partial<Employee>>({})
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('employees').select('*, companies(name)').order('name')
    if (filterCompany) q = q.eq('company_id', filterCompany)
    if (filterActive === 'active') q = q.eq('is_active', true)
    if (filterActive === 'inactive') q = q.eq('is_active', false)
    const { data } = await q
    setEmployees(data ?? [])
    setLoading(false)
  }, [filterCompany, filterActive])

  useEffect(() => {
    fetch()
    supabase.from('companies').select('id,name').order('name').then(({ data }) => setCompanies(data ?? []))
  }, [fetch])

  const filtered = employees.filter(e =>
    !search || e.name?.includes(search) || e.email?.includes(search)
  )

  function openAdd() {
    setForm({ is_active: true })
    setSelected(null)
    setModal('add')
  }

  function openEdit(emp: Employee) {
    setSelected(emp)
    setForm({ ...emp })
    setModal('edit')
  }

  function openQuit(emp: Employee) {
    setSelected(emp)
    setForm({ quit_date: new Date().toISOString().slice(0, 10) })
    setModal('quit')
  }

  async function save() {
    setSaving(true)
    try {
      if (modal === 'add') {
        const { error } = await supabase.from('employees').insert({
          name: form.name,
          email: form.email,
          birthdate: form.birthdate,
          company_id: form.company_id,
          department: form.department,
          position: form.position,
          job: form.job,
          Date_of_joining: form.Date_of_joining,
          Tel: form.Tel,
          Sex: form.Sex,
          Grade: form.Grade,
          Role: form.Role,
          'Working place': form['Working place'],
          'Work details': form['Work details'],
          is_active: true,
        })
        if (error) throw error
      } else if (modal === 'edit' && selected) {
        const { error } = await supabase.from('employees').update({
          name: form.name,
          email: form.email,
          birthdate: form.birthdate,
          company_id: form.company_id,
          department: form.department,
          position: form.position,
          job: form.job,
          Date_of_joining: form.Date_of_joining,
          Tel: form.Tel,
          Sex: form.Sex,
          Grade: form.Grade,
          Role: form.Role,
          'Working place': form['Working place'],
          'Work details': form['Work details'],
        }).eq('id', selected.id)
        if (error) throw error
      } else if (modal === 'quit' && selected) {
        const { error } = await supabase.from('employees').update({
          quit_date: form.quit_date,
          is_active: false,
        }).eq('id', selected.id)
        if (error) throw error
      }
      setModal(null)
      fetch()
    } catch (e: any) {
      alert('저장 오류: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function reactivate(emp: Employee) {
    if (!confirm(`${emp.name}을 재입사 처리하시겠습니까?`)) return
    await supabase.from('employees').update({ is_active: true, quit_date: null }).eq('id', emp.id)
    fetch()
  }

  const f = (key: keyof Employee) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">직원 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">직원 등록 및 입퇴사 처리</p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ 직원 등록</button>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2">
        <input className="input w-40" placeholder="이름·이메일 검색" value={search}
          onChange={e => setSearch(e.target.value)} />
        <select className="input w-36" value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
          <option value="">전체 기업</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['all', 'active', 'inactive'] as const).map(v => (
            <button key={v} onClick={() => setFilterActive(v)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all
                ${filterActive === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {v === 'all' ? '전체' : v === 'active' ? '재직중' : '퇴사'}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['이름', '회사', '부서', '직위', '입사일', '퇴사일', '상태', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">불러오는 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">직원이 없습니다</td></tr>
              ) : filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-400">{emp.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{(emp.companies as any)?.name}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.department ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.position ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(emp.Date_of_joining)}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(emp.quit_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${emp.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {emp.is_active ? '재직' : '퇴사'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(emp)} className="text-xs text-brand-600 hover:underline">수정</button>
                      {emp.is_active
                        ? <button onClick={() => openQuit(emp)} className="text-xs text-red-500 hover:underline">퇴사처리</button>
                        : <button onClick={() => reactivate(emp)} className="text-xs text-green-600 hover:underline">재입사</button>
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 등록/수정 모달 */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? '직원 등록' : '직원 정보 수정'} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="이름 *"><input className="input" value={form.name ?? ''} onChange={f('name')} /></Field>
            <Field label="이메일 *"><input className="input" type="email" value={form.email ?? ''} onChange={f('email')} /></Field>
            <Field label="생년월일 6자리"><input className="input" placeholder="900101" value={form.birthdate ?? ''} onChange={f('birthdate')} /></Field>
            <Field label="소속 회사 *">
              <select className="input" value={form.company_id ?? ''} onChange={f('company_id')}>
                <option value="">선택</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="부서"><input className="input" value={form.department ?? ''} onChange={f('department')} /></Field>
            <Field label="직위"><input className="input" value={form.position ?? ''} onChange={f('position')} /></Field>
            <Field label="직급"><input className="input" value={form.Grade ?? ''} onChange={f('Grade')} /></Field>
            <Field label="직책"><input className="input" value={form.Role ?? ''} onChange={f('Role')} /></Field>
            <Field label="직무"><input className="input" value={form.job ?? ''} onChange={f('job')} /></Field>
            <Field label="입사일">
              <input className="input" type="date" value={form.Date_of_joining ?? ''} onChange={f('Date_of_joining')} />
            </Field>
            <Field label="전화번호"><input className="input" value={form.Tel ?? ''} onChange={f('Tel')} /></Field>
            <Field label="성별">
              <select className="input" value={form.Sex ?? ''} onChange={f('Sex')}>
                <option value="">선택</option>
                <option value="남">남</option>
                <option value="여">여</option>
              </select>
            </Field>
            <Field label="근무장소" className="col-span-2">
              <input className="input" value={form['Working place'] ?? ''} onChange={f('Working place')} />
            </Field>
            <Field label="업무내용" className="col-span-2">
              <textarea className="input resize-none h-16" value={form['Work details'] ?? ''} onChange={f('Work details')} />
            </Field>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setModal(null)} className="btn-secondary flex-1">취소</button>
            <button onClick={save} className="btn-primary flex-1" disabled={saving}>
              {saving ? '저장중...' : '저장'}
            </button>
          </div>
        </Modal>
      )}

      {/* 퇴사 처리 모달 */}
      {modal === 'quit' && selected && (
        <Modal title="퇴사 처리" onClose={() => setModal(null)}>
          <p className="text-sm text-gray-600 mb-4">
            <span className="font-semibold">{selected.name}</span> 직원을 퇴사 처리합니다.
          </p>
          <Field label="퇴사일">
            <input className="input" type="date" value={form.quit_date ?? ''}
              onChange={e => setForm(p => ({ ...p, quit_date: e.target.value }))} />
          </Field>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setModal(null)} className="btn-secondary flex-1">취소</button>
            <button onClick={save} className="btn-danger flex-1" disabled={saving}>
              {saving ? '처리중...' : '퇴사 처리'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="card w-full max-w-lg p-5 my-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
