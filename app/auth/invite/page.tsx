/* ================================================================
   /auth/invite — 직원 초대 링크 랜딩 페이지 (Server Component)

   플로우:
     admin 승인 → 초대 이메일 발송 → 직원이 링크 클릭
     → 이 페이지: token 검증 → 비밀번호 설정 UI
     → /api/auth/complete-invite → 가입 완료 → /login
================================================================ */

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { AlertCircle, Clock, Link2Off, KeyRound } from 'lucide-react'
import { InvitePasswordForm } from './invite-form'

interface Props {
  searchParams: { token?: string }
}

/* ── 에러 화면 ───────────────────────────────────────────────── */
function ErrorScreen({
  icon,
  title,
  message,
}: {
  icon: 'invalid' | 'expired' | 'used'
  title: string
  message: string
}) {
  const Icon = icon === 'expired' ? Clock : Link2Off
  const iconBg = icon === 'expired' ? 'bg-amber-100' : 'bg-red-100'
  const iconColor = icon === 'expired' ? 'text-amber-600' : 'text-red-500'

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <KeyRound size={16} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white">itda</span>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xl">
        <div className={`w-16 h-16 ${iconBg} rounded-full flex items-center justify-center mx-auto mb-5`}>
          <Icon size={28} className={iconColor} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">{message}</p>
        <div className="flex flex-col gap-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full bg-blue-600 text-white text-sm font-semibold px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            로그인 페이지로
          </Link>
          <p className="text-xs text-slate-400 mt-1">
            문제가 지속되면 담당 어드민에게 재발송을 요청하세요.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── 메인 ────────────────────────────────────────────────────── */
export default async function InvitePage({ searchParams }: Props) {
  const token = searchParams.token?.trim()

  /* 토큰 누락 */
  if (!token) {
    return (
      <ErrorScreen
        icon="invalid"
        title="잘못된 초대 링크"
        message="초대 링크가 올바르지 않습니다. 이메일에서 링크를 다시 확인해주세요."
      />
    )
  }

  /* service_role로 DB 조회 (비인증 페이지이므로) */
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: invite, error: dbError } = await supabaseAdmin
    .from('employee_invites')
    .select('id, email, name, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (dbError) {
    console.error('[InvitePage] DB 조회 오류:', dbError.message)
    return (
      <ErrorScreen
        icon="invalid"
        title="서버 오류"
        message="링크를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      />
    )
  }

  /* 존재하지 않는 토큰 */
  if (!invite) {
    return (
      <ErrorScreen
        icon="invalid"
        title="유효하지 않은 링크"
        message="초대 링크를 찾을 수 없습니다. 이메일에서 링크를 다시 확인해주세요."
      />
    )
  }

  /* 이미 사용된 토큰 */
  if (invite.used_at) {
    return (
      <ErrorScreen
        icon="used"
        title="이미 사용된 링크"
        message="이 초대 링크는 이미 사용되었습니다. 기존 계정으로 로그인하거나 담당자에게 문의하세요."
      />
    )
  }

  /* 만료된 토큰 */
  if (new Date(invite.expires_at) < new Date()) {
    return (
      <ErrorScreen
        icon="expired"
        title="만료된 초대 링크"
        message="초대 링크가 만료되었습니다 (유효기간 24시간). 담당 어드민에게 재발송을 요청하세요."
      />
    )
  }

  /* 검증 통과 → 비밀번호 설정 폼 */
  return (
    <InvitePasswordForm
      token={token}
      email={invite.email}
      name={invite.name || invite.email}
    />
  )
}
