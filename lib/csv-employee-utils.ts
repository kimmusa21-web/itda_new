/* ================================================================
   ModuHR — 직원 CSV 유틸리티
   - 템플릿 생성
   - CSV 파싱 (papaparse)
   - 행별 유효성 검증
   - 파일 내 중복 검증
================================================================ */

import Papa from 'papaparse'
import type {
  EmployeeCsvRawRow,
  EmployeeCsvHeader,
} from '@/types/employee-upload'
import {
  EMPLOYEE_CSV_HEADERS,
  REQUIRED_CSV_HEADERS,
  CSV_HEADER_LABELS,
  VALID_EMPLOYMENT_STATUS,
} from '@/types/employee-upload'

/* ── 1. CSV 템플릿 생성 ──────────────────────────────────────── */

const TEMPLATE_EXAMPLE_ROWS: EmployeeCsvRawRow[] = [
  {
    name:              '홍길동',
    email:             'hong@example.com',
    employee_number:   '', // 사번은 자동 생성 — 비워두세요
    department:        '영업팀',
    position:          '사원',
    phone:             '010-1234-5678',
    join_date:         '2024-01-15',
    employment_status: 'active',
    is_contract:       'N',
    contract_end_date: '',
    weekly_work_hours: '40',
    is_foreigner:        'N',
    nationality:         '',
    visa_type:           '',
    registration_number: '',
  },
  {
    name:              '김영희',
    email:             'kim@example.com',
    employee_number:   '', // 사번은 자동 생성 — 비워두세요
    department:        '인사팀',
    position:          '대리',
    phone:             '010-2345-6789',
    join_date:         '2023-03-01',
    employment_status: 'active',
    is_contract:       'Y',
    contract_end_date: '2025-02-28',
    weekly_work_hours: '40',
    is_foreigner:      'Y',
    nationality:       '미국',
    visa_type:         'E-7',
    registration_number: '',
  },
]

/**
 * UTF-8 BOM + CSV 문자열 반환 (Excel 한글 깨짐 방지)
 */
export function generateEmployeeCsvTemplate(): string {
  const BOM = '\uFEFF'
  const headers = EMPLOYEE_CSV_HEADERS.join(',')
  const rows = TEMPLATE_EXAMPLE_ROWS.map(row =>
    EMPLOYEE_CSV_HEADERS.map(h => {
      const val = row[h as EmployeeCsvHeader] ?? ''
      // 콤마 포함 시 따옴표 처리
      return val.includes(',') ? `"${val}"` : val
    }).join(',')
  )
  return BOM + [headers, ...rows].join('\r\n')
}

/**
 * 브라우저에서 CSV 파일 다운로드 트리거
 */
export function downloadEmployeeCsvTemplate(): void {
  const content = generateEmployeeCsvTemplate()
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'employee_upload_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/* ── 2. CSV 파싱 ─────────────────────────────────────────────── */

export interface ParseResult {
  rows: EmployeeCsvRawRow[]
  headerError: string | null
}

/**
 * CSV 파일을 파싱하여 EmployeeCsvRawRow[] 반환
 * 헤더 불일치 시 headerError 반환
 */
export function parseEmployeeCsv(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (result) => {
        // 헤더 검증
        const actualHeaders = result.meta.fields ?? []
        const missingHeaders = REQUIRED_CSV_HEADERS.filter(
          h => !actualHeaders.includes(h)
        )

        if (missingHeaders.length > 0) {
          resolve({
            rows: [],
            headerError: `필수 헤더 누락: ${missingHeaders.map(h => CSV_HEADER_LABELS[h]).join(', ')}. CSV 양식을 다운로드하여 사용해주세요.`,
          })
          return
        }

        // 알 수 없는 헤더 경고는 무시하고 진행 (관대한 파싱)
        const rows = result.data.map(row => ({
          name:              (row['name']              ?? '').trim(),
          email:             (row['email']             ?? '').trim().toLowerCase(),
          employee_number:   (row['employee_number']   ?? '').trim(),
          department:        (row['department']        ?? '').trim(),
          position:          (row['position']          ?? '').trim(),
          phone:             (row['phone']             ?? '').trim(),
          join_date:         (row['join_date']         ?? '').trim(),
          employment_status: (row['employment_status'] ?? '').trim().toLowerCase(),
          is_contract:       (row['is_contract']       ?? '').trim().toUpperCase(),
          contract_end_date: (row['contract_end_date'] ?? '').trim(),
          weekly_work_hours: (row['weekly_work_hours'] ?? '').trim(),
          is_foreigner:        (row['is_foreigner']        ?? '').trim().toUpperCase(),
          nationality:         (row['nationality']         ?? '').trim(),
          visa_type:           (row['visa_type']           ?? '').trim(),
          registration_number: (row['registration_number'] ?? '').trim(),
        } as EmployeeCsvRawRow))

        resolve({ rows, headerError: null })
      },
      error: () => {
        resolve({ rows: [], headerError: 'CSV 파일을 읽을 수 없습니다. 파일 형식을 확인해주세요.' })
      },
    })
  })
}

