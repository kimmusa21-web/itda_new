'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  User, Mail, Phone, CalendarDays, Users2, Briefcase,
  Award, Shield, Wrench, MapPin, KeyRound, LogOut,
  Pencil, X, Check, Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { updateStaffProfile, changePassword } from '@/lib/actions/staff-profile-actions'
import type { StaffProfileInput } from '@/lib/actions/staff-profile-actions'

export interface StaffProfileProps {
  name:         string
  email:        string
  role:         'admin' | 'manager'
  phone:        string
  birthdate:    string
  gender:       string
  department:   string
  position:     string
  grade:        string
  roleTitle:    string
  job:          string
  workLocation: string
  companyName:  string
}

const ROLE_LABEL = { admin: '시스템 관리자', manager: '기업담당자' }
const ROLE_COLOR = { admin: 'bg-indigo-100 text-indigo-700', manager: 'bg-emerald-100 text-emerald-700' }
const GENDER_OPTIONS = [{ value: '', label: '선택 안 함' }, { value: 'M', label: '남성' }, { value: 'F', label: '여성' }]

export function StaffProfileClient(props: StaffProfileProps) {
  const router   = useRouter()
  const supabase = createClient()

  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState<{ ok: boolean; text: string } | null>(null)

  const [form, setForm] = useState<StaffProfileInput>({
    name:         props.name,
    phone:        props.phone,
    birthdate:    props.birthdate,
    gender:       props.gender,
    department:   props.department,
    position:     props.position,
    grade:        props.grade,
    roleTitle:    props.roleTitle,
    job:          props.job,
    workLocation: props.workLocation,
  })

  // 비밀번호 변경
  const [pwMode,    setPwMode]    = useState(false)
  const [newPw,     setNewPw]     = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving,  setPwSaving]  = useState(false)

  const initials = props.name.length >= 2 ? props.name.slice(0, 2) : props.name || '?'

  function set(key: keyof StaffProfileInput, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function cancelEdit() {
    setForm({
      name: props.name, phone: props.phone, birthdate: props.birthdate,
      gender: props.gender, department: props.department, position: props.position,
      grade: props.grade, roleTitle: props.roleTitle, job: props.job,
      workLocation: props.workLocation,
    })
    setEditing(false)
    setMsg(null)
  }

  async function handleSave() {
    if (!form.name.trim()) { setMsg({ ok: false, text: '이름은 필수 입력입니다' }); return }
    setSaving(true)
    setMsg(null)
    const result = await updateStaffProfile(form)
    setSaving(false)
    if (result.success) {
      setMsg({ ok: true, text: '저장되었습니다' })
      setEditing(false)
      router.refresh()
    } else {
      setMsg({ ok: false, text: result.error })
    }
  }

  async function handlePwChange() {
    if (newPw.length < 8) { setMsg({ ok: false, text: '비밀번호는 8자 이상이어야 합니다' }); return }
    if (newPw !== confirmPw) { setMsg({ ok: false, text: '비밀번호가 일치하지 않습니다' }); return }
    setPwSaving(true)
    setMsg(null)
    const result = await changePassword(newPw)
    setPwSaving(false)
    if (result.success) {
      setMsg({ ok: true, text: '비밀번호가 변경되었습니다' })
      setPwMode(false)
      setNewPw('')
      setConfirmPw('')
    } else {
      setMsg({ ok: false, text: result.error })
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">내 정보</h1>
          <p className="text-sm text-slate-500 mt-0.5">개인 정보를 확인하고 수정할 수 있습니다</p>
        </div>
        {!editing ? (
          <button
            onClick={() => { setEditing(true); setMsg(null) }}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Pencil size={14} />수정
          </button>
        ) : (
          <button onClick={cancelEdit} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <X size={14} />취소
          </button>
        )}
      </div>

      {/* 아바타 */}
      <div className="card p-5 flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white">
          {initials}
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900">{props.name}</p>
          <p className="text-sm text-slate-500 mt-0.5">{props.email}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${ROLE_COLOR[props.role]}`}>
          {ROLE_LABEL[props.role]}
        </span>
        {props.companyName && (
          <p className="text-xs text-slate-400">{props.companyName}</p>
        )}
      </div>

      {/* 알림 메시지 */}
      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
          msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                 : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {msg.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      {/* 기본 정보 */}
      <div className="card divide-y divide-slate-100">
        <Section title="기본 정보">
          <Field icon={User} label="이름">
            {editing
              ? <Input value={form.name} onChange={v => set('name', v)} placeholder="이름" />
              : <Value>{props.name || '-'}</Value>}
          </Field>
          <Field icon={Mail} label="이메일">
            <Value className="text-slate-400">{props.email || '-'}</Value>
          </Field>
          <Field icon={Phone} label="전화번호">
            {editing
              ? <Input value={form.phone} onChange={v => set('phone', v)} placeholder="전화번호" type="tel" />
              : <Value>{props.phone || '-'}</Value>}
          </Field>
          <Field icon={CalendarDays} label="생년월일">
            {editing
              ? <Input value={form.birthdate} onChange={v => set('birthdate', v)} type="date" />
              : <Value>{props.birthdate || '-'}</Value>}
          </Field>
          <Field icon={Users2} label="성별">
            {editing ? (
              <select
                value={form.gender}
                onChange={e => set('gender', e.target.value)}
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <Value>{props.gender === 'M' || props.gender === '남' ? '남성' : props.gender === 'F' || props.gender === '여' ? '여성' : '-'}</Value>
            )}
          </Field>
        </Section>

        {/* 직무 정보 */}
        <Section title="직무 정보">
          <Field icon={Briefcase} label="부서">
            {editing
              ? <Input value={form.department} onChange={v => set('department', v)} placeholder="부서" />
              : <Value>{props.department || '-'}</Value>}
          </Field>
          <Field icon={Award} label="직위">
            {editing
              ? <Input value={form.position} onChange={v => set('position', v)} placeholder="직위" />
              : <Value>{props.position || '-'}</Value>}
          </Field>
          <Field icon={Shield} label="직급">
            {editing
              ? <Input value={form.grade} onChange={v => set('grade', v)} placeholder="직급" />
              : <Value>{props.grade || '-'}</Value>}
          </Field>
          <Field icon={User} label="직책">
            {editing
              ? <Input value={form.roleTitle} onChange={v => set('roleTitle', v)} placeholder="직책" />
              : <Value>{props.roleTitle || '-'}</Value>}
          </Field>
          <Field icon={Wrench} label="직무">
            {editing
              ? <Input value={form.job} onChange={v => set('job', v)} placeholder="직무" />
              : <Value>{props.job || '-'}</Value>}
          </Field>
          <Field icon={MapPin} label="근무지">
            {editing
              ? <Input value={form.workLocation} onChange={v => set('workLocation', v)} placeholder="근무지" />
              : <Value>{props.workLocation || '-'}</Value>}
          </Field>
        </Section>
      </div>

      {/* 저장 버튼 */}
      {editing && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          저장
        </button>
      )}

      {/* 비밀번호 변경 */}
      {!editing && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <KeyRound size={15} className="text-slate-400" />
              비밀번호 변경
            </div>
            {!pwMode ? (
              <button
                onClick={() => { setPwMode(true); setMsg(null) }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                변경
              </button>
            ) : (
              <button
                onClick={() => { setPwMode(false); setNewPw(''); setConfirmPw(''); setMsg(null) }}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                취소
              </button>
            )}
          </div>
          {pwMode && (
            <div className="space-y-2 pt-1">
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="새 비밀번호 (8자 이상)"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="새 비밀번호 확인"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={handlePwChange}
                disabled={pwSaving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 disabled:opacity-60 transition-colors"
              >
                {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                비밀번호 변경
              </button>
            </div>
          )}
        </div>
      )}

      {/* 로그아웃 */}
      {!editing && (
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-red-100 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-all"
        >
          <LogOut size={17} />
          로그아웃
        </button>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={15} className="text-slate-400 flex-shrink-0" />
      <span className="text-sm text-slate-500 w-16 flex-shrink-0">{label}</span>
      {children}
    </div>
  )
}

function Value({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-sm font-medium text-slate-800 flex-1 ${className ?? ''}`}>{children}</span>
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
  )
}
