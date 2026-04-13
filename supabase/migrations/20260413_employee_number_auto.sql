-- ═══════════════════════════════════════════════════════════════════
-- itda — 사번(employee_number) 자동 생성 지원 마이그레이션
-- 기존 20260407 마이그레이션과 호환 (IF NOT EXISTS 사용)
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. employees: employee_number 컬럼 확보 (이미 존재하면 무시) ─────
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS employee_number TEXT;

-- ── 2. 회사 내 유니크 인덱스 확보 ────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_company_employee_number
  ON employees(company_id, employee_number)
  WHERE employee_number IS NOT NULL;

-- ── 3. 코멘트 업데이트 ───────────────────────────────────────────────
COMMENT ON COLUMN employees.employee_number
  IS '사번 — 자동 생성 (사업자번호 앞3자리 + YYMMDD + 랜덤소문자2자리). 회사 내 유니크, NULL 허용(기존 직원 호환)';
