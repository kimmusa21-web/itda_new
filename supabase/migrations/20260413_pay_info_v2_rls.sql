-- ================================================================
-- pay_info_v2 RLS 정책 + 인덱스
-- pay_info 와 동일한 접근 규칙 적용
-- ================================================================

-- ── 인덱스 ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pay_info_v2_company_id    ON pay_info_v2 (company_id);
CREATE INDEX IF NOT EXISTS idx_pay_info_v2_employee_id   ON pay_info_v2 (employee_id);
CREATE INDEX IF NOT EXISTS idx_pay_info_v2_accrual_month ON pay_info_v2 (accrual_month);
CREATE INDEX IF NOT EXISTS idx_pay_info_v2_company_month ON pay_info_v2 (company_id, accrual_month);

-- ── RLS 활성화 ──────────────────────────────────────────────────
ALTER TABLE pay_info_v2 ENABLE ROW LEVEL SECURITY;

-- ── 기존 정책 삭제 (재실행 안전) ────────────────────────────────
DROP POLICY IF EXISTS "pay_info_v2_admin_all"        ON pay_info_v2;
DROP POLICY IF EXISTS "pay_info_v2_manager_company"  ON pay_info_v2;
DROP POLICY IF EXISTS "pay_info_v2_employee_self"    ON pay_info_v2;

-- ── admin: 전체 접근 ────────────────────────────────────────────
CREATE POLICY "pay_info_v2_admin_all"
  ON pay_info_v2
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id   = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ── manager: 자사 직원만 접근 ────────────────────────────────────
CREATE POLICY "pay_info_v2_manager_company"
  ON pay_info_v2
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id         = auth.uid()
        AND profiles.role       = 'manager'
        AND profiles.company_id = pay_info_v2.company_id
    )
  );

-- ── employee: 본인 데이터만 조회 ─────────────────────────────────
CREATE POLICY "pay_info_v2_employee_self"
  ON pay_info_v2
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id      = pay_info_v2.employee_id
        AND employees.user_id = auth.uid()
    )
  );