/* ── 3. 행별 유효성 검증 ─────────────────────────────────────── */

export interface RowValidationResult {
  valid: boolean
  reasons: string[]
}

/**
 * 단일 행 유효성 검증 (DB 조회 없이 형식만)
 */
export function validateEmployeeRow(
  row: EmployeeCsvRawRow,
  rowNumber: number,
): RowValidationResult {
  const reasons: string[] = []

  // 이름 필수
  if (!row.name) reasons.push('이름이 비어 있습니다')

  // 이메일 필수 + 형식
  if (!row.email) {
    reasons.push('이메일이 비어 있습니다')
  } else if (!isValidEmail(row.email)) {
    reasons.push(`이메일 형식이 올바르지 않습니다: "${row.email}"`)
  }

  // 사번은 자동 생성 — CSV에 없어도 오류 없음

  // 입사일 형식 (입력된 경우만)
  if (row.join_date && !isValidDate(row.join_date)) {
    reasons.push(`입사일 형식 오류 (YYYY-MM-DD): "${row.join_date}"`)
  }

  // employment_status 허용값 (입력된 경우만)
  if (
    row.employment_status &&
    !(VALID_EMPLOYMENT_STATUS as readonly string[]).includes(row.employment_status)
  ) {
    reasons.push(
      `재직상태 값 오류: "${row.employment_status}" → active 또는 inactive 만 허용`
    )
  }

  // is_contract 허용값 (입력된 경우만)
  if (row.is_contract && !['Y', 'N'].includes(row.is_contract)) {
    reasons.push(`계약직여부 값 오류: "${row.is_contract}" → Y 또는 N 만 허용`)
  }

  // contract_end_date 형식 (입력된 경우만)
  if (row.contract_end_date && !isValidDate(row.contract_end_date)) {
    reasons.push(`계약만료일 형식 오류 (YYYY-MM-DD): "${row.contract_end_date}"`)
  }

  // weekly_work_hours — 양의 정수, 최대 168 (입력된 경우만)
  if (row.weekly_work_hours) {
    const h = Number(row.weekly_work_hours)
    if (!Number.isInteger(h) || h < 1 || h > 168) {
      reasons.push(`1주소정근로시간 값 오류: "${row.weekly_work_hours}" → 1~168 사이의 정수`)
    }
  }

  // is_foreigner 허용값 (입력된 경우만)
  if (row.is_foreigner && !['Y', 'N'].includes(row.is_foreigner)) {
    reasons.push(`외국인여부 값 오류: "${row.is_foreigner}" → Y 또는 N 만 허용`)
  }

  // registration_number 형식 (입력된 경우만) — 숫자 13자리
  if (row.registration_number) {
    const digits = row.registration_number.replace(/\D/g, '')
    if (digits.length !== 13) {
      reasons.push(`주민(외국인)등록번호 형식 오류: 숫자 13자리여야 합니다 (예: 901225-1234567)`)
    }
  }

  return { valid: reasons.length === 0, reasons }
}

/* ── 4. 파일 내 중복 검증 ───────────────────────────────────── */

export interface InternalDuplicateResult {
  duplicateEmails: string[]
  duplicateEmployeeNumbers: string[]
}

/**
 * 같은 파일 내 이메일/사번 중복 검사
 */
export function checkInternalDuplicates(
  rows: EmployeeCsvRawRow[],
): InternalDuplicateResult {
  const emailCount: Record<string, number> = {}
  const empNumCount: Record<string, number> = {}

  rows.forEach(row => {
    if (row.email) {
      emailCount[row.email] = (emailCount[row.email] ?? 0) + 1
    }
    if (row.employee_number) {
      empNumCount[row.employee_number] = (empNumCount[row.employee_number] ?? 0) + 1
    }
  })

  return {
    duplicateEmails: Object.entries(emailCount)
      .filter(([, count]) => count > 1)
      .map(([email]) => email),
    duplicateEmployeeNumbers: Object.entries(empNumCount)
      .filter(([, count]) => count > 1)
      .map(([num]) => num),
  }
}

/* ── 5. 헬퍼 ────────────────────────────────────────────────── */

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value))
}
