'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PayslipDetail } from '@/lib/mock-payslip'
import { PayslipHeader }               from './payslip-header'
import { InfoGridSection }              from './info-grid-section'
import { WorkInfoSection }              from './work-info-section'
import { EarningsSection, DeductionsSection } from './line-items-section'
import { NetPayCard }                  from './net-pay-card'
import { TotalSummarySection }         from './total-summary-section'
import { CalculationNotesAccordion }   from './calculation-notes-accordion'
import { PayslipActionBar }            from './payslip-action-bar'
import { ShowZeroToggle }              from './payslip-show-zero-toggle'

interface PayslipDetailProps {
  payslip: PayslipDetail
}

export function PayslipDetailView({ payslip }: PayslipDetailProps) {
  const router = useRouter()
  const [showZero, setShowZero] = useState(true)

  return (
    <div className="min-h-dvh bg-slate-100 print:bg-white">
      {/* Sticky top header */}
      <PayslipHeader
        payslip={payslip}
        onBack={() => router.back()}
      />

      {/* Main content — max-w-2xl, centered */}
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-32 print:pb-0 print:px-0 print:py-6">

        {/* 1. Net pay hero card */}
        <NetPayCard
          netPay={payslip.netPay}
          accrualMonth={payslip.accrualMonth}
          paymentDate={payslip.paymentDate}
        />

        {/* 2. Personal info */}
        <InfoGridSection
          employee={payslip.employee}
          companyName={payslip.companyName}
        />

        {/* 3. Work info */}
        <WorkInfoSection workInfo={payslip.workInfo} />

        {/* 4. Show-zero toggle */}
        <div className="flex justify-end">
          <ShowZeroToggle showZero={showZero} onChange={setShowZero} />
        </div>

        {/* 5. Earnings */}
        <EarningsSection
          items={payslip.earnings}
          total={payslip.totalEarnings}
          showZero={showZero}
        />

        {/* 6. Deductions */}
        <DeductionsSection
          items={payslip.deductions}
          total={payslip.totalDeductions}
          showZero={showZero}
        />

        {/* 7. Summary */}
        <TotalSummarySection
          totalEarnings={payslip.totalEarnings}
          totalDeductions={payslip.totalDeductions}
          netPay={payslip.netPay}
        />

        {/* 8. Calculation notes accordion */}
        {payslip.calculationNotes && payslip.calculationNotes.length > 0 && (
          <CalculationNotesAccordion notes={payslip.calculationNotes} />
        )}

        {/* Print watermark */}
        <div className="hidden print:flex justify-center pt-4">
          <p className="text-xs text-slate-400">
            ModuHR 급여관리 시스템 · {payslip.companyName}
          </p>
        </div>
      </div>

      {/* 9. Floating action bar */}
      <PayslipActionBar isPdfReady={false} />
    </div>
  )
}
