'use client'
/* ================================================================
   RequestDetailPanel — 상세 + DB 저장 확인 (최종본)
   승인 버튼: employees 생성 포함 안내 추가
================================================================ */

import { useState } from 'react'
import {
  ChevronLeft, CheckCircle2, XCircle, Clock,
  User, Building2, CalendarDays, Banknote,
  Mail, Loader2, DatabaseZap, UserPlus,
} from 'lucide-react'
import type { EmployeeRequest } from '@/types/employee-request'
import { formatKRW, formatDateDot, cn } from '@/lib/utils'
import { RejectDialog } from './reject-dialog'

interface Props {
  request: EmployeeRequest
  onBack?: () => void
  onApprove: (id: string) => Promise<void>
  onReject:  (id: string, reason: string) => Promise<void>
}

const STATUS_UI = {
  pending:  { label: '대기',    Icon: Clock,        cls: 'bg-amber-100 text-amber-800 border-amber-200'    },
  approved: { label: '승인완료', Icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  rejected: { label: '거절',    Icon: XCircle,      cls: 'bg-red-100 text-red-700 border-red-200'           },
}

export function RequestDetailPanel({ request: r, onBack, onApprove, onReject }: Props) {
  const [approving,   setApproving]   = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [rejectOpen,  setRejectOpen]  = useState(false)
  const [showDbInfo,  setShowDbInfo]  = useState(false)

  const sui  = STATUS_UI[r.status]
  const Icon = sui.Icon

  async function handleApprove() {
    setApproving(true)
    setConfirmOpen(false)
    await onApprove(r.id)
    setApproving(false)
  }

  async function handleReject(reason: string) {
    await onReject(r.id, reason)
    setRejectOpen(false)
  }

  return (
    <>
      <div className="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 7rem)' }}>

        {/* 헤더 */}
        <div className="flex-shrink-0 px-5 pt-4 pb-4 border-b border-slate-100 bg-slate-50/50">
          {onBack && (
            <button onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-3 lg:hidden -ml-1">
              <ChevronLeft size={15} />목록으로
            </button>
          )}
          <div className="flex items-start gap-3">
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0',
              r.status === 'pending'  ? 'bg-amber-100 text-amber-800' :
              r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
            )}>
              {r.name.slice(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">{r.name}</h2>
                <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border', sui.cls)}>
                  <Icon size={11} />{sui.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Mail size={11} className="text-slate-400 flex-shrink-0" />
                <p className="text-xs text-slate-500 truncate">{r.email}</p>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{r.companyName}</p>
            </div>
          </div>
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* 거절 사유 */}
          {r.status === 'rejected' && r.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-red-700 mb-1">거절 사유</p>
              <p className="text-sm text-red-600">{r.rejectionReason}</p>
              <p className="text-xs text-red-400 mt-1">employees 테이블에 직원 정보가 생성되지 않았습니다</p>
            </div>
          )}

          {/* 승인 완료 */}
          {r.status === 'approved' && (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <UserPlus size={15} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-700">승인 완료 — 직원 등록됨</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  employees 테이블에 직원 정보가 생성되었습니다.<br />
                  초대 이메일 발송 후 직원이 비밀번호를 설정하면 계정이 활성화됩니다.
                </p>
              </div>
            </div>
          )}

          {/* 정보 섹션 */}
          <InfoSection icon={<User size={14} className="text-blue-500" />} title="기본 정보">
            <InfoGrid rows={[
              ['이름', r.name], ['이메일', r.email],
              ['생년월일', r.birthDate || '-'], ['성별', r.gender === 'male' ? '남성' : '여성'],
              ['연락처', r.phone || '-'],
            ]} />
          </InfoSection>

          <InfoSection icon={<Building2 size={14} className="text-blue-500" />} title="조직 정보">
            <InfoGrid rows={[
              ['부서', r.department || '-'], ['직위', r.position || '-'],
              ['직무', r.jobTitle || '-'], ['직급', r.jobLevel || '-'],
              ['근무지', r.workLocation || '-'],
            ]} />
            {r.jobDescription && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">업무 상세</p>
                <p className="text-sm text-slate-700 leading-relaxed">{r.jobDescription}</p>
              </div>
            )}
          </InfoSection>

          <InfoSection icon={<Banknote size={14} className="text-blue-500" />} title="근무 · 급여 정보">
            <InfoGrid rows={[
              ['입사일', r.joinDate ? formatDateDot(r.joinDate) : '-'],
              ['급여유형', r.salaryType === 'annual' ? '연봉' : '월급'],
              ['기준', r.salaryBasis === 'gross' ? '세전' : '세후'],
              ['금액', r.salaryAmount ? formatKRW(r.salaryAmount) : '-'],
            ]} />
          </InfoSection>

          <InfoSection icon={<CalendarDays size={14} className="text-blue-500" />} title="신청 정보">
            <InfoGrid rows={[
              ['회사명', r.companyName], ['신청자', r.requestedByName],
              ['신청일', formatDateDot(r.createdAt.slice(0, 10))],
              ['검토일', r.reviewedAt ? formatDateDot(r.reviewedAt.slice(0, 10)) : '-'],
            ]} />
          </InfoSection>

          {/* DB 저장 확인 (승인/거절 후) */}
          {(r.status === 'approved' || r.status === 'rejected') && (
            <div className="rounded-xl border border-dashed border-slate-300 overflow-hidden">
              <button onClick={() => setShowDbInfo(!showDbInfo)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
                <div className="flex items-center gap-2">
                  <DatabaseZap size={13} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600">DB 저장 확인</span>
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded',
                    r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                    {r.status}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">{showDbInfo ? '닫기' : '확인'}</span>
              </button>
              {showDbInfo && (
                <div className="px-4 py-3 bg-slate-900 text-[11px] font-mono space-y-1.5">
                  <DbRow label="employee_requests.status"      value={r.status}                   highlight={r.status === 'approved' ? 'green' : 'red'} />
                  <DbRow label="employee_requests.reviewed_by" value={r.reviewedBy ?? 'null'}     />
                  <DbRow label="employee_requests.reviewed_at" value={r.reviewedAt ? new Date(r.reviewedAt).toLocaleString('ko-KR') : 'null'} />
                  <DbRow label="employee_requests.reject_reason" value={r.rejectionReason ?? 'null'} />
                  {r.status === 'approved' && (
                    <DbRow label="employees (신규 row)"
                      value="✅ 생성됨 — Supabase Table Editor에서 확인"
                      highlight="green"
                    />
                  )}
                  {r.status === 'rejected' && (
                    <DbRow label="employees (신규 row)"
                      value="❌ 생성 안 됨 (거절)"
                      highlight="red"
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 액션 영역 */}
        {r.status === 'pending' && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100 bg-white space-y-2.5">
            {confirmOpen ? (
              <div className="space-y-2.5">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-800">
                  <p className="font-semibold mb-1 flex items-center gap-1.5">
                    <UserPlus size={13} /><span>{r.name}</span>의 가입신청을 승인하시겠습니까?
                  </p>
                  <p className="text-emerald-700 opacity-80">
                    승인 즉시 employees 테이블에 직원 정보가 생성됩니다.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    취소
                  </button>
                  <button onClick={handleApprove} disabled={approving}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 active:scale-95 transition-all">
                    {approving
                      ? <><Loader2 size={15} className="animate-spin" />처리 중...</>
                      : <><UserPlus size={15} />승인 + 직원 생성</>
                    }
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setRejectOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 hover:bg-red-100 active:scale-95 transition-all">
                  <XCircle size={16} />거절
                </button>
                <button onClick={() => setConfirmOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-95 transition-all">
                  <UserPlus size={16} />승인 + 직원 생성
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {rejectOpen && (
        <RejectDialog
          employeeName={r.name}
          onCancel={() => setRejectOpen(false)}
          onConfirm={handleReject}
        />
      )}
    </>
  )
}

/* ── 서브컴포넌트 ──────────────────────────────────────── */
function InfoSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100">
        {icon}
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

function InfoGrid({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-0">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col py-2 pr-2 border-b border-slate-50 last:border-0">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
          <p className="text-sm font-medium text-slate-800 break-all">{value}</p>
        </div>
      ))}
    </div>
  )
}

function DbRow({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'red' }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-slate-500 w-44 flex-shrink-0 leading-relaxed">{label}:</span>
      <span className={cn('break-all leading-relaxed',
        highlight === 'green' ? 'text-emerald-400 font-bold' :
        highlight === 'red'   ? 'text-red-400 font-bold' :
        value === 'null' ? 'text-slate-600 italic' : 'text-slate-200',
      )}>
        {value}
      </span>
    </div>
  )
}
