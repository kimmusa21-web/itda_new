'use client'

import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import EmployeeCard from '@/components/common/employee-card'
import EmptyState from '@/components/common/empty-state'
import { mockEmployees, mockUsers } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { Users } from 'lucide-react'

type Filter = 'active' | 'inactive' | 'all'

export default function ManagerEmployeesPage() {
  const user = mockUsers.manager
  const [filter, setFilter] = useState<Filter>('active')
  const [search, setSearch] = useState('')

  const base = mockEmployees.filter(e => e.company === user.company)
  const filtered = base.filter(e => {
    const matchStatus =
      filter === 'all' ? true :
      filter === 'active' ? e.status === 'active' : e.status === 'inactive'
    const matchSearch =
      !search ||
      e.name.includes(search) ||
      e.email.includes(search) ||
      e.department.includes(search)
    return matchStatus && matchSearch
  })

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">직원 관리</h1>
          <p className="text-sm text-slate-500 mt-0.5">{user.company} · {base.filter(e=>e.status==='active').length}명 재직</p>
        </div>
        <button className="btn-primary flex-shrink-0">
          <Plus size={16} />
          등록 요청
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="이름, 이메일, 부서 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tab filter */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['active','재직중'],['inactive','퇴사'],['all','전체']] as [Filter,string][]).map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              filter === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {l}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="직원이 없습니다" description="조건에 맞는 직원을 찾을 수 없습니다" />
      ) : (
        <div className="space-y-2.5">
          {filtered.map(emp => (
            <EmployeeCard key={emp.id} employee={emp} onClick={() => {}} />
          ))}
        </div>
      )}
    </div>
  )
}
