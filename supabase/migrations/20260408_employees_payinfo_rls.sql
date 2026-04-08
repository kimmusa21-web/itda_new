-- ═══════════════════════════════════════════════════════════════════
-- itda — employees & pay_info 테이블 RLS 설정
-- 직원 식별 기준: company_id + email
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. employees RLS ──────────────────────────────────────────────
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- (기존 정책 초기화)
DROP POLICY IF EXISTS "employees: admin sees all"               ON employees;
DROP POLICY IF EXISTS "employees: manager sees own company"     ON employees;
DROP POLICY IF EXISTS "employees: employee sees self"           ON employees;
DROP POLICY IF EXISTS "employees: admin manages all"            ON employees;
DROP POLICY IF EXISTS "employees: manager manages own company"  ON employees;
DROP POLICY IF EXISTS "employees: service role manages all"     ON employees;

-- 어드민: 전체 조회
CREATE POLICY "employees: admin sees all"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 매니저: 본인 회사 직원만 조회
CREATE POLICY "employees: manager sees own company"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'manager'
        AND p.company_id = employees.company_id
    )
  );

-- 직원: 본인 레코드만 조회 (user_id 기준)
CREATE POLICY "employees: employee sees self"
  ON employees FOR SELECT
  USING (employees.user_id = auth.uid());

-- 어드민: 전체 INSERT/UPDATE/DELETE
CREATE POLICY "employees: admin manages all"
  ON employees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 매니저: 본인 회사 직원 INSERT/UPDATE
CREATE POLICY "employees: manager manages own company"
  ON employees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'manager'
        AND p.company_id = employees.company_id
    )
  );

-- service_role: 전체 관리 (API Route 용)
CREATE POLICY "employees: service role manages all"
  ON employees FOR ALL
  USING (auth.role() = 'service_role');

-- ── 2. pay_info RLS ───────────────────────────────────────────────
ALTER TABLE pay_info ENABLE ROW LEVEL SECURITY;

-- (기존 정책 초기화)
DROP POLICY IF EXISTS "pay_info: admin sees all"               ON pay_info;
DROP POLICY IF EXISTS "pay_info: manager sees own company"     ON pay_info;
DROP POLICY IF EXISTS "pay_info: employee sees self"           ON pay_info;
DROP POLICY IF EXISTS "pay_info: admin manages all"            ON pay_info;
DROP POLICY IF EXISTS "pay_info: manager manages own company"  ON pay_info;
DROP POLICY IF EXISTS "pay_info: service role manages all"     ON pay_info;

-- 어드민: 전체 조회
CREATE POLICY "pay_info: admin sees all"
  ON pay_info FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 매니저: 본인 회사 급여만 조회
CREATE POLICY "pay_info: manager sees own company"
  ON pay_info FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'manager'
        AND p.company_id = pay_info.company_id
    )
  );

-- 직원: 본인 급여만 조회 (employees.user_id 기준)
CREATE POLICY "pay_info: employee sees self"
  ON pay_info FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = pay_info.employee_id
        AND e.user_id = auth.uid()
    )
  );

-- 어드민: 전체 INSERT/UPDATE/DELETE
CREATE POLICY "pay_info: admin manages all"
  ON pay_info FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 매니저: 본인 회사 급여 INSERT/UPDATE
CREATE POLICY "pay_info: manager manages own company"
  ON pay_info FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'manager'
        AND p.company_id = pay_info.company_id
    )
  );

-- service_role: 전체 관리 (CSV 업로드 등 서버 액션용)
CREATE POLICY "pay_info: service role manages all"
  ON pay_info FOR ALL
  USING (auth.role() = 'service_role');

-- ── 3. 인덱스 추가 (조회 성능) ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employees_company_id     ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_email          ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_employee_number ON employees(employee_number);
CREATE INDEX IF NOT EXISTS idx_employees_is_active      ON employees(is_active);

CREATE INDEX IF NOT EXISTS idx_pay_info_company_id      ON pay_info(company_id);
CREATE INDEX IF NOT EXISTS idx_pay_info_employee_id     ON pay_info(employee_id);
CREATE INDEX IF NOT EXISTS idx_pay_info_accrual_month   ON pay_info(accrual_month);
CREATE INDEX IF NOT EXISTS idx_pay_info_company_month   ON pay_info(company_id, accrual_month);
