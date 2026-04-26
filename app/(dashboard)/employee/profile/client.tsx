'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  User, Mail, Phone, CalendarDays, Users2, Briefcase,
  Award, Shield, Wrench, MapPin, KeyRound, LogOut,
  Hash, Building2, Check, Loader2, AlertCircle, CheckCircle2, Pencil, X, MailCheck,
} from 'lucide-react'
import { updateEmployeeProfile } from '@/lib/actions/employee-profile-actions'
import { changePassword } from '@/lib/actions/staff-profile-actions'

interface Props {
  empId:          number | null
  name:           string
  email:          string
  employeeNumber: string | null
  phone:          string
  department:     string | null
  position:       string | null
  joinDate:       string | null
  birthdate:      string | null
  gender:         string | null
  grade:          string | null
  roleTitle:      string | null
  job:            string | null
  workLocation:   string | null
  company:        string
}

export function ProfileClient(props: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const [editingPhone, setEditingPhone] = useState(false)
  const [phone,        setPhone]        = useState(props.phone ?? '')
  const [saving,       setSaving]       = useState(false)
  const [msg,          setMsg]          = useState<{ ok: boolean; text: string } | null>(null)

  const [pwMode,      setPwMode]      = useState(false)
  const [newPw,       setNewPw]       = useState('')
  const [confirmPw,   setConfirmPw]   = useState('')
  const [pwSaving,    setPwSaving]    = useState(false)

  const [emailMode,   setEmailMode]   = useState(false)
  const [newEmail,    setNewEmail]    = useState('')
  const [emailSaving, setEmailSaving] = useState(false)

  const initials = props.name.length >= 2 ? props.name.slice(0, 2) : props.name || '?'

  async function handleSavePhone() {
    setSaving(true)
    setMsg(null)
    const result = await updateEmployeeProfile({ phoneNumber: phone })
    setSaving(false)
    if (result.success) {
      setMsg({ ok: true, text: '저장되었습니다' })
      setEditingPhone(false)
      router.refresh()
    } else {
      setMsg({ ok: false, text: result.error })
    }
  }

  async function handleEmailChange() {
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!newEmail.trim()) { setMsg({ ok: false, text: '새 이메일을 입력해주세요' }); return }
    if (!EMAIL_RE.test(newEmail.trim())) { setMsg({ ok: false, text: '올바른 이메일 형식이 아닙니다' }); return }
    if (newEmail.trim().toLowerCase() === props.email.toLowerCase()) {
      setMsg({ ok: false, text: '현재 이메일과 동일합니다' }); return
    }
    setEmailSaving(true)
    setMsg(null)
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    setEmailSaving(false)
    if (error) {
      setMsg({ ok: false, text: '이메일 변경 실패: ' + error.message })
    } else {
      setMsg({ ok: true, text: `${newEmail.trim()}로 확인 링크를 발송했습니다. 메일함을 확인해주세요.` })
      setEmailMode(false)
      setNewEmail('')
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

  const genderLabel = props.gender === 'M' ? '남성' : props.gender === 'F' ? '여성' : '-'

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">내 정보</h1>
        <p className="text-sm text-slate-500 mt-0.5">소속 및 개인 정보를 확인하세요</p>
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
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {props.position   && <span className="badge badge-blue">{props.position}</span>}
          {props.department && <span className="badge badge-gray">{props.department}</span>}
        </div>
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

      <div className="card divide-y divide-slate-100">
        {/* 기본 정보 */}
        <Section title="기본 정보">
          <Row icon={User}        label="이름">    <Val>{props.name    || '-'}</Val></Row>
          <Row icon={Mail}        label="이메일">  <Val>{props.email   || '-'}</Val></Row>
          <Row icon={Phone}       label="전화번호">
            {editingPhone ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="전화번호"
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button onClick={handleSavePhone} disabled={saving}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  저장
                </button>
                <button onClick={() => { setEditingPhone(false); setPhone(props.phone ?? '') }}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
                  <X size={13} />취소
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <Val>{props.phone || '-'}</Val>
                {props.empId && (
                  <button onClick={() => { setEditingPhone(true); setMsg(null) }}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                    <Pencil size={12} />수정
                  </button>
                )}
              </div>
            )}
          </Row>
          <Row icon={CalendarDays} label="생년월일"><Val>{props.birthdate  || '-'}</Val></Row>
          <Row icon={Users2}       label="성별">    <Val>{genderLabel}</Val></Row>
        </Section>

        {/* 직무 정보 */}
        <Section title="직무 정보">
          <Row icon={Building2}  label="소속 회사"><Val>{props.company    || '-'}</Val></Row>
          <Row icon={Briefcase}  label="부서">     <Val>{props.department || '-'}</Val></Row>
          <Row icon={Award}      label="직위">     <Val>{props.position   || '-'}</Val></Row>
          <Row icon={Shield}     label="직급">     <Val>{props.grade      || '-'}</Val></Row>
          <Row icon={User}       label="직책">     <Val>{props.roleTitle  || '-'}</Val></Row>
          <Row icon={Wrench}     label="직무">     <Val>{props.job        || '-'}</Val></Row>
          <Row icon={MapPin}     label="근무지">   <Val>{props.workLocation || '-'}</Val></Row>
          <Row icon={CalendarDays} label="입사일"> <Val>{props.joinDate   || '-'}</Val></Row>
          {props.employeeNumber && (
            <Row icon={Hash} label="사번"><Val mono>{props.employeeNumber}</Val></Row>
          )}
        </Section>
      </div>

      {/* 이메일 변경 */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <MailCheck size={15} className="text-slate-400" />
            이메일 변경
          </div>
          {!emailMode ? (
            <button onClick={() => { setEmailMode(true); setMsg(null) }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              변경
            </button>
          ) : (
            <button onClick={() => { setEmailMode(false); setNewEmail(''); setMsg(null) }}
              className="text-xs text-slate-500 hover:text-slate-700">
              취소
            </button>
          )}
        </div>
        {!emailMode && (
          <p className="text-xs text-slate-400">현재: {props.email}</p>
        )}
        {emailMode && (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-slate-400">현재 이메일: <span className="text-slate-600">{props.email}</span></p>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="새 이메일 주소"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p className="text-xs text-slate-400 leading-relaxed">
              새 이메일로 확인 링크가 발송됩니다. 링크 클릭 후 이메일이 변경됩니다.
            </p>
            <button
              onClick={handleEmailChange}
              disabled={emailSaving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {emailSaving ? <Loader2 size={14} className="animate-spin" /> : <MailCheck size={14} />}
              확인 링크 발송
            </button>
          </div>
        )}
      </div>

      {/* 비밀번호 변경 */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <KeyRound size={15} className="text-slate-400" />
            비밀번호 변경
          </div>
          {!pwMode ? (
            <button onClick={() => { setPwMode(true); setMsg(null) }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              변경
            </button>
          ) : (
            <button onClick={() => { setPwMode(false); setNewPw(''); setConfirmPw(''); setMsg(null) }}
              className="text-xs text-slate-500 hover:text-slate-700">
              취소
            </button>
          )}
        </div>
        {pwMode && (
          <div className="space-y-2 pt-1">
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="새 비밀번호 (8자 이상)"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              placeholder="새 비밀번호 확인"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button onClick={handlePwChange} disabled={pwSaving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 disabled:opacity-60 transition-colors">
              {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              비밀번호 변경
            </button>
          </div>
        )}
      </div>

      {/* 로그아웃 */}
      <button onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-red-100 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-all">
        <LogOut size={17} />
        로그아웃
      </button>
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

function Row({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={15} className="text-slate-400 flex-shrink-0" />
      <span className="text-sm text-slate-500 w-20 flex-shrink-0">{label}</span>
      {children}
    </div>
  )
}

function Val({ children, mono, className }: { children: React.ReactNode; mono?: boolean; className?: string }) {
  return (
    <span className={`text-sm font-medium text-slate-800 flex-1 ${mono ? 'font-mono' : ''} ${className ?? ''}`}>
      {children}
    </span>
  )
}
