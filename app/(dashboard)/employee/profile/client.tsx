'use client'

import { Building2, CalendarDays, Briefcase, UserCircle2, Mail, KeyRound, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDateShort } from '@/lib/utils'

interface Props {
  name:       string
  email:      string
  department: string | null
  position:   string | null
  joinDate:   string | null
  company:    string
}

export function ProfileClient({ name, email, department, position, joinDate, company }: Props) {
  const router  = useRouter()
  const supabase = createClient()

  const initials = name.length >= 2 ? name.slice(0, 2) : name || '?'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">내 정보</h1>
        <p className="text-sm text-slate-500 mt-0.5">소속 및 개인 정보를 확인하세요</p>
      </div>

      {/* 아바타 + 이름 */}
      <div className="card p-5 flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white">
          {initials}
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900">{name}</p>
          <p className="text-sm text-slate-500 mt-0.5">{email}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {position   && <span className="badge badge-blue">{position}</span>}
          {department && <span className="badge badge-gray">{department}</span>}
        </div>
      </div>

      {/* 정보 행 */}
      <div className="card divide-y divide-slate-100">
        <InfoSection title="소속 정보">
          <InfoRow icon={Building2}    label="소속 회사" value={company    || '-'} />
          <InfoRow icon={Briefcase}    label="부서"       value={department || '-'} />
          <InfoRow icon={UserCircle2}  label="직위"       value={position   || '-'} />
          <InfoRow icon={CalendarDays} label="입사일"     value={joinDate ? formatDateShort(joinDate) : '-'} />
        </InfoSection>
        <InfoSection title="연락처">
          <InfoRow icon={Mail} label="이메일" value={email} />
        </InfoSection>
      </div>

      {/* 액션 버튼 */}
      <div className="space-y-2.5">
        <button
          onClick={() => alert('이메일로 비밀번호 재설정 링크가 발송됩니다')}
          className="btn-secondary w-full justify-start gap-3 py-3.5 rounded-xl"
        >
          <KeyRound size={17} className="text-slate-500" />
          비밀번호 변경
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-red-100 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 active:scale-[0.99] transition-all"
        >
          <LogOut size={17} />
          로그아웃
        </button>
      </div>
    </div>
  )
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={16} className="text-slate-400 flex-shrink-0" />
      <span className="text-sm text-slate-500 w-20 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 flex-1">{value}</span>
    </div>
  )
}
