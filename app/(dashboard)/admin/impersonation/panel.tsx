'use client'
/* ================================================================
   ModuHR — 점검 모드 컨트롤 패널 (Client Component)
   회사 / 직원 선택 후 빙의 시작
================================================================ */

import { useState, useTransition } from 'react'
import { Building2, Users, Search, Eye, ChevronRight } from 'lucide-react'
import {
  startCompanyImpersonation,
  startEmployeeImpersonation,
} from '@/lib/impersonation/actions'

interface CompanyRow {
  id: number
  name: string
  biz_number: string | null
  representative: string | null
  status: string
}

interface EmployeeRow {
  id: number
  name: string
  email: string
  companyId: number
  companyName: string
  department: string | null
  position: string | null
}

interface Props {
  companies: CompanyRow[]
  employees: EmployeeRow[]
}

type Tab = 'company' | 'employee'

export function ImpersonationPanel({ companies, employees }: Props) {
  const [tab, setTab]         = useState<Tab>('company')
  const [query, setQuery]     = useState('')
  const [isPending, startTransition] = useTransition()

  const filteredCompanies = companies.filter(c =>
    !query || c.name.toLowerCase().includes(query.toLowerCase()) ||
    (c.biz_number ?? '').includes(query) ||
    (c.representative ?? '').toLowerCase().includes(query.toLowerCase())
  )

  const filteredEmployees = employees.filter(e =>
    !query ||
    e.name.toLowerCase().includes(query.toLowerCase()) ||
    e.email.toLowerCase().includes(query.toLowerCase()) ||
    e.companyName.toLowerCase().includes(query.toLowerCase())
  )

  function handleCompanyImpersonate(company: CompanyRow) {
    startTransition(async () => {
      await startCompanyImpersonation(company.id, company.name)
    })
  }

  function handleEmployeeImpersonate(emp: EmployeeRow) {
    startTransition(async () => {
      await startEmployeeImpersonation(
        emp.companyId,
        emp.companyName,
        emp.id,
        emp.name,
        emp.email,
      )
    })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Eye size={20} className="text-amber-500" />
          <h1 className="text-xl font-semibold text-slate-900">점검 모드</h1>
        </div>
        <p className="text-sm text-slate-500">
          회사 또는 직원의 화면을 관리자 권한으로 점검할 수 있습니다.
          실제 로그인 계정은 변경되지 않으며, 화면 상단에 점검 중임을 표시합니다.
        </p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {(['company', 'employee'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setQuery('') }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'company' ? <Building2 size={15} /> : <Users size={15} />}
            {t === 'company' ? '회사 (manager)' : '직원 (employee)'}
          </button>
        ))}
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={tab === 'company' ? '회사명, 사업자번호, 대표자 검색' : '이름, 이메일, 회사명 검색'}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        />
      </div>

      {/* 목록 */}
      {tab === 'company' ? (
        <div className="space-y-2">
          {filteredCompanies.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">검색 결과가 없습니다</p>
          )}
          {filteredCompanies.map(company => (
            <div
              key={company.id}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              {/* 아이콘 */}
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Building2 size={18} className="text-emerald-600" />
              </div>

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{company.name}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {[company.biz_number, company.representative].filter(Boolean).join(' · ') || '정보 없음'}
                </p>
              </div>

              {/* 버튼 */}
              <button
                onClick={() => handleCompanyImpersonate(company)}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <Eye size={12} />
                manager로 보기
                <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEmployees.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">검색 결과가 없습니다</p>
          )}
          {filteredEmployees.map(emp => (
            <div
              key={emp.id}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              {/* 아바타 */}
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {emp.name.slice(0, 2)}
              </div>

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {emp.name}
                  <span className="ml-1.5 text-xs font-normal text-slate-400">
                    {[emp.department, emp.position].filter(Boolean).join(' · ')}
                  </span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {emp.email} · {emp.companyName}
                </p>
              </div>

              {/* 버튼 */}
              <button
                onClick={() => handleEmployeeImpersonate(emp)}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 active:bg-blue-200 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <Eye size={12} />
                employee로 보기
                <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 안내 */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
        <p className="text-xs font-semibold text-amber-700 mb-1">점검 모드 안내</p>
        <ul className="text-xs text-amber-600 space-y-0.5 list-disc list-inside">
          <li>실제 로그인 계정(admin)은 변경되지 않습니다</li>
          <li>화면 상단에 점검 중임을 표시합니다</li>
          <li>사이드바 하단 "관리자 모드로 복귀" 버튼으로 언제든 종료할 수 있습니다</li>
          <li>모든 점검 시작/종료 이력이 DB에 기록됩니다</li>
          <li>쿠키 만료 시간: 8시간</li>
        </ul>
      </div>
    </div>
  )
}
