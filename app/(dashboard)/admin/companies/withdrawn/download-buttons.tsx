'use client'

import { Download } from 'lucide-react'

export function WithdrawnDownloadButtons({
  companyId,
  companyName,
}: {
  companyId: number
  companyName: string
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-slate-50">
      <span className="text-xs text-slate-400 mr-1">데이터 다운로드</span>
      <a
        href={`/api/companies/${companyId}/export/payroll`}
        onClick={e => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
        title={`${companyName} 급여정보 CSV 다운로드`}
      >
        <Download size={12} />
        급여정보
      </a>
      <a
        href={`/api/companies/${companyId}/export/leave`}
        onClick={e => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
        title={`${companyName} 연차정보 CSV 다운로드`}
      >
        <Download size={12} />
        연차정보
      </a>
    </div>
  )
}
