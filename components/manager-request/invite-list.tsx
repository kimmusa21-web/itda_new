'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock, UserPlus, CalendarDays, Building2, Send, Loader2 } from 'lucide-react'
import { resendEmployeeInvite } from '@/lib/actions/employee-invite-create'
import { formatDateDot, cn } from '@/lib/utils'

interface InviteItem {
  id:         number
  name:       string
  email:      string
  department: string | null
  position:   string | null
  joinDate:   string | null
  isActive:   boolean
  hasAccount: boolean
  createdAt:  string
}

interface Props {
  companyId:   number
  initialList: InviteItem[]
}

function getStatus(item: InviteItem): 'joined' | 'pending' | 'inactive' {
  if (item.hasAccount && item.isActive) return 'joined'
  if (!item.hasAccount) return 'pending'
  return 'inactive'
}

const STATUS_CONFIG = {
  joined: {
    label: '가입 완료',
    Icon:  CheckCircle2,
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    row:   'border-l-4 border-l-emerald-400',
  },
  pending: {
    label: '초대 대기',
    Icon:  Clock,
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    row:   'border-l-4 border-l-amber-400',
  },
  inactive: {
    label: '비활성',
    Icon:  Clock,
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    row:   'border-l-4 border-l-slate-300',
  },
}

export function InviteList({ companyId, initialList }: Props) {
  const [list] = useState(initialList)
  const [resending, setResending] = useState<number | null>(null)
  const [messages, setMessages] = useState<Record<number, string>>({})
  const [, startTransition] = useTransition()

  function handleResend(employeeId: number) {
    setResending(employeeId)
    startTransition(async () => {
      const result = await resendEmployeeInvite(employeeId, companyId)
      setMessages(prev => ({
        ...prev,
        [employeeId]: result.success ? '재발송 완료' : (result.error ?? '발송 실패'),
      }))
      setResending(null)
    })
  }

  const counts = {
    total:   list.length,
    pending: list.filter(e => getStatus(e) === 'pending').length,
    joined:  list.filter(e => getStatus(e) === 'joined').length,
  }

  if (list.length === 0) {
    return (
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <UserPlus size={24} className="text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600 mb-1">초대한 직원이 없습니다</p>
        <p className="text-xs text-slate-400 mb-6">직원을 등록하면 초대 이메일이 즉시 발송됩니다</p>
        <Link href="/manager/employees/create" className="btn-primary">
          + 직원 초대하기
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { label: '전체',      value: counts.total,   cls: 'text-slate-700' },
          { label: '초대 대기', value: counts.pending,  cls: 'text-amber-600' },
          { label: '가입 완료', value: counts.joined,   cls: 'text-emerald-600' },
        ] as const).map(({ label, value, cls }) => (
          <div key={label} className="card p-4 text-center">
            <p className={cn('text-2xl font-bold', cls)}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* 목록 */}
      <div className="card overflow-hidden">
        <div className="hidden sm:grid sm:grid-cols-[1fr_1.5fr_1fr_1fr_130px_100px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>이름</span>
          <span>이메일</span>
          <span>부서 / 직위</span>
          <span>등록일</span>
          <span>상태</span>
          <span></span>
        </div>

        <div className="divide-y divide-slate-50">
          {list.map(item => {
            const status = getStatus(item)
            const cfg    = STATUS_CONFIG[status]
            const Icon   = cfg.Icon
            const msg    = messages[item.id]

            return (
              <div key={item.id} className={cn('px-4 py-4 hover:bg-slate-50/60 transition-colors', cfg.row)}>
                {/* Mobile */}
                <div className="sm:hidden space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.email}</p>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0', cfg.badge)}>
                      <Icon size={10} />{cfg.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                    {(item.department || item.position) && (
                      <span className="flex items-center gap-1">
                        <Building2 size={10} />
                        {[item.department, item.position].filter(Boolean).join(' / ')}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <CalendarDays size={10} />
                      {formatDateDot(item.createdAt.slice(0, 10))}
                    </span>
                  </div>
                  {status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResend(item.id)}
                        disabled={resending === item.id}
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        {resending === item.id
                          ? <><Loader2 size={11} className="animate-spin" />발송 중</>
                          : <><Send size={11} />초대 재발송</>}
                      </button>
                      {msg && <span className="text-xs text-emerald-600">{msg}</span>}
                    </div>
                  )}
                </div>

                {/* Desktop */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_1.5fr_1fr_1fr_130px_100px] gap-3 items-center">
                  <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-600 break-all">{item.email}</p>
                  <p className="text-sm text-slate-500">
                    {[item.department, item.position].filter(Boolean).join(' / ') || '—'}
                  </p>
                  <p className="text-sm text-slate-500">{formatDateDot(item.createdAt.slice(0, 10))}</p>
                  <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border w-fit', cfg.badge)}>
                    <Icon size={10} />{cfg.label}
                  </span>
                  <div>
                    {status === 'pending' && (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleResend(item.id)}
                          disabled={resending === item.id}
                          className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                        >
                          {resending === item.id
                            ? <><Loader2 size={10} className="animate-spin" />발송 중</>
                            : <><Send size={10} />재발송</>}
                        </button>
                        {msg && <span className="text-[11px] text-emerald-600">{msg}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
