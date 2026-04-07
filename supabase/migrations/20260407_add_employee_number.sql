-- ═══════════════════════════════════════════════════════════════════
-- itda — 직원 CSV 대량 등록 기능 지원 마이그레이션
-- 실행 환경: Supabase SQL Editor 또는 Supabase CLI
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. employees: employee_number 컬럼 추가 ─────────────────────────
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS employee_number TEXT;

COMMENT ON COLUMN employees.employee_number
  IS '사번(직원번호) — 회사 내 고유값, NULL 허용(기존 직원 호환)';

-- ── 2. employee_number 유니크 인덱스 (회사별) ───────────────────────
--    같은 회사 내에서만 유니크, NULL 제외
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_company_employee_number
  ON employees(company_id, employee_number)
  WHERE employee_number IS NOT NULL;

-- ── 3. email 유니크 인덱스 (전체) ───────────────────────────────────
--    이미 있으면 무시 (IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email
  ON employees(email);

-- ── 4. employee_upload_logs: CSV 업로드 이력 ────────────────────────
--    company_id 타입은 companies.id와 동일하게 맞춤 (INT / BIGINT 혼용 방지)
CREATE TABLE IF NOT EXISTS employee_upload_logs (
  id            BIGSERIAL    PRIMARY KEY,
  company_id    INT          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  uploaded_by   UUID         NOT NULL REFERENCES auth.users(id),
  file_name     TEXT,
  total_rows    INT          NOT NULL DEFAULT 0,
  success_rows  INT          NOT NULL DEFAULT 0,
  failure_rows  INT          NOT NULL DEFAULT 0,
  failure_detail JSONB,      -- [{rowNumber, reasons[]}]
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_upload_logs_company
  ON employee_upload_logs(company_id);

-- ── 5. RLS ───────────────────────────────────────────────────────────
ALTER TABLE employee_upload_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage all employee upload logs" ON employee_upload_logs;
CREATE POLICY "admins manage all employee upload logs"
  ON employee_upload_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "managers view own company upload logs" ON employee_upload_logs;
CREATE POLICY "managers view own company upload logs"
  ON employee_upload_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'manager'
        AND profiles.company_id = employee_upload_logs.company_id
    )
  );

DROP POLICY IF EXISTS "service role manages employee upload logs" ON employee_upload_logs;
CREATE POLICY "service role manages employee upload logs"
  ON employee_upload_logs FOR ALL
  USING (auth.role() = 'service_role');
