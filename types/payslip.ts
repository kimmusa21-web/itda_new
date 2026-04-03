/* ================================================================
   itda — 급여명세서 타입 정의
   실제 DB 테이블: pay_info_v2
================================================================ */

/* ── DB Row (pay_info_v2) ─────────────────────────────── */
export interface PayInfoV2Row {
  id:               number
  company_id:       number
  employee_id:      number
  accrual_month:    string             // YYYY-MM
  payment_date:     string | null
  work_days:        number | string | null
  overtime_hours:   number | string | null
  earnings:         Record<string, number>    // JSONB
  deductions:       Record<string, number>    // JSONB
  total_earnings:   number | string
  total_deductions: number | string          // 주의: 음수일 수 있음
  net_pay:          number | string
  calculation_notes: string[] | null
  upload_log_id:    number | null
  created_at:       string
  updated_at:       string
  // JOIN 결과
  employees?: {
    name:            string
    email:           string
    department:      string | null
    position:        string | null
    birthdate:       string | null
    Date_of_joining: string | null
    company_id:      number
  } | null
  companies?: { name: string } | null
}

/* ── 목록용 — 금액 없음 (보안) ──────────────────────────── */
export interface PayslipListItem {
  id:           number
  accrualMonth: string
  paymentDate:  string | null
  status:       'paid' | 'pending'
}

/* ── 상세 화면 ViewModel ─────────────────────────────────── */
export interface EarningItem  { key: string; label: string; amount: number }
export interface DeductionItem { key: string; label: string; amount: number }

export interface PayslipDetail {
  id:              number
  accrualMonth:    string
  paymentDate:     string | null
  workDays:        number | null
  overtimeHours:   number | null
  earnings:        EarningItem[]
  deductions:      DeductionItem[]
  totalEarnings:   number
  totalDeductions: number
  netPay:          number
  calculationNotes: string[]
  employee: {
    name:       string
    email:      string
    department: string | null
    position:   string | null
    joinDate:   string | null
    birthDate:  string | null
    employeeNo: string
  }
  companyName: string
}

/* ── DB Row → 목록 아이템 변환 (금액 제거) ──────────────── */
export function rowToListItem(row: Pick<PayInfoV2Row, 'id'|'accrual_month'|'payment_date'>): PayslipListItem {
  const today = new Date().toISOString().slice(0, 10)
  const paid  = !!row.payment_date && row.payment_date <= today
  return {
    id:           row.id,
    accrualMonth: row.accrual_month,
    paymentDate:  row.payment_date,
    status:       paid ? 'paid' : 'pending',
  }
}
