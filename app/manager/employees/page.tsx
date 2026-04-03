'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Employee } from '@/types'
import { formatDate } from '@/lib/utils'

export default function ManagerEmployeesPage() {
  const supabase = createClient()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'active' | 'inactive' | 'all'>('active')
  const [modal, setModal] = useState<'add' | 'edit' | 'quit' | null>(null)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [form, setForm] = useState<Partial<Employee>>({})
  const [saving, setSaving] = useState(false)
  const [companyId, setCompanyId] = useState<number | null>(null)

  useEffect(() => {
    supabase.from('profiles').select('company_id').single().then(({ data }) => {
      setCompanyId(data?.company_id ?? null)
    })
  }, [])

  useEffect(() => {
    if (!companyId) return
    fetch()
  }, [companyId, filterActive])

  async function fetch() {
    setLoading(true)
    let q = supabase.from('employees').select('*').eq('company_id', companyId!).order('name')
    if (filterActive === 'active') q = q.eq('is_active', true)
    if (filterActive === 'inactive') q = q.eq('is_active', false)
    const { data } = await q
    setEmployees(data ?? [])
    setLoading(false)
  }

  const filtered = employees.filter(e =>
    !search || e.name?.includes(search) || e.email?.includes(search)
  )

  function openAdd() { setForm({ is_active: true, company_id: companyId! }); setModal('add') }
  function openEdit(emp: Employee) { setSelected(emp); setForm({ ...emp }); setModal('edit') }
  function openQuit(emp: Employee) {
    setSelected(emp)
    setForm({ quit_date: new Date().toISOString().slice(0, 10) })
    setModal('quit')
  }

  async function save() {
    setSaving(true)
    try {
      if (modal === 'add') {
        await supabase.from('employees').insert({ ...form, company_id: companyId! })
      } else if (modal === 'edit' && selected) {
        await supabase.from('employees').update({
          name: form.name, email: form.email, birthdate: form.birthdate,
          department: form.department, position: form.position, job: form.job,
          Date_of_joining: form.Date_of_joining, Tel: form.Tel, Sex: form.Sex,
          Grade: form.Grade, Role: form.Role,
          'Working place': form['Working place'], 'Work details': form['Work details'],
        }).eq('id', selected.id)
      } else if (modal === 'quit' && selected) {
        await supabase.from('employees').update({ quit_date: form.quit_date, is_active: false }).eq('id', selected.id)
      }
      setModal(null)
      fetch()
    } catch (e: any) { alert(e.message) }
    setSaving(false)
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

      <div className="flex flex-wrap gap-2">
        <input className="input w-44" placeholder="이름·이메일 검색" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['active', 'inactive', 'all'] as const).map(v => (
            <button key={v} onClick={() => setFilterActive(v)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all
                ${filterActive === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {v === 'active' ? '재직중' : v === 'inactive' ? '퇴사' : '전체'}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['이름', '부서/직위', '입사일', '퇴사일', '상태', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">불러오는 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">직원이 없습니다</td></tr>
              ) : filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-400">{emp.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <p>{emp.department ?? '-'}</p>
                    <p className="text-xs text-gray-400">{emp.position ?? '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(emp.Date_of_joining)}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(emp.quit_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${emp.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {emp.is_active ? '재직' : '퇴사'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(emp)} className="text-xs text-brand-600 hover:underline">수정</button>
                      {emp.is_active && (
                        <button onClick={() => openQuit(emp)} className="text-xs text-red-500 hover:underline">퇴사처리</button>
                      )}
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
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="card w-full max-w-lg p-5 my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{modal === 'add' ? '직원 등록' : '직원 정보 수정'}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['이름 *', 'name', 'text'], ['이메일 *', 'email', 'email'],
                ['생년월일 6자리', 'birthdate', 'text'], ['부서', 'department', 'text'],
                ['직위', 'position', 'text'], ['직급', 'Grade', 'text'],
                ['직책', 'Role', 'text'], ['직무', 'job', 'text'],
                ['전화번호', 'Tel', 'tel'],
              ].map(([label, key, type]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input className="input" type={type} value={(form as any)[key] ?? ''} onChange={f(key as keyof Employee)} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">입사일</label>
                <input className="input" type="date" value={form.Date_of_joining ?? ''} onChange={f('Date_of_joining')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">성별</label>
                <select className="input" value={form.Sex ?? ''} onChange={f('Sex')}>
                  <option value="">선택</option>
                  <option value="남">남</option>
                  <option value="여">여</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">근무장소</label>
                <input className="input" value={form['Working place'] ?? ''} onChange={f('Working place')} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">업무내용</label>
                <textarea className="input resize-none h-16" value={form['Work details'] ?? ''} onChange={f('Work details')} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">취소</button>
              <button onClick={save} className="btn-primary flex-1" disabled={saving}>{saving ? '저장중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 퇴사 모달 */}
      {modal === 'quit' && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-sm p-5">
            <h3 className="font-semibold mb-1">퇴사 처리</h3>
            <p className="text-sm text-gray-500 mb-4">{selected.name} 직원을 퇴사 처리합니다</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">퇴사일</label>
              <input className="input" type="date" value={form.quit_date ?? ''}
                onChange={e => setForm(p => ({ ...p, quit_date: e.target.value }))} />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">취소</button>
              <button onClick={save} className="btn-danger flex-1" disabled={saving}>{saving ? '처리중...' : '퇴사 처리'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
