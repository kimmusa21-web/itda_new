'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, PlayCircle } from 'lucide-react'
import { GuideView } from '@/components/guide/guide-view'
import { MANAGER_STEPS }  from '@/components/guide/content-manager'
import { EMPLOYEE_STEPS } from '@/components/guide/content-employee'
import type { GuideStep } from '@/components/guide/types'
import { tourStorageKey } from '@/lib/guide/tour'
import type { CompanyFeatures } from '@/lib/features'
import type { Role } from '@/types'
import { cn } from '@/lib/utils'

type GuideRole = 'manager' | 'employee'

const TITLES: Record<GuideRole, { title: string; sub: string }> = {
  manager: {
    title: '기업담당자 사용 설명서',
    sub:   '화면 그림과 번호 설명으로 따라 하는 ModuHR 이용 안내',
  },
  employee: {
    title: '직원 사용 설명서',
    sub:   '내 급여·연차·출퇴근을 직접 확인하는 방법',
  },
}

/** 회사에서 사용하지 않는 기능의 설명은 숨긴다 */
function filterSteps(steps: GuideStep[], features: CompanyFeatures | null): GuideStep[] {
  if (!features) return steps
  return steps.filter(s => !s.featureKeys?.length || s.featureKeys.some(k => features[k]))
}

interface Props {
  role:     Role
  features: CompanyFeatures | null
  userId:   string
}

export function GuideClient({ role, features, userId }: Props) {
  const router = useRouter()
  const isAdmin = role === 'admin'

  // 어드민은 지원 목적으로 두 가이드를 모두 볼 수 있고, 그 외에는 본인 권한 가이드만 노출
  const ownRole: GuideRole = role === 'manager' ? 'manager' : 'employee'
  const [tab, setTab] = useState<GuideRole>(isAdmin ? 'manager' : ownRole)
  const shown: GuideRole = isAdmin ? tab : ownRole

  const steps = filterSteps(shown === 'manager' ? MANAGER_STEPS : EMPLOYEE_STEPS, isAdmin ? null : features)

  function restartTour() {
    try { window.localStorage.removeItem(tourStorageKey(ownRole, userId)) } catch { /* noop */ }
    router.push(`/${ownRole}?tour=1`)
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{TITLES[shown].title}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{TITLES[shown].sub}</p>
        </div>
        <div className="flex items-center gap-1.5 print:hidden">
          {!isAdmin && (
            <button
              onClick={restartTour}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
            >
              <PlayCircle size={13} />
              화면 안내 다시 보기
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            <Printer size={13} />
            인쇄 / PDF 저장
          </button>
        </div>
      </div>

      {/* 어드민 전용 역할 전환 탭 */}
      {isAdmin && (
        <div className="flex gap-2 print:hidden">
          {(['manager', 'employee'] as GuideRole[]).map(r => (
            <button
              key={r}
              onClick={() => setTab(r)}
              className={cn(
                'rounded-xl px-5 py-2 text-sm font-medium transition-all',
                tab === r ? 'bg-[#003366] text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
              )}
            >
              {r === 'manager' ? '기업담당자' : '직원'}
            </button>
          ))}
        </div>
      )}

      <GuideView key={shown} steps={steps} />

      {/* 문의 안내 */}
      <div className="card px-4 py-3.5 text-center">
        <p className="text-xs text-slate-500">
          설명서에서 찾지 못한 내용이 있으면 {shown === 'manager' ? '담당 세무사 또는 시스템 관리자' : '회사 담당자'}에게 문의해 주세요.
        </p>
      </div>
    </div>
  )
}
