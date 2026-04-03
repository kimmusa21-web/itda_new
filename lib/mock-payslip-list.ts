export type PayslipStatus = 'paid' | 'pending'

/**
 * 목록용 타입 — 금액 정보 없음 (보안)
 * 실제 금액은 /employee/payslips/[id] 상세에서만 노출
 */
export type PayslipListItem = {
  id: string
  accrualMonth: string   // "2026-03"
  paymentDate: string    // "2026-04-15"
  status: PayslipStatus
  isCurrentMonth?: boolean
}

export const mockPayslipList: PayslipListItem[] = [
  {
    id: '28',
    accrualMonth: '2026-03',
    paymentDate: '2026-04-15',
    status: 'pending',
    isCurrentMonth: true,
  },
  {
    id: '23',
    accrualMonth: '2026-02',
    paymentDate: '2026-03-15',
    status: 'paid',
  },
  {
    id: '18',
    accrualMonth: '2026-01',
    paymentDate: '2026-02-15',
    status: 'paid',
  },
  {
    id: '14',
    accrualMonth: '2025-12',
    paymentDate: '2026-01-15',
    status: 'paid',
  },
  {
    id: '10',
    accrualMonth: '2025-11',
    paymentDate: '2025-12-15',
    status: 'paid',
  },
  {
    id: '6',
    accrualMonth: '2025-10',
    paymentDate: '2025-11-15',
    status: 'paid',
  },
]
