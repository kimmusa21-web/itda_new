'use client'
/* ================================================================
   ModuHR — 빙의 모드 배너
   impersonation 중에 화면 상단에 표시되는 경고 배너.
   "관리자 모드로 돌아가기" 버튼으로 즉시 종료.
================================================================ */

import { Eye, X } from 'lucide-react'
import { stopImpersonation } from '@/lib/impersonation/actions'
import type { ImpersonationContext } from '@/lib/impersonation/types'

interface Props {
  ctx: ImpersonationContext
}

export function ImpersonationBanner({ ctx }: Props) {
  const label =
    ctx.type === 'company_manager'
      ? `${ctx.companyName} manager 모드로 점검 중`
      : `${ctx.employeeName ?? '직원'} (${ctx.companyName}) employee 모드로 점검 중`

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Eye size={15} className="flex-shrink-0" />
        <span className="truncate">[점검 중] {label}</span>
      </div>

      <form action={stopImpersonation} className="flex-shrink-0">
        <button
          type="submit"
          className="flex items-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 active:bg-white/40 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
        >
          <X size={12} />
          관리자 모드로 돌아가기
        </button>
      </form>
    </div>
  )
}
