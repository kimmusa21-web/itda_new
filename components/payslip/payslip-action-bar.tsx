'use client'

import { Printer, Download } from 'lucide-react'

interface PayslipActionBarProps {
  onPrint?: () => void
  onDownloadPdf?: () => void
  isPdfReady?: boolean
}

export function PayslipActionBar({
  onPrint,
  onDownloadPdf,
  isPdfReady = false,
}: PayslipActionBarProps) {
  function handlePrint() {
    if (onPrint) { onPrint(); return }
    window.print()
  }

  function handlePdf() {
    if (onDownloadPdf) { onDownloadPdf(); return }
    console.log('[ModuHR] PDF download — 추후 구현 예정')
    alert('PDF 다운로드 기능은 준비 중입니다.')
  }

  return (
    <>
      {/* Sticky bottom action bar (mobile) */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-3 flex gap-3 print:hidden"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
        >
          <Printer size={16} />
          인쇄
        </button>
        <button
          onClick={handlePdf}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white active:scale-95 transition-all bg-blue-600 hover:bg-blue-700"
        >
          <Download size={16} />
          {isPdfReady ? 'PDF 다운로드' : 'PDF 준비중'}
        </button>
      </div>

      {/* Print-only footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
        본 명세서는 ModuHR 급여관리 시스템에서 출력되었습니다.
      </div>
    </>
  )
}
