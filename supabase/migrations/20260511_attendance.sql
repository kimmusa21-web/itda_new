-- ================================================================
-- itda — GPS 기반 출퇴근 관리 마이그레이션
-- ================================================================

-- ── 1. companies: 위치 컬럼 추가 ──────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS latitude          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude         DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS allowed_radius_m  INTEGER DEFAULT 100;

-- ── 2. attendance_logs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_logs (
  id                    BIGSERIAL        PRIMARY KEY,
  company_id            BIGINT           NOT NULL REFERENCES companies(id)  ON DELETE CASCADE,
  employee_id           BIGINT           NOT NULL REFERENCES employees(id)  ON DELETE CASCADE,
  work_date             DATE             NOT NULL,
  work_type             TEXT             NOT NULL
                          CHECK (work_type IN ('office', 'field', 'remote')),
  work_note             TEXT,
  check_in_at           TIMESTAMPTZ,
  check_out_at          TIMESTAMPTZ,
  check_in_latitude     DOUBLE PRECISION,
  check_in_longitude    DOUBLE PRECISION,
  check_out_latitude    DOUBLE PRECISION,
  check_out_longitude   DOUBLE PRECISION,
  check_in_distance_m   INTEGER,
  check_out_distance_m  INTEGER,
  check_in_accuracy_m   DOUBLE PRECISION,
  check_out_accuracy_m  DOUBLE PRECISION,
  status                TEXT             NOT NULL DEFAULT 'not_started'
                          CHECK (status IN ('not_started', 'checked_in', 'checked_out')),
  is_late_entry         BOOLEAN          NOT NULL DEFAULT false,
  late_entry_note       TEXT,
  is_impersonated       BOOLEAN          NOT NULL DEFAULT false,
  entered_by_user_id    UUID             REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ      DEFAULT NOW(),
  updated_at            TIMESTAMPTZ      DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS attendance_logs_employee_date_unique
  ON attendance_logs(employee_id, work_date);

CREATE INDEX IF NOT EXISTS attendance_logs_company_date_idx
  ON attendance_logs(company_id, work_date);

CREATE TRIGGER set_attendance_logs_updated_at
  BEFORE UPDATE ON attendance_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 3. attendance_settings ────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_settings (
  company_id            BIGINT      PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  notify_late_entry     BOOLEAN     NOT NULL DEFAULT true,
  notify_late_modified  BOOLEAN     NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_attendance_settings_updated_at
  BEFORE UPDATE ON attendance_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 4. RLS ───────────────────────────────────────────────────
ALTER TABLE attendance_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_settings ENABLE ROW LEVEL SECURITY;

-- employee: 본인 기록
CREATE POLICY "attendance_logs: employee 본인" ON attendance_logs
  FOR ALL TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- manager: 본인 회사 조회
CREATE POLICY "attendance_logs: manager 조회" ON attendance_logs
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- admin: 전체
CREATE POLICY "attendance_logs: admin 전체" ON attendance_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- attendance_settings: manager/admin
CREATE POLICY "attendance_settings: manager/admin" ON attendance_settings
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );
