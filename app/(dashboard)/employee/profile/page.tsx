'use client'

import { Building2, CalendarDays, Briefcase, UserCircle2, Mail, Phone, KeyRound, LogOut } from 'lucide-react'
import { mockUsers } from '@/lib/mock-data'
import { formatDateShort } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function EmployeeProfilePage() {
  const user = mockUsers.employee
  const router = useRouter()
  const supabase = createClient()

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

      {/* Avatar & name */}
      <div className="card p-5 flex flex-col items-center gap-3">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold text-white"
          style={{ backgroundColor: user.avatarBg }}
        >
          {user.avatarInitials}
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900">{user.name}</p>
          <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-blue">{user.position}</span>
          <span className="badge badge-gray">{user.department}</span>
        </div>
      </div>

      {/* Info rows */}
      <div className="card divide-y divide-slate-100">
        <InfoSection title="소속 정보">
          <InfoRow icon={Building2} label="소속 회사" value={user.company ?? '-'} />
          <InfoRow icon={Briefcase}  label="부서"       value={user.department ?? '-'} />
          <InfoRow icon={UserCircle2} label="직위"      value={user.position ?? '-'} />
          <InfoRow icon={CalendarDays} label="입사일"   value={formatDateShort(user.joinDate)} />
        </InfoSection>
        <InfoSection title="연락처">
          <InfoRow icon={Mail}  label="이메일" value={user.email} />
          <InfoRow icon={Phone} label="전화번호" value="등록된 번호가 없습니다" muted />
        </InfoSection>
      </div>

      {/* Actions */}
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

function InfoRow({
  icon: Icon, label, value, muted,
}: {
  icon: React.ElementType; label: string; value: string; muted?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={16} className="text-slate-400 flex-shrink-0" />
      <span className="text-sm text-slate-500 w-20 flex-shrink-0">{label}</span>
      <span className={`text-sm font-medium flex-1 ${muted ? 'text-slate-400' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  )
}
