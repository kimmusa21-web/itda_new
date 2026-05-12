export type WorkType        = 'office' | 'field' | 'remote'
export type AttendanceStatus = 'not_started' | 'checked_in' | 'checked_out'

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  office: '사무실 출근',
  field:  '외근',
  remote: '재택',
}

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  not_started: '미출근',
  checked_in:  '출근완료',
  checked_out: '퇴근완료',
}

export interface AttendanceLog {
  id:                   number
  company_id:           number
  employee_id:          number
  work_date:            string
  work_type:            WorkType
  work_note:            string | null
  check_in_at:          string | null
  check_out_at:         string | null
  check_in_latitude:    number | null
  check_in_longitude:   number | null
  check_out_latitude:   number | null
  check_out_longitude:  number | null
  check_in_distance_m:  number | null
  check_out_distance_m: number | null
  check_in_accuracy_m:  number | null
  check_out_accuracy_m: number | null
  status:               AttendanceStatus
  is_late_entry:        boolean
  late_entry_note:      string | null
  is_impersonated:      boolean
  entered_by_user_id:   string | null
  created_at:           string
  updated_at:           string
}

export interface AttendanceSettings {
  company_id:           number
  notify_late_entry:    boolean
  notify_late_modified: boolean
}

export interface CheckInInput {
  work_date:        string
  work_type:        WorkType
  work_note?:       string
  latitude:         number
  longitude:        number
  accuracy_m:       number
  late_entry_note?: string
}

export interface CheckOutInput {
  work_date:  string
  latitude:   number
  longitude:  number
  accuracy_m: number
}

export interface UpdateAttendanceInput {
  log_id:            number
  work_type?:        WorkType
  work_note?:        string
  check_in_at?:      string
  check_out_at?:     string
  late_entry_note?:  string
}

/** manager/admin 화면용 출퇴근 행 */
export interface AttendanceRow extends AttendanceLog {
  employee_name:   string
  employee_number: string | null
  department:      string | null
  position:        string | null
  company_name?:   string  // admin 전용
}

/** 월별 근로시간 집계 행 */
export interface MonthlySummaryRow {
  employee_id:      number
  employee_name:    string
  employee_number:  string | null
  department:       string | null
  position:         string | null
  days_worked:      number   // check_in + check_out 모두 있는 날
  days_incomplete:  number   // check_in만 있고 check_out 없는 날
  total_minutes:    number   // 총 근무시간(분)
  overtime_minutes: number   // 연장근무(분) — 1일 8시간 초과분
  work_types: { office: number; field: number; remote: number }
}
