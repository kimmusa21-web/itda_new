'use client'

import { useState, useTransition } from 'react'
import { Check, X, Building2, Users, UserMinus, Bell, ChevronDown, ChevronUp, FileText, ExternalLink, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import AdminNotificationsPanel from '@/components/admin/notifications-panel'
import { approveWithdrawal, rejectWithdrawal } from '@/lib/actions/company-withdrawal-actions'
import type { Notification } from '@/types'
import type { EmployeeRow } from '@/lib/supabase/queries/employee'

type RequestStatus = 'pending' | 'approved' | 'rejected'

const FEATURE_LABELS: Record<string, string> = {
  attendance: '근태',
  payroll:    '급여',
  leave:      '연차',
  documents:  '서류',
}

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
  requested_features: Record<string, boolean> | null
  status: RequestStatus
  reviewed_at: string | null
  reject_reason: string | null
}

export interface WithdrawalRequest {
  id:              number
  status:          RequestStatus
  note:            string | null
  data_downloaded: boolean
  created_at:      string
  reviewed_at:     string | null
  companies:       { id: number; name: string; biz_number: string | null; representative: string | null } | null
  profiles:        { name: string | null; email: string } | null
}

interface Props {
  companyRequests:       CompanyRequest[]
  employeeNotifications: Notification[]
  resignedEmployees:     EmployeeRow[]
  withdrawalRequests:    WithdrawalRequest[]
  otherNotifications:    Notification[]
  hideTitle?:            boolean
}

type Tab = 'company' | 'employee' | 'resignation' | 'withdrawal'

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

          {/* 신청 기능 */}
          {req.requested_features && Object.keys(req.requested_features).length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">신청 기능</span>
              {Object.entries(req.requested_features)
                .filter(([, v]) => v)
                .map(([k]) => (
                  <span key={k} className="badge badge-blue text-[10px]">
                    {FEATURE_LABELS[k] ?? k}
                  </span>
                ))}
            </div>
          )}

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

