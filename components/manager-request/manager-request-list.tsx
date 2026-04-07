'use client'
/* ================================================================
   ManagerRequestList — manager가 제출한 직원 등록 신청 목록
================================================================ */

import Link from 'next/link'
import {
  Clock, CheckCircle2, XCircle, UserPlus,
  CalendarDays, Building2, AlertCircle,
} from 'lucide-react'
import type { EmployeeRequest } from '@/types/employee-request'
import { formatDateDot, cn } from '@/lib/utils'

interface Props {
  requests: EmployeeRequest[]
}

const STATUS_CONFIG = {
  pending: {
    label: '승인 대기',
    Icon:  Clock,
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    row:   'border-l-4 border-l-amber-400',
  },
  approved: {
    label: '승인완료',
    Icon:  CheckCircle2,
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    row:   'border-l-4 border-l-emerald-400',
  },
  rejected: {
    label: '거절됨',
    Icon:  XCircle,
    badge: 'bg-red-100 text-red-700 border-red-200',
    row:   'border-l-4 border-l-red-400',
  },
}

export function ManagerRequestList({ requests }: Props) {
  /* ── 빈 상태 ── */
  if (requests.length === 0) {
    return (
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <UserPlus size={24} className="text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600 mb-1">아직 등록 신청한 직원이 없습니다</p>
        <p className="text-xs text-slate-400 mb-6">직원 정보를 입력하면 어드민 승인 후 계정이 생성됩니다</p>
        <Link href="/manager/employees/create" className="btn-primary">
          + 직원 등록 신청하기
        </Link>
      </div>
    )
  }

  /* ── 통계 카드 ── */
  const counts = {
    total:    requests.length,
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: '전체',      value: counts.total,    cls: 'text-slate-700' },
          { label: '승인 대기', value: counts.pending,  cls: 'text-amber-600' },
          { label: '승인 완료', value: counts.approved, cls: 'text-emerald-600' },
          { label: '거절됨',    value: counts.rejected, cls: 'text-red-500' },
        ] as const).map(({ label, value, cls }) => (
          <div key={label} className="card p-4 text-center">
            <p className={cn('text-2xl font-bold', cls)}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* 목록 */}
      <div className="card overflow-hidden">
        {/* 테이블 헤더 (desktop) */}
        <div className="hidden sm:grid sm:grid-cols-[1fr_1.5fr_1fr_1fr_120px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>이름</span>
          <span>이메일</span>
          <span>부서 / 직위</span>
          <span>신청일</span>
          <span>상태</span>
        </div>

        <div className="divide-y divide-slate-50">
          {requests.map(r => {
            const cfg  = STATUS_CONFIG[r.status]
            const Icon = cfg.Icon

            return (
              <div
                key={r.id}
                className={cn(
                  'px-4 py-4 hover:bg-slate-50/60 transition-colors',
                  cfg.row,
                )}
              >
                {/* Mobile layout */}
                <div className="sm:hidden space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{r.email}</p>
                    </div>
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0',
                      cfg.badge,
                    )}>
                      <Icon size={10} />{cfg.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                    {(r.department || r.position) && (
                      <span className="flex items-center gap-1">
                        <Building2 size={10} />
                        {[r.department, r.position].filter(Boolean).join(' / ')}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <CalendarDays size={10} />
                      {formatDateDot(r.createdAt.slice(0, 10))}
                    </span>
                  </div>
                  {/* 거절 사유 */}
                  {r.status === 'rejected' && r.rejectionReason && (
                    <div className="flex items-start gap-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      <AlertCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600">{r.rejectionReason}</p>
                    </div>
                  )}
                  {/* 승인 완료 안내 */}
                  {r.status === 'approved' && (
                    <p className="text-xs text-emerald-600">
                      ✓ 직원 등록 완료 — 초대 이메일이 발송되었습니다
                    </p>
                  )}
                </div>

                {/* Desktop layout */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_1.5fr_1fr_1fr_120px] gap-3 items-start">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{r.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 break-all">{r.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">
                      {[r.department, r.position].filter(Boolean).join(' / ') || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">
                      {formatDateDot(r.createdAt.slice(0, 10))}
                    </p>
                    {r.status === 'rejected' && r.rejectionReason && (
                      <p className="text-xs text-red-500 mt-1 leading-relaxed">
                        거절 사유: {r.rejectionReason}
                      </p>
                    )}
                    {r.status === 'approved' && (
                      <p className="text-xs text-emerald-600 mt-1">초대 이메일 발송됨</p>
                    )}
                  </div>
                  <div>
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border',
                      cfg.badge,
                    )}>
                      <Icon size={10} />{cfg.label}
                    </span>
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
