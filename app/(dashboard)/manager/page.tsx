'use client'

import { Plus, BarChart3, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import EmployeeCard from '@/components/common/employee-card'
import NoticeCard from '@/components/common/notice-card'
import EmptyState from '@/components/common/empty-state'
import { mockEmployees, notices, payslips, mockUsers } from '@/lib/mock-data'
import { formatMonth, formatKRW } from '@/lib/utils'
import { Users } from 'lucide-react'

export default function ManagerDashboard() {
  const user = mockUsers.manager
  const companyEmployees = mockEmployees.filter(
    e => e.company === user.company && e.status === 'active',
  )
  const latestPayslip = payslips[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 font-medium">{user.company}</p>
          <h1 className="text-xl font-semibold text-slate-900 mt-0.5">직원 관리</h1>
        </div>
        <button className="btn-primary flex-shrink-0">
          <Plus size={16} />
          직원 등록 요청
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card rounded-xl">
          <p className="stat-label">재직 직원</p>
          <p className="stat-value">{companyEmployees.length}명</p>
        </div>
        <div className="stat-card rounded-xl">
          <p className="stat-label">최근 급여월</p>
          <p className="text-lg font-semibold text-slate-900 mt-1">
            {latestPayslip ? formatMonth(latestPayslip.month) : '-'}
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/manager/payroll"
          className="flex items-center gap-3 p-4 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <BarChart3 size={17} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">급여 조회</p>
            <p className="text-xs text-slate-500 mt-0.5">월별 확인 →</p>
          </div>
        </Link>
        <button className="flex items-center gap-3 p-4 rounded-xl card hover:bg-slate-50 transition-colors group">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Users size={17} className="text-slate-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-slate-800">직원 등록</p>
            <p className="text-xs text-slate-400 mt-0.5">승인 요청 →</p>
          </div>
        </button>
      </div>

      {/* Employee list */}
      <section>
        <div className="section-header">
          <h2 className="section-title">
            직원 목록
            <span className="ml-1.5 text-xs font-normal text-slate-400">({companyEmployees.length}명)</span>
          </h2>
          <Link href="/manager/employees" className="text-xs text-blue-600 hover:underline">
            전체 보기
          </Link>
        </div>
        {companyEmployees.length === 0 ? (
          <EmptyState icon={Users} title="등록된 직원이 없습니다" />
        ) : (
          <div className="space-y-2.5">
            {companyEmployees.slice(0, 4).map(emp => (
              <EmployeeCard key={emp.id} employee={emp} onClick={() => {}} />
            ))}
            {companyEmployees.length > 4 && (
              <Link
                href="/manager/employees"
                className="flex items-center justify-center gap-1.5 w-full py-3 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
              >
                +{companyEmployees.length - 4}명 더 보기
                <ChevronRight size={14} />
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Notices */}
      <section>
        <div className="section-header">
          <h2 className="section-title">최근 공지사항</h2>
        </div>
        <div className="space-y-2.5">
          {notices.slice(0, 2).map(n => (
            <NoticeCard key={n.id} notice={n} onClick={() => {}} />
          ))}
        </div>
      </section>
    </div>
  )
}
