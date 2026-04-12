'use client'
/* ================================================================
   Admin 급여업로드 탭 컨테이너
   간편 업로드 (PayslipCsvUpload) | 고급 업로드 (PayrollUploadPage)
================================================================ */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PayslipCsvUpload }  from '@/components/payslip-csv-upload/payslip-csv-upload'
import { PayrollUploadPage } from '@/components/payroll-upload/payroll-upload-page'

type Tab = 'simple' | 'advanced'

interface Props {
  companies:     { id: number; name: string }[]
  currentUserId: string
}

export function AdminUploadTabs({ companies, currentUserId }: Props) {
  const [tab, setTab] = useState<Tab>('simple')

  return (
    <div className="space-y-5">
      {/* 탭 헤더 */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <TabButton active={tab === 'simple'}   onClick={() => setTab('simple')}>
          간편 업로드
        </TabButton>
        <TabButton active={tab === 'advanced'} onClick={() => setTab('advanced')}>
          고급 업로드
        </TabButton>
      </div>

      {/* 탭 설명 */}
      <p className="text-xs text-slate-500">
        {tab === 'simple'
          ? '고정 컬럼 형식의 CSV 파일을 업로드합니다. 양식 다운로드 후 작성하여 등록하세요.'
          : '컬럼 매핑을 통해 회사별 커스텀 CSV 형식을 처리합니다. 3단계 검증 후 확정합니다.'}
      </p>

      {/* 콘텐츠 — 마운트 유지, visibility로 전환 */}
      <div className={tab === 'simple' ? '' : 'hidden'}>
        <PayslipCsvUpload role="admin" companies={companies} />
      </div>
      <div className={tab === 'advanced' ? '' : 'hidden'}>
        <PayrollUploadPage
          companies={companies}
          currentUserId={currentUserId}
          hideHeader
        />
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-lg text-sm font-medium transition-all',
        active
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-700',
      )}
    >
      {children}
    </button>
  )
}
