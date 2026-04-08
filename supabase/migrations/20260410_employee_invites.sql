-- ═══════════════════════════════════════════════════════════════════
-- itda — employee_invites: 링크 기반 직원 초대 테이블
--
-- 기존 OTP(employee_verification_codes) 방식을 보완하는 토큰 기반 초대.
-- 어드민이 직원 등록 신청을 승인하면 UUID 토큰이 생성되고
-- 이메일로 초대 링크가 발송됩니다.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS employee_invites (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           INTEGER     NOT NULL,
  employee_request_id  BIGINT      REFERENCES employee_requests(id) ON DELETE SET NULL,
  email                TEXT        NOT NULL,
  name                 TEXT        NOT NULL DEFAULT '',
  token                TEXT        NOT NULL UNIQUE,
  expires_at           TIMESTAMPTZ NOT NULL,
  used_at              TIMESTAMPTZ,          -- NULL=미사용, NOT NULL=가입완료
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE employee_invites IS '직원 이메일 초대 토큰. 어드민 승인 시 생성, 가입 완료 시 used_at 기록.';
COMMENT ON COLUMN employee_invites.token    IS 'crypto.randomUUID() 생성 토큰 — URL 쿼리파라미터로 전달';
COMMENT ON COLUMN employee_invites.used_at  IS 'NULL=미사용, NOT NULL=이미 사용됨(재사용 불가)';
COMMENT ON COLUMN employee_invites.expires_at IS '생성 후 24시간 유효';

CREATE INDEX IF NOT EXISTS idx_employee_invites_email ON employee_invites(email);
CREATE INDEX IF NOT EXISTS idx_employee_invites_token ON employee_invites(token);

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE employee_invites ENABLE ROW LEVEL SECURITY;

-- 어드민: 모든 초대 조회/생성
CREATE POLICY "admin_select_invites" ON employee_invites
  FOR SELECT USING (is_admin());

CREATE POLICY "admin_insert_invites" ON employee_invites
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "admin_update_invites" ON employee_invites
  FOR UPDATE USING (is_admin());
-- (used_at 업데이트는 service_role로 처리하므로 선택적)