/* ── 탈퇴신청 아이템 ─────────────────────────────────────── */
function WithdrawalRequestItem({
  req,
  onStatusChange,
}: {
  req: WithdrawalRequest
  onStatusChange: (id: number, status: RequestStatus) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [loading,  setLoading]  = useState(false)

  async function handle(action: 'approved' | 'rejected') {
    setLoading(true)
    const result = action === 'approved'
      ? await approveWithdrawal(req.id)
      : await rejectWithdrawal(req.id)
    setLoading(false)
    if (result.success) {
      onStatusChange(req.id, action)
      setExpanded(false)
    } else {
      alert('오류: ' + result.error)
    }
  }

  const statusColor =
    req.status === 'pending'  ? 'bg-amber-500' :
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
              {req.companies?.name ?? '(회사명 없음)'}
            </span>
            <span className={cn(
              'badge text-[10px]',
              req.status === 'pending'  ? 'badge-yellow' :
              req.status === 'approved' ? 'badge-green'  : 'badge-gray',
            )}>
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {req.profiles?.name} · {req.profiles?.email} · {new Date(req.created_at).toLocaleDateString('ko-KR')}
          </p>
        </div>
        {expanded
          ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" />
          : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoRow label="사업자번호" value={req.companies?.biz_number} />
            <InfoRow label="대표자"     value={req.companies?.representative} />
            <InfoRow label="담당자"     value={req.profiles?.name} />
            <InfoRow label="이메일"     value={req.profiles?.email} />
            <InfoRow label="탈퇴 사유"  value={req.note} />
            <InfoRow
              label="자료 다운로드"
              value={req.data_downloaded ? '완료' : '미완료'}
            />
          </div>

          {req.status === 'pending' && (
            <div className="flex gap-2">
              <button
                disabled={loading}
                onClick={() => handle('approved')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                <Check size={14} /> 승인 (탈퇴 처리)
              </button>
              <button
                disabled={loading}
                onClick={() => handle('rejected')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <X size={14} /> 거절
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── 알림 기반 탭 (직원등록) ────────────────────────────── */
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

/* ── 퇴사자 행 컴포넌트 ─────────────────────────────────── */
function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-1.5 border-b border-slate-50 last:border-0">
      <span className="w-24 flex-shrink-0 text-xs text-slate-400">{label}</span>
      <span className="text-xs text-slate-700 font-medium">{value}</span>
    </div>
  )
}

function salaryLabel(type?: string | null) {
  if (type === 'annual')  return '연봉제'
  if (type === 'monthly') return '월급제'
  if (type === 'hourly')  return '시급제'
  return type ?? null
}

function ResignedEmployeeDetail({
  employee,
  onClose,
}: {
  employee: EmployeeRow
  onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-rose-100 text-rose-600">
              <UserMinus size={13} />
            </div>
            <span className="text-sm font-semibold text-slate-800">퇴사 정보</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">직원 정보</p>
            <Row label="소속 기업"  value={(employee.companies as any)?.name} />
            <Row label="이름"       value={employee.name} />
            <Row label="이메일"     value={employee.email} />
            <Row label="연락처"     value={employee.Tel} />
            <Row label="생년월일"   value={employee.birthdate} />
            <Row label="성별"       value={employee.Sex === 'M' ? '남' : employee.Sex === 'F' ? '여' : null} />
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">재직 / 퇴직 정보</p>
            <Row label="부서"       value={employee.department} />
            <Row label="직위"       value={employee.position} />
            <Row label="직급"       value={employee.Grade} />
            <Row label="직책"       value={employee.job} />
            <Row label="입사일"     value={employee.Date_of_joining} />
            <Row label="퇴사일"     value={employee.quit_date} />
            <Row label="퇴사사유"   value={employee.quit_reason} />
            <Row label="고용 형태"  value={employee.is_contract ? '계약직' : '정규직'} />
            <Row label="주소정근로" value={employee.weekly_work_hours ? `${employee.weekly_work_hours}시간` : null} />
          </div>
          <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
            <p className="text-[10px] font-semibold text-rose-400 mb-2 uppercase tracking-wide">실업급여</p>
            <Row label="신청 여부"      value={employee.unemployment_claim ? '신청' : '미신청'} />
            {employee.unemployment_claim && (
              <Row label="이직 사유 코드" value={employee.unemployment_code} />
            )}
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">급여 정보</p>
            <Row label="급여 유형"  value={salaryLabel(employee.salary_type)} />
            <Row label="급여 금액"  value={employee.salary_amount ? `${Number(employee.salary_amount).toLocaleString('ko-KR')}원` : null} />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100">
          <a
            href="/admin/employees/resigned"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors"
          >
            퇴사자 목록 확인
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </>
  )
}

function ResignedEmployeeList({ employees }: { employees: EmployeeRow[] }) {
  const [selected, setSelected] = useState<EmployeeRow | null>(null)

  if (employees.length === 0) {
    return <div className="card p-10 text-center text-slate-400 text-sm">퇴사 직원이 없습니다</div>
  }

  return (
    <>
      <div className="card overflow-hidden divide-y divide-slate-50">
        {employees.map(emp => (
          <button
            key={emp.id}
            onClick={() => setSelected(emp)}
            className="w-full flex gap-3 px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-rose-100 text-rose-600">
              <UserMinus size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-700 truncate">{emp.name}</p>
                <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                  {emp.quit_date ?? '-'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {(emp.companies as any)?.name ?? ''}{emp.department ? ` · ${emp.department}` : ''}{emp.position ? ` · ${emp.position}` : ''}
              </p>
              <span className="text-xs text-blue-500 mt-1 inline-block">상세 보기 →</span>
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <ResignedEmployeeDetail employee={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}

/* ── 메인 클라이언트 ─────────────────────────────────────── */
export default function AdminRequestsClient({
  companyRequests,
  employeeNotifications,
  resignedEmployees,
  withdrawalRequests,
  otherNotifications,
  hideTitle = false,
}: Props) {
  const [tab, setTab] = useState<Tab>('company')
  const [requests,    setRequests]    = useState(companyRequests)
  const [withdrawals, setWithdrawals] = useState(withdrawalRequests)
  const [, startTransition] = useTransition()

  function handleStatusChange(id: number, status: RequestStatus) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  function handleWithdrawalStatusChange(id: number, status: RequestStatus) {
    setWithdrawals(prev => prev.map(r => r.id === id ? { ...r, status } : r))
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
      label: '퇴사자',
      icon: UserMinus,
      count: resignedEmployees.length || undefined,
    },
    {
      key: 'withdrawal',
      label: '탈퇴신청',
      icon: LogOut,
      count: withdrawals.filter(r => r.status === 'pending').length || undefined,
    },
  ]

  const pendingRequests  = requests.filter(r => r.status === 'pending')
  const resolvedRequests = requests.filter(r => r.status !== 'pending')
  const pendingWithdrawals  = withdrawals.filter(r => r.status === 'pending')
  const resolvedWithdrawals = withdrawals.filter(r => r.status !== 'pending')

  return (
    <div className="space-y-5">
      {!hideTitle && (
        <div>
          <h1 className="text-xl font-semibold text-slate-900">기업신청</h1>
          <p className="text-sm text-slate-500 mt-0.5">기업 가입, 직원 등록, 탈퇴 요청을 처리하세요</p>
        </div>
      )}

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

      {/* 퇴사자 탭 */}
      {tab === 'resignation' && (
        <ResignedEmployeeList employees={resignedEmployees} />
      )}

      {/* 탈퇴신청 탭 */}
      {tab === 'withdrawal' && (
        <div className="space-y-4">
          {pendingWithdrawals.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">대기 중 ({pendingWithdrawals.length})</p>
              {pendingWithdrawals.map(req => (
                <WithdrawalRequestItem key={req.id} req={req} onStatusChange={handleWithdrawalStatusChange} />
              ))}
            </div>
          )}
          {resolvedWithdrawals.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">처리 완료 ({resolvedWithdrawals.length})</p>
              {resolvedWithdrawals.map(req => (
                <WithdrawalRequestItem key={req.id} req={req} onStatusChange={handleWithdrawalStatusChange} />
              ))}
            </div>
          )}
          {withdrawals.length === 0 && (
            <div className="card p-10 text-center text-slate-400 text-sm">탈퇴 신청이 없습니다</div>
          )}
        </div>
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
