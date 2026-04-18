/* ================================================================
   itda — 사번(employee_number) 자동 생성 유틸리티

   규칙: 사업자번호 앞 3자리 + 입사일(YYMMDD) + 랜덤 영문 소문자 2자리
   예시: 사업자번호 123-45-67890, 입사일 2025-03-24  →  123250324ab

   - generateEmployeeNumber      : 순수 생성 함수 (중복 미확인)
   - generateUniqueEmployeeNumber: DB 중복 확인 + 재시도 포함
================================================================ */

/**
 * 사번 1회 생성 (중복 확인 없음)
 * @param bizNumber 사업자번호 (숫자·하이픈 혼용 가능)
 * @param hireDate  입사일 (YYYY-MM-DD)
 */
export function generateEmployeeNumber(bizNumber: string, hireDate: string): string {
  // 사업자번호 앞 3자리 (숫자만 추출)
  const biz = bizNumber.replace(/[^0-9]/g, '').slice(0, 3)

  // 입사일 YYMMDD
  const date = new Date(hireDate)
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hire = `${yy}${mm}${dd}`

  // 랜덤 영문 소문자 2자리
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  let rand = ''
  for (let i = 0; i < 2; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)]
  }

  return `${biz}${hire}${rand}`
}

/**
 * 회사 내 중복 없는 사번 생성 (DB 조회 + 재시도)
 * @param supabase  Supabase 클라이언트 (서버/서비스 role 모두 가능)
 * @param bizNumber 회사 사업자번호
 * @param hireDate  입사일 (YYYY-MM-DD). null 이면 오늘 날짜 사용
 * @param companyId 회사 ID (유니크 인덱스가 company_id 기준)
 */
export async function generateUniqueEmployeeNumber(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  bizNumber: string,
  hireDate: string | null,
  companyId: number,
): Promise<string> {
  const effectiveDate = hireDate ?? new Date().toISOString().slice(0, 10)

  let employeeNumber = ''
  let exists = true

  while (exists) {
    employeeNumber = generateEmployeeNumber(bizNumber, effectiveDate)

    const { data } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
      .eq('employee_number', employeeNumber)
      .maybeSingle()

    exists = !!data
  }

  return employeeNumber
}

/**
 * employee_number가 null일 때 급여명세서 표시용 임시 사번 (결정론적, DB 호출 없음)
 * 형식: 사업자 앞3자리 + 입사일YYMMDD + employee_id 기반 2소문자
 * 실제 DB에 저장되지 않음 — 화면 표시 전용 fallback
 */
export function deriveEmployeeNumberDisplay(
  bizNumber: string | null | undefined,
  hireDate:  string | null | undefined,
  employeeId: number,
): string {
  const biz = (bizNumber ?? '').replace(/[^0-9]/g, '').slice(0, 3).padEnd(3, '0')

  let dateStr = '000000'
  if (hireDate) {
    const d = new Date(hireDate)
    if (!isNaN(d.getTime())) {
      const yy = String(d.getFullYear()).slice(2)
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      dateStr = `${yy}${mm}${dd}`
    }
  }

  // employee_id 기반 결정론적 2소문자 (aa ~ zz, 676가지)
  const a = String.fromCharCode(97 + (Math.floor(employeeId / 26) % 26))
  const b = String.fromCharCode(97 + (employeeId % 26))
  return `${biz}${dateStr}${a}${b}`
}

/**
 * 배치 INSERT 전용 — 복수 행에 대해 중복 없는 사번 일괄 생성
 * DB 기존 사번 + 배치 내 중복 모두 방지
 *
 * @param supabase   Supabase 클라이언트
 * @param companyId  회사 ID
 * @param bizNumber  회사 사업자번호
 * @param hireDates  각 행의 입사일 (null 허용, null 이면 오늘 날짜 사용)
 */
export async function generateUniqueEmployeeNumbersBatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  companyId: number,
  bizNumber: string,
  hireDates: (string | null)[],
): Promise<string[]> {
  // 해당 회사의 기존 사번 집합 조회
  const { data: existing } = await supabase
    .from('employees')
    .select('employee_number')
    .eq('company_id', companyId)
    .not('employee_number', 'is', null)

  const usedNumbers = new Set<string>(
    (existing ?? []).map((r: { employee_number: string }) => r.employee_number),
  )

  const results: string[] = []
  const today = new Date().toISOString().slice(0, 10)

  for (const hireDate of hireDates) {
    const effectiveDate = hireDate ?? today
    let num: string

    do {
      num = generateEmployeeNumber(bizNumber, effectiveDate)
    } while (usedNumbers.has(num))

    usedNumbers.add(num) // 배치 내 중복 방지
    results.push(num)
  }

  return results
}
