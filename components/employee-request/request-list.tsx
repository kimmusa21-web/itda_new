import { UserPlus } from 'lucide-react'
import type { EmployeeRequest } from '@/lib/mock-employee-requests'
import { RequestListItem } from './request-list-item'

interface Props {
  requests: EmployeeRequest[]
  selectedId: string | null
  onSelect: (r: EmployeeRequest) => void
}

export function RequestList({ requests, selectedId, onSelect }: Props) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <UserPlus size={24} className="text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600">신청 내역이 없습니다</p>
        <p className="text-xs text-slate-400 mt-1">
          검색 조건 또는 필터를 변경해보세요
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {requests.map(r => (
        <RequestListItem
          key={r.id}
          request={r}
          isSelected={r.id === selectedId}
          onClick={() => onSelect(r)}
        />
      ))}
    </div>
  )
}
