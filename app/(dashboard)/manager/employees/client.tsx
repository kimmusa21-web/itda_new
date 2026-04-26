'use client'

import { useState, useTransition } from 'react'
import { Search, Users, Mail, CalendarDays, Hash, X, Send, Loader2, Pencil, Check, AlertCircle } from 'lucide-react'
import type { EmployeeRow } from '@/lib/supabase/queries/employee'
import { formatDateShort, cn, getInitials } from '@/lib/utils'
import { resendEmployeeInvite } from '@/lib/actions/employee-invite-create'
import { updateEmployeeByManager } from '@/lib/actions/employee-edit-actions'
import type { EmployeeEditInput } from '@/lib/actions/employee-edit-actions'

type Filter = 'active' | 'inactive' | 'all'

const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#6366f1',
]
function avatarBg(name: string): string {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

interface Props {
  initialEmployees: EmployeeRow[]
  companyName: string
}

export function ManagerEmployeesClient({ initialEmployees, companyName }: Props) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [filter, setFilter]       = useState<Filter>('active')
  const [search, setSearch]       = useState('')
  const [editTarget, setEditTarget] = useState<EmployeeRow | null>(null)

  const filtered = employees.filter(e => {
    const matchStatus =
      filter === 'all'    ? true :
      filter === 'active' ? e.is_active : !e.is_active
    const s = search.toLowerCase()
    const matchSearch =
      !search ||
      (e.name            ?? '').toLowerCase().includes(s) ||
      (e.email           ?? '').toLowerCase().includes(s) ||
      (e.employee_number ?? '').toLowerCase().includes(s) ||
      (e.department      ?? '').includes(search)
    return matchStatus && matchSearch
  })

  function handleEditSaved(updated: EmployeeRow) {
    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e))
    setEditTarget(null)
  }

  return (
    <>
      {/* 검색 + 탭 */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="이름, 이메일, 사번, 부서 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl self-start">
          {([['active', '재직중'], ['inactive', '퇴사'], ['all', '전체']] as [Filter, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                filter === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <Users size={28} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">{search ? '검색 결과가 없습니다' : '직원이 없습니다'}</p>
          {!search && filter === 'active' && (
            <p className="text-xs text-slate-400 mt-1">상단의 &apos;등록 요청&apos; 버튼으로 직원을 등록하세요</p>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(emp => (
            <EmployeeListItem
              key={emp.id}
              emp={emp}
              onEdit={() => setEditTarget(emp)}
            />
          ))}
        </div>
      )}

      {/* 수정 모달 */}
      {editTarget && (
        <EditModal
          emp={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleEditSaved}
        />
      )}
    </>
  )
}

/* ── 직원 카드 ─────────────────────────────────────────────── */
function EmployeeListItem({ emp, onEdit }: { emp: EmployeeRow; onEdit: () => void }) {
  const bg       = avatarBg(emp.name ?? '?')
  const initials = getInitials(emp.name ?? '?')
  const isLinked  = !!emp.user_id
  const isInvited = !isLinked && !emp.is_active

  const [isPending, startTransition] = useTransition()
  const [resendMsg, setResendMsg]    = useState<{ ok: boolean; text: string } | null>(null)

  function handleResend() {
    setResendMsg(null)
    startTransition(async () => {
      const result = await resendEmployeeInvite(emp.id, emp.company_id)
      setResendMsg(
        result.success
          ? { ok: true,  text: '초대 이메일을 재발송했습니다.' }
          : { ok: false, text: result.error ?? '재발송 실패' },
      )
      setTimeout(() => setResendMsg(null), 3000)
    })
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all">
      {/* 아바타 */}
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
        style={{ backgroundColor: bg }}>
        {initials}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-900">{emp.name}</span>
          {emp.employee_number && (
            <span className="flex items-center gap-0.5 text-xs text-slate-400 font-mono">
              <Hash size={10} />{emp.employee_number}
            </span>
          )}
          {isInvited ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">초대 대기</span>
          ) : emp.is_active ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">재직</span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500">퇴사</span>
          )}
          {isLinked && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">가입완료</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-xs text-slate-500">
          {emp.department && <span>{emp.department}</span>}
          {emp.department && emp.position && <span className="text-slate-300">·</span>}
          {emp.position   && <span>{emp.position}</span>}
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
          {emp.email && <span className="flex items-center gap-1"><Mail size={10} />{emp.email}</span>}
          {emp.Date_of_joining && (
            <span className="flex items-center gap-1"><CalendarDays size={10} />{formatDateShort(emp.Date_of_joining)} 입사</span>
          )}
        </div>

        {resendMsg && (
          <p className={cn('mt-1.5 text-xs font-medium', resendMsg.ok ? 'text-emerald-600' : 'text-red-500')}>
            {resendMsg.text}
          </p>
        )}
      </div>

      {/* 버튼 영역 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={onEdit}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
          <Pencil size={12} />수정
        </button>
        {!isLinked && (
          <button onClick={handleResend} disabled={isPending} title="초대 이메일 재발송"
            className={cn('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
              isPending ? 'border-slate-200 text-slate-300 cursor-not-allowed' : 'border-blue-200 text-blue-600 hover:bg-blue-50')}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            재발송
          </button>
        )}
      </div>
    </div>
  )
}

/* ── 수정 모달 ─────────────────────────────────────────────── */
function EditModal({ emp, onClose, onSaved }: {
  emp: EmployeeRow
  onClose: () => void
  onSaved: (updated: EmployeeRow) => void
}) {
  const [form, setForm] = useState<EmployeeEditInput>({
    name:         emp.name         ?? '',
    phone:        emp.Tel          ?? '',
    birthdate:    emp.birthdate    ?? '',
    gender:       emp.Sex          ?? '',
    department:   emp.department   ?? '',
    position:     emp.position     ?? '',
    grade:        emp.Grade        ?? '',
    roleTitle:    emp.Role         ?? '',
    job:          emp.job          ?? '',
    workLocation: emp['Working place'] ?? '',
    joinDate:     emp.Date_of_joining  ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  function set(key: keyof EmployeeEditInput, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setErrMsg('이름은 필수입니다'); return }
    setSaving(true)
    setErrMsg(null)
    const result = await updateEmployeeByManager(emp.id, form)
    setSaving(false)
    if (result.success) {
      onSaved({
        ...emp,
        name:            form.name,
        Tel:             form.phone        || null,
        birthdate:       form.birthdate    || null,
        Sex:             form.gender       || null,
        department:      form.department   || null,
        position:        form.position     || null,
        Grade:           form.grade        || null,
        Role:            form.roleTitle    || null,
        job:             form.job          || null,
        'Working place': form.workLocation || null,
        Date_of_joining: form.joinDate     || null,
      })
    } else {
      setErrMsg(result.error)
    }
  }

  const fields: [string, keyof EmployeeEditInput, string][] = [
    ['이름 *',   'name',         'text'],
    ['전화번호', 'phone',        'tel'],
    ['생년월일', 'birthdate',    'date'],
    ['부서',     'department',   'text'],
    ['직위',     'position',     'text'],
    ['직급',     'grade',        'text'],
    ['직책',     'roleTitle',    'text'],
    ['직무',     'job',          'text'],
    ['근무지',   'workLocation', 'text'],
    ['입사일',   'joinDate',     'date'],
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="card w-full max-w-lg p-5 my-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">직원 정보 수정</h3>
            <p className="text-xs text-slate-400 mt-0.5">{emp.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {fields.map(([label, key, type]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
              <input
                className="input"
                type={type}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">성별</label>
            <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">선택</option>
              <option value="M">남성</option>
              <option value="F">여성</option>
            </select>
          </div>
        </div>

        {errMsg && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <AlertCircle size={13} />{errMsg}
          </div>
        )}

        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary flex-1">취소</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? <><Loader2 size={14} className="animate-spin" />저장중...</> : <><Check size={14} />저장</>}
          </button>
        </div>
      </div>
    </div>
  )
}
