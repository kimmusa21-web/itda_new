/* ================================================================
   itda — 관리자 빙의 로그 테이블
   admin이 company_manager 또는 employee 모드로 점검할 때 기록
================================================================ */

CREATE TABLE IF NOT EXISTS impersonation_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL CHECK (type IN ('company_manager', 'employee')),
  company_id       INTEGER     NULL,
  company_name     TEXT        NULL,
  employee_id      INTEGER     NULL,
  employee_name    TEXT        NULL,
  employee_email   TEXT        NULL,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_impersonation_logs_admin
  ON impersonation_logs (admin_user_id, created_at DESC);

-- RLS 활성화
ALTER TABLE impersonation_logs ENABLE ROW LEVEL SECURITY;

-- admin 본인만 조회/삽입/수정 가능
CREATE POLICY "impersonation_logs_select" ON impersonation_logs
  FOR SELECT USING (admin_user_id = auth.uid());

CREATE POLICY "impersonation_logs_insert" ON impersonation_logs
  FOR INSERT WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "impersonation_logs_update" ON impersonation_logs
  FOR UPDATE USING (admin_user_id = auth.uid());
