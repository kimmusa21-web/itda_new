'use client'
/* ================================================================
   ModuHR — 빙의 시작 버튼 컴포넌트들
   admin 전용: 회사/직원 상세 화면에서 클릭 시 빙의 시작
================================================================ */

import { useTransition } from 'react'
import { Eye } from 'lucide-react'
import {
  startCompanyImpersonation,
  startEmployeeImpersonation,
} from '@/lib/impersonation/actions'

/* ── 회사 manager 모드 시작 버튼 ── */
interface CompanyButtonProps {
  companyId:   number
  companyName: string
}

export function StartCompanyImpersonationButton({ companyId, companyName }: CompanyButtonProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await startCompanyImpersonation(companyId, companyName)
        })
      }
      disabled={isPending}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 transition-colors disabled:opacity-50"
    >
      <Eye size={13} />
      {isPending ? '전환 중...' : 'manager로 보기'}
    </button>
  )
}

/* ── 직원 employee 모드 시작 버튼 ── */
interface EmployeeButtonProps {
  companyId:     number
  companyName:   string
  employeeId:    number
  employeeName:  string
  employeeEmail: string
}

export function StartEmployeeImpersonationButton({
  companyId,
  companyName,
  employeeId,
  employeeName,
  employeeEmail,
}: EmployeeButtonProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await startEmployeeImpersonation(
            companyId,
            companyName,
            employeeId,
            employeeName,
            employeeEmail,
          )
        })
      }
      disabled={isPending}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 transition-colors disabled:opacity-50"
    >
      <Eye size={12} />
      {isPending ? '전환 중...' : '점검'}
    </button>
  )
}
