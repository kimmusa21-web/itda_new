export type LeaveBasis = 'hire_date' | 'fiscal_year'
export type LeaveType = 'full_day' | 'half_day_am' | 'half_day_pm' | 'hourly'
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type PeriodType = 'annual' | 'monthly'

export interface LeavePolicy {
  id:               number
  company_id:       number
  basis:            LeaveBasis
  allow_negative:   boolean
  auto_approve:     boolean
  settle_on_resign: boolean
  created_at:       string
  updated_at:       string
}

export interface LeaveBalance {
  id:           number
  company_id:   number
  employee_id:  number
  basis:        LeaveBasis
  period:       string       // 'YYYY' or 'YYYY-MM'
  period_type:  PeriodType
  total_hours:  number
  used_hours:   number
  adj_hours:    number
  expires_at:   string
  created_at:   string
  updated_at:   string
}

export interface LeaveAdjustment {
  id:           number
  company_id:   number
  employee_id:  number
  balance_id:   number
  hours:        number
  reason:       string
  adjusted_by:  string
  created_at:   string
}

export interface LeaveRequest {
  id:               number
  company_id:       number
  employee_id:      number
  balance_id:       number | null
  leave_type:       LeaveType
  start_date:       string
  end_date:         string
  hours_requested:  number
  reason:           string | null
  status:           LeaveStatus
  rejection_reason: string | null
  requested_at:     string
  approved_at:      string | null
  rejected_at:      string | null
  approved_by:      string | null
  created_at:       string
}

/** 직원 연차 요약 (화면 표시용) */
export interface LeaveBalanceSummary {
  totalHours:     number   // 발생 총 시간
  usedHours:      number   // 사용 시간
  adjHours:       number   // 수동 조정 누계
  remainingHours: number   // 잔여 시간 (= total + adj - used)
  dailyHours:     number   // 1일 시간 (weekly_work_hours / 5)
  remainingDays:  number   // 잔여 일수 (remainingHours / dailyHours, 소수점 1자리)
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  full_day:    '연차(1일)',
  half_day_am: '오전 반차',
  half_day_pm: '오후 반차',
  hourly:      '시간 연차',
}

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending:   '승인 대기',
  approved:  '승인 완료',
  rejected:  '반려됨',
  cancelled: '취소됨',
}
