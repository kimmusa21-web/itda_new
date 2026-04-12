'use client'
/* ================================================================
   Manager 급여업로드 탭 컨테이너
   표준 CSV | 자동 인식
================================================================ */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PayslipCsvUpload }  from '@/components/payslip-csv-upload/payslip-csv-upload'
import { AutoDetectUpload }  from '@/components/payslip-csv-upload/auto-detect-upload'

type Tab = 'standard' | 'auto'

interface Props {
  companyId: number
}

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  standard: '표준 35컬럼 CSV 양식을 사용합니다. 양식 다운로드 후 작성하여 등록하세요.',
  auto:     '기존 급여대장 파일을 그대로 업로드하면 컬럼명을 자동으로 인식합니다.',
}

export function ManagerUploadTabs({ companyId }: Props) {
  const [tab, setTab] = useState<Tab>('standard')

  return (
    <div className="space-y-5">
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <TabButton active={tab === 'standard'} onClick={() => setTab('standard')}>
          표준 CSV
        </TabButton>
        <TabButton active={tab === 'auto'}     onClick={() => setTab('auto')}>
          자동 인식
        </TabButton>
      </div>

      <p className="text-xs text-slate-500">{TAB_DESCRIPTIONS[tab]}</p>

      <div className={tab === 'standard' ? '' : 'hidden'}>
        <PayslipCsvUpload role="manager" defaultCompanyId={companyId} />
      </div>
      <div className={tab === 'auto' ? '' : 'hidden'}>
        <AutoDetectUpload role="manager" defaultCompanyId={companyId} />
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active:    boolean
  onClick:   () => void
  children:  React.ReactNode
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
