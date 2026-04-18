'use client'
/* ================================================================
   Admin 급여업로드 탭 컨테이너
   표준 CSV | 자동 인식 | 급여대장 | 고급 업로드
================================================================ */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PayslipCsvUpload }    from '@/components/payslip-csv-upload/payslip-csv-upload'
import { AutoDetectUpload }    from '@/components/payslip-csv-upload/auto-detect-upload'
import { PayrollLedgerUpload } from '@/components/payslip-csv-upload/payroll-ledger-upload'
import { PayrollUploadPage }   from '@/components/payroll-upload/payroll-upload-page'

type Tab = 'standard' | 'auto' | 'ledger' | 'advanced'

interface Props {
  companies:     { id: number; name: string }[]
  currentUserId: string
}

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  standard: '표준 35컬럼 CSV 양식을 사용합니다. 양식 다운로드 후 작성하여 등록하세요.',
  auto:     '기존 급여대장 파일을 그대로 업로드하면 컬럼명을 자동으로 인식합니다.',
  ledger:   '회사 급여대장 엑셀(xlsx/csv)을 그대로 업로드하면 사번·이름으로 직원을 자동 매칭합니다.',
  advanced: '컬럼 매핑을 직접 설정하여 회사별 커스텀 CSV 형식을 처리합니다. 3단계 검증 후 확정합니다.',
}

export function AdminUploadTabs({ companies, currentUserId }: Props) {
  const [tab, setTab] = useState<Tab>('advanced')

  return (
    <div className="space-y-5">
      {/* 탭 헤더 */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit flex-wrap">
        <TabButton active={tab === 'advanced'} onClick={() => setTab('advanced')}>
          고급 업로드
        </TabButton>
        <TabButton active={tab === 'ledger'}   onClick={() => setTab('ledger')}>
          급여대장
        </TabButton>
        <TabButton active={tab === 'auto'}     onClick={() => setTab('auto')}>
          자동 인식
        </TabButton>
        <TabButton active={tab === 'standard'} onClick={() => setTab('standard')}>
          표준 CSV
        </TabButton>
      </div>

      {/* 탭 설명 */}
      <p className="text-xs text-slate-500">{TAB_DESCRIPTIONS[tab]}</p>

      {/* 콘텐츠 — 마운트 유지, visibility로 전환 */}
      <div className={tab === 'standard' ? '' : 'hidden'}>
        <PayslipCsvUpload role="admin" companies={companies} />
      </div>
      <div className={tab === 'auto' ? '' : 'hidden'}>
        <AutoDetectUpload role="admin" companies={companies} />
      </div>
      <div className={tab === 'ledger' ? '' : 'hidden'}>
        <PayrollLedgerUpload role="admin" companies={companies} />
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
