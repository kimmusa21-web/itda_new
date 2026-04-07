'use client'

import { useState, useTransition } from 'react'
import { Plus, Search, Mail, Upload } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { EmployeeRow } from '@/lib/supabase/queries/employee'
import { formatDateShort, cn } from '@/lib/utils'

type Filter = 'active' | 'inactive' | 'all'

interface Props {
  initialEmployees: EmployeeRow[]
  companies: { id: number; name: string }[]
}

export default function AdminEmployeesClient({ initialEmployees, companies }: Props) {
  const supabase = createClient()
  const [employees, setEmployees] = useState(initialEmployees)
  const [filter, setFilter]       = useState<Filter>('active')
  const [search, setSearch]       = useState('')
  const [company, setCompany]     = useState('')
  const [modal, setModal]         = useState<'add' | 'edit' | 'quit' | 'invite' | null>(null)
  const [selected, setSelected]   = useState<EmployeeRow | null>(null)
  const [form, setForm]           = useState<Partial<EmployeeRow>>({})
  const [saving, setSaving]       = useState(false)
  const [inviting, setInviting]   = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  async function reload() {
    const { data } = await supabase
      .from('employees').select('*, companies(name)').order('name')
    setEmployees(data ?? [])
  }

  const filtered = employees.filter(e => {
    const matchStatus  = filter === 'all' ? true : filter === 'active' ? e.is_active : !e.is_active
    const matchSearch  = !search || e.name?.includes(search) || e.email?.includes(search)
    const matchCompany = !company || String(e.company_id) === company
    return matchStatus && matchSearch && matchCompany
  })

  async function save() {
    setSaving(true)
    try {
      if (modal === 'add') {
        await supabase.from('employees').insert({
          name: form.name, email: form.email, birthdate: form.birthdate,
          company_id: form.company_id, department: form.department, position: form.position,
          job: form.job, Date_of_joining: form.Date_of_joining,
          Tel: form.Tel, Sex: form.Sex, Grade: form.Grade, Role: form.Role,
          'Working place': form['Working place'], 'Work details': form['Work details'],
          is_active: true,
        })
      } else if (modal === 'edit' && selected) {
        await supabase.from('employees').update({
          name: form.name, email: form.email, birthdate: form.birthdate,
          department: form.department, position: form.position, job: form.job,
          Date_of_joining: form.Date_of_joining, Tel: form.Tel, Sex: form.Sex,
          Grade: form.Grade, Role: form.Role,
          'Working place': form['Working place'], 'Work details': form['Work details'],
        }).eq('id', selected.id)
      } else if (modal === 'quit' && selected) {
        await supabase.from('employees').update({
          quit_date: form.quit_date, is_active: false,
        }).eq('id', selected.id)
      }
      setModal(null)
      startTransition(reload)
    } catch (e: any) { alert('오류: ' + e.message) }
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
      alert(`${emp.name}에게 초대 이메일을 발송했습니다.\n이메일: ${emp.email}`)
      startTransition(reload)
    } catch (e: any) { alert('초대 실패: ' + e.message) }
    setInviting(null)
  }

  const f = (key: keyof EmployeeRow) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">사용자 관리</h1>
          <p className="text-sm text-slate-500 mt-0.5">전체 기업 직원 {employees.length}명</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link href="/admin/employees/upload" className="btn-secondary">
            <Upload size={15} />
            CSV 대량 등록
          </Link>
          <button onClick={() => { setForm({ is_active: true }); setModal('add') }}
            className="btn-primary">
            <Plus size={16} />직원 등록
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="이름·이메일 검색" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={company} onChange={e => setCompany(e.target.value)}>
          <option value="">전체 기업</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['active', 'inactive', 'all'] as Filter[]).map(v => (
            <button key={v} onClick={() => setFilter(v)}
              className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-all',
                filter === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
              {v === 'active' ? '재직' : v === 'inactive' ? '퇴사' : '전체'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '680px' }}>
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['이름', '회사', '부서/직위', '입사일', '계정연결', '상태', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">직원이 없습니다</td></tr>
              ) : filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{emp.name}</p>
                    <p className="text-xs text-slate-400">{emp.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{(emp.companies as any)?.name}</td>
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
                      <button onClick={() => { setSelected(emp); setForm({...emp}); setModal('edit') }}
                        className="text-xs text-blue-600 hover:underline">수정</button>
                      {emp.is_active && (
                        <button onClick={() => { setSelected(emp); setForm({ quit_date: new Date().toISOString().slice(0,10) }); setModal('quit') }}
                          className="text-xs text-red-500 hover:underline">퇴사</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? '직원 등록' : '직원 수정'} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {[
              ['이름 *', 'name', 'text'], ['이메일 *', 'email', 'email'],
              ['생년월일 6자리', 'birthdate', 'text'], ['부서', 'department', 'text'],
              ['직위', 'position', 'text'], ['직급', 'Grade', 'text'],
              ['직책', 'Role', 'text'], ['직무', 'job', 'text'],
              ['전화번호', 'Tel', 'tel'],
            ].map(([label, key, type]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                <input className="input" type={type} value={(form as any)[key] ?? ''} onChange={f(key as keyof EmployeeRow)} />
              </div>
            ))}
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
                <option value="">선택</option><option value="남">남</option><option value="여">여</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
            <button onClick={() => setModal(null)} className="btn-secondary flex-1">취소</button>
            <button onClick={save} className="btn-primary flex-1" disabled={saving}>
              {saving ? '저장중...' : '저장'}
            </button>
          </div>
        </Modal>
      )}

      {/* Quit modal */}
      {modal === 'quit' && selected && (
        <Modal title="퇴사 처리" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600 mb-4">{selected.name}을 퇴사 처리합니다.</p>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">퇴사일</label>
            <input className="input" type="date" value={form.quit_date ?? ''}
              onChange={e => setForm(p => ({ ...p, quit_date: e.target.value }))} />
          </div>
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
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
