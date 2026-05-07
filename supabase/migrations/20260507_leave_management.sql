-- ================================================================
-- 연차휴가 관리 시스템
-- ================================================================

-- 1. 회사별 연차 정책
CREATE TABLE IF NOT EXISTS leave_policies (
  id                SERIAL PRIMARY KEY,
  company_id        INTEGER NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  basis             TEXT    NOT NULL CHECK (basis IN ('hire_date', 'fiscal_year')),
  allow_negative    BOOLEAN NOT NULL DEFAULT false,
  auto_approve      BOOLEAN NOT NULL DEFAULT false,
  settle_on_resign  BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 직원별 연차 잔액 (연도·기간별)
CREATE TABLE IF NOT EXISTS leave_balances (
  id            SERIAL PRIMARY KEY,
  company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id   INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  basis         TEXT    NOT NULL CHECK (basis IN ('hire_date', 'fiscal_year')),
  period        TEXT    NOT NULL,   -- 'YYYY' (연간) or 'YYYY-MM' (월차)
  period_type   TEXT    NOT NULL CHECK (period_type IN ('annual', 'monthly')),
  total_hours   NUMERIC(6,1) NOT NULL,
  used_hours    NUMERIC(6,1) NOT NULL DEFAULT 0,
  adj_hours     NUMERIC(6,1) NOT NULL DEFAULT 0,  -- 수동 조정 누계 (음수=차감)
  expires_at    DATE    NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, period, basis)
);

-- 3. 수동 조정 이력 (결근 차감 등)
CREATE TABLE IF NOT EXISTS leave_adjustments (
  id            SERIAL PRIMARY KEY,
  company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id   INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  balance_id    INTEGER NOT NULL REFERENCES leave_balances(id) ON DELETE CASCADE,
  hours         NUMERIC(5,1) NOT NULL,   -- 음수=차감, 양수=추가
  reason        TEXT    NOT NULL,
  adjusted_by   UUID    NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. 연차 신청 내역 (3년 보관)
CREATE TABLE IF NOT EXISTS leave_requests (
  id                SERIAL PRIMARY KEY,
  company_id        INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id       INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  balance_id        INTEGER REFERENCES leave_balances(id) ON DELETE SET NULL,
  leave_type        TEXT    NOT NULL CHECK (leave_type IN ('full_day', 'half_day_am', 'half_day_pm', 'hourly')),
  start_date        DATE    NOT NULL,
  end_date          DATE    NOT NULL,
  hours_requested   NUMERIC(5,1) NOT NULL,
  reason            TEXT,
  status            TEXT    NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  rejection_reason  TEXT,
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at       TIMESTAMPTZ,
  rejected_at       TIMESTAMPTZ,
  approved_by       UUID    REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee   ON leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_company    ON leave_balances(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee   ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_company    ON leave_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status     ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_adjustments_employee ON leave_adjustments(employee_id);

-- RLS 활성화
ALTER TABLE leave_policies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests    ENABLE ROW LEVEL SECURITY;

-- leave_policies RLS
CREATE POLICY "leave_policies_select" ON leave_policies FOR SELECT
  USING (
    company_id IN (
      SELECT e.company_id FROM employees e WHERE e.user_id = auth.uid() AND e.is_active = true
      UNION
      SELECT p.company_id FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('manager','admin')
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "leave_policies_write" ON leave_policies FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
  );

-- leave_balances RLS
CREATE POLICY "leave_balances_select" ON leave_balances FOR SELECT
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "leave_balances_write" ON leave_balances FOR ALL
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- leave_adjustments RLS
CREATE POLICY "leave_adjustments_select" ON leave_adjustments FOR SELECT
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "leave_adjustments_write" ON leave_adjustments FOR ALL
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- leave_requests RLS
CREATE POLICY "leave_requests_select" ON leave_requests FOR SELECT
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "leave_requests_insert" ON leave_requests FOR INSERT
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid() AND is_active = true)
    OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
  );

CREATE POLICY "leave_requests_update" ON leave_requests FOR UPDATE
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
