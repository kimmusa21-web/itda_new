/* ─── 타입 ──────────────────────────────────────────── */
export type FieldError = string | undefined

export type FormErrors<T> = Partial<Record<keyof T, FieldError>>

/* ─── 개별 검증 함수 ─────────────────────────────────── */
export function validateRequired(value: string, label = '이 항목'): FieldError {
  return value.trim() ? undefined : `${label}은(는) 필수 입력값입니다`
}

export function validateEmail(value: string): FieldError {
  if (!value.trim()) return '이메일은 필수 입력값입니다'
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  return ok ? undefined : '올바른 이메일 형식이 아닙니다'
}

export function validatePhone(value: string): FieldError {
  if (!value.trim()) return undefined  // 선택 항목
  const digits = value.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 11) return '올바른 전화번호 형식이 아닙니다'
  return undefined
}

export function validateDate(value: string, label = '날짜'): FieldError {
  if (!value) return `${label}은(는) 필수 입력값입니다`
  const d = new Date(value)
  return isNaN(d.getTime()) ? `${label} 형식이 올바르지 않습니다` : undefined
}

export function validateBirthdate(value: string): FieldError {
  if (!value.trim()) return undefined  // 선택 항목
  // YYMMDD 6자리 형식
  if (!/^\d{6}$/.test(value)) return '생년월일 6자리를 입력하세요 (예: 901225)'
  return undefined
}

export function validateSalaryAmount(value: number | ''): FieldError {
  if (value === '') return '급여 금액을 입력해주세요'
  if (value <= 0) return '급여 금액은 0보다 커야 합니다'
  if (value > 1_000_000_000) return '금액이 너무 큽니다'
  return undefined
}

/* ─── 전화번호 자동 포맷팅 ────────────────────────────── */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  if (digits.startsWith('02')) {
    // 서울 지역번호
    if (digits.length <= 9) return `${digits.slice(0,2)}-${digits.slice(2,6)}-${digits.slice(6)}`
    return `${digits.slice(0,2)}-${digits.slice(2,6)}-${digits.slice(6)}`
  }
  return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`
}

/* ─── 금액 포맷팅 ─────────────────────────────────────── */
export function formatSalaryDisplay(value: number | ''): string {
  if (value === '' || value === 0) return ''
  return Number(value).toLocaleString('ko-KR')
}

export function parseSalaryInput(raw: string): number | '' {
  const cleaned = raw.replace(/[^0-9]/g, '')
  if (!cleaned) return ''
  const n = parseInt(cleaned, 10)
  return isNaN(n) ? '' : n
}
