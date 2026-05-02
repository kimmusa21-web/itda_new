'use client'

import { useState, useTransition } from 'react'
import { Check, X, Building2, Users, UserMinus, Bell, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import AdminNotificationsPanel from '@/components/admin/notifications-panel'
import type { Notification } from '@/types'

type RequestStatus = 'pending' | 'approved' | 'rejected'

interface CompanyRequest {
  id: number
  created_at: string
  company_name: string | null
  biz_number: string | null
  representative: string | null
  business_type: string | null
  industry: string | null
  telephone: string | null
  address: string | null
  admin_name: string | null
  admin_email: string | null
  admin_phone: string | null
  biz_doc_url: string | null
  status: RequestStatus
  reviewed_at: string | null
  reject_reason: string | null
}

interface Props {
  companyRequests:        CompanyRequest[]
  employeeNotifications:  Notification[]
  resignationNotifications: Notification[]
  otherNotifications:     Notification[]
}

type Tab = 'company' | 'employee' | 'resignation'

/* ── 행 컴포넌트 ─────────────────────────────────────────── */
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-1.5">
      <span className="w-20 flex-shrink-0 text-xs text-slate-400">{label}</span>
      <span className="text-xs text-slate-700">{value}</span>
    </div>
  )
}

/* ── 기업 가입신청 아이템 ─────────────────────────────────── */
function CompanyRequestItem({ req, onStatusChange }: {
  req: CompanyRequest
  onStatusChange: (id: number, status: RequestStatus) => void
}) {
  const [expanded,  setExpanded]  = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason,    setReason]    = useState('')
  const [loading,   setLoading]   = useState(false)

  async function handle(action: 'approved' | 'rejected') {
    setLoading(true)
    const res = await fetch('/api/approve-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: req.id,
        action,
        rejectReason: reason || undefined,
      }),
    })
    setLoading(false)
    if (res.ok) {
      onStatusChange(req.id, action)
      setExpanded(false)
      setRejecting(false)
    }
  }

  const statusColor =
    req.status === 'pending'  ? 'bg-amber-500'  :
    req.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-400'

  const statusLabel =
    req.status === 'pending'  ? '대기' :
    req.status === 'approved' ? '승인' : '거절'

  return (
    <div className="card overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-900">
              {req.company_name ?? '(회사명 없음)'}
            </span>
            <span className={cn(
              'badge text-[10px]',
              req.status === 'pending'  ? 'badge-yellow' :
              req.status === 'approved' ? 'badge-green'  : 'badge-gray',
            )}>
              {statusLabel}
            </span>
            {req.biz_doc_url && (
              <span className="badge badge-blue text-[10px]">서류 첨부</span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {req.admin_name} · {req.admin_email} · {new Date(req.created_at).toLocaleDateString('ko-KR')}
          </p>
        </div>
        {expanded ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoRow label="사업자번호" value={req.biz_number} />
            <InfoRow label="대표자"     value={req.representative} />
            <InfoRow label="업태"       value={req.business_type} />
            <InfoRow label="종목"       value={req.industry} />
            <InfoRow label="전화번호"   value={req.telephone} />
            <InfoRow label="주소"       value={req.address} />
            <InfoRow label="담당자"     value={req.admin_name} />
            <InfoRow label="담당자 이메일" value={req.admin_email} />
            <InfoRow label="담당자 연락처" value={req.admin_phone} />
          </div>

          {req.biz_doc_url && (
            <a
              href={req.biz_doc_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
            >
              <FileText size={12} />
              사업자등록증 보기
            </a>
          )}

          {req.status === 'pending' && (
            rejecting ? (
              <div className="space-y-2">
                <textarea
                  className="input text-xs resize-none min-h-[60px]"
                  placeholder="거절 사유를 입력하세요 (선택)"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    disabled={loading}
                    onClick={() => handle('rejected')}
                    className="flex-1 py-2 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    거절 확정
                  </button>
                  <button
                    onClick={() => setRejecting(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-xs text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  disabled={loading}
                  onClick={() => handle('approved')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  <Check size={14} /> 승인
                </button>
                <button
                  disabled={loading}
                  onClick={() => setRejecting(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
                >
                  <X size={14} /> 거절
                </button>
              </div>
            )
          )}

          {req.status === 'rejected' && req.reject_reason && (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
              거절 사유: {req.reject_reason}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ── 알림 기반 탭 (직원등록 / 탈퇴요청) ────────────────── */
function NotificationList({ notifications, emptyText }: {
  notifications: Notification[]
  emptyText: string
}) {
  if (notifications.length === 0) {
    return (
      <div className="card p-10 text-center text-slate-400 text-sm">{emptyText}</div>
    )
  }
  return (
    <div className="space-y-2">
      <AdminNotificationsPanel notifications={notifications} />
    </div>
  )
}

/* ── 메인 클라이언트 ─────────────────────────────────────── */
export default function AdminRequestsClient({
  companyRequests,
  employeeNotifications,
  resignationNotifications,
  otherNotifications,
}: Props) {
  const [tab, setTab] = useState<Tab>('company')
  const [requests, setRequests] = useState(companyRequests)
  const [, startTransition] = useTransition()

  function handleStatusChange(id: number, status: RequestStatus) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  const tabs: { key: Tab; label: string; icon: typeof Building2; count?: number }[] = [
    {
      key: 'company',
      label: '기업 가입신청',
      icon: Building2,
      count: requests.filter(r => r.status === 'pending').length,
    },
    {
      key: 'employee',
      label: '새 직원 등록',
      icon: Users,
      count: employeeNotifications.filter(n => !n.is_read).length || undefined,
    },
    {
      key: 'resignation',
      label: '탈퇴 요청',
      icon: UserMinus,
      count: resignationNotifications.filter(n => !n.is_read).length || undefined,
    },
  ]

  const pendingRequests  = requests.filter(r => r.status === 'pending')
  const resolvedRequests = requests.filter(r => r.status !== 'pending')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">기업신청</h1>
        <p className="text-sm text-slate-500 mt-0.5">기업 가입, 직원 등록, 탈퇴 요청을 처리하세요</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0',
              tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <Icon size={13} />
            {label}
            {count != null && count > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 기업 가입신청 탭 */}
      {tab === 'company' && (
        <div className="space-y-4">
          {pendingRequests.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">대기 중 ({pendingRequests.length})</p>
              {pendingRequests.map(req => (
                <CompanyRequestItem key={req.id} req={req} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}

          {resolvedRequests.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">처리 완료 ({resolvedRequests.length})</p>
              {resolvedRequests.map(req => (
                <CompanyRequestItem key={req.id} req={req} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}

          {requests.length === 0 && (
            <div className="card p-10 text-center text-slate-400 text-sm">기업 가입 신청이 없습니다</div>
          )}
        </div>
      )}

      {/* 새 직원 등록 탭 */}
      {tab === 'employee' && (
        <NotificationList
          notifications={employeeNotifications}
          emptyText="새 직원 등록 알림이 없습니다"
        />
      )}

      {/* 탈퇴 요청 탭 */}
      {tab === 'resignation' && (
        <NotificationList
          notifications={resignationNotifications}
          emptyText="탈퇴 요청이 없습니다"
        />
      )}

      {/* 기타 알림 */}
      {otherNotifications.length > 0 && (
        <section className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={13} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-600">기타 알림</h2>
          </div>
          <AdminNotificationsPanel notifications={otherNotifications} />
        </section>
      )}
    </div>
  )
}
