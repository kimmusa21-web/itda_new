-- ═══════════════════════════════════════════════════════════════════
-- itda — 회사/직원 관리 기능 마이그레이션
-- 실행 환경: Supabase SQL Editor 또는 Supabase CLI
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. companies: 상태 및 연락처 컬럼 추가 ──────────────────────────
--    기존 컬럼(name, biz_number, representative 등)은 유지
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS status       TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  ADD COLUMN IF NOT EXISTS contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ;

COMMENT ON COLUMN companies.status       IS 'active=운영중, inactive=비활성(soft-delete)';
COMMENT ON COLUMN companies.contact_name  IS '담당자 이름';
COMMENT ON COLUMN companies.contact_email IS '담당자 이메일';
COMMENT ON COLUMN companies.deleted_at    IS 'NULL이면 삭제 안됨 (soft-delete)';

-- ── 2. notifications: 알림 테이블 (신규) ────────────────────────────
--    admin에게 새 직원 신청 알림, manager에게 승인/반려 알림
CREATE TABLE IF NOT EXISTS notifications (
  id         BIGSERIAL    PRIMARY KEY,
  user_id    UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT         NOT NULL,  -- 'new_employee_request' | 'request_approved' | 'request_rejected'
  title      TEXT         NOT NULL,
  message    TEXT,
  target_id  TEXT,                   -- 관련 레코드 ID (request_id 등)
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id, is_read)
  WHERE NOT is_read;

-- ── 3. employee_verification_codes: 인증번호 (신규) ─────────────────
--    admin 승인 후 직원 이메일로 발송되는 6자리 OTP 해시 저장
CREATE TABLE IF NOT EXISTS employee_verification_codes (
  id          BIGSERIAL    PRIMARY KEY,
  request_id  BIGINT       NOT NULL REFERENCES employee_requests(id) ON DELETE CASCADE,
  email       TEXT         NOT NULL,
  code_hash   TEXT         NOT NULL,    -- SHA-256 해시로 저장 (평문 저장 금지)
  expires_at  TIMESTAMPTZ  NOT NULL,
  verified_at TIMESTAMPTZ,              -- NULL = 미인증, NOT NULL = 인증 완료
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evc_email      ON employee_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_evc_request_id ON employee_verification_codes(request_id);

COMMENT ON COLUMN employee_verification_codes.code_hash
  IS 'SHA-256(code) — 원본 코드는 절대 저장하지 않음';
COMMENT ON COLUMN employee_verification_codes.verified_at
  IS 'NULL=미사용, NOT NULL=인증 완료(재사용 불가)';

-- ── 4. RLS 정책 ──────────────────────────────────────────────────────

-- notifications: 본인 알림만 읽기 가능
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can view own notifications" ON notifications;
CREATE POLICY "users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can update own notifications" ON notifications;
CREATE POLICY "users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service role can manage notifications" ON notifications;
CREATE POLICY "service role can manage notifications"
  ON notifications FOR ALL
  USING (auth.role() = 'service_role');

-- employee_verification_codes: service_role만 전체 관리
-- (공개 검증은 API route에서 service_role key로 처리)
ALTER TABLE employee_verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role manages verification codes" ON employee_verification_codes;
CREATE POLICY "service role manages verification codes"
  ON employee_verification_codes FOR ALL
  USING (auth.role() = 'service_role');

-- ── 5. 기존 employee_requests 컬럼 확인 (이미 있으면 무시) ───────────
--    types/employee-request.ts 기준: requested_by, reviewed_by,
--    reviewed_at, reject_reason, employee_id 이미 있어야 함
--    혹시 없는 경우를 대비한 안전 추가
ALTER TABLE employee_requests
  ADD COLUMN IF NOT EXISTS requested_by  UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_by   UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reject_reason TEXT,
  ADD COLUMN IF NOT EXISTS employee_id   BIGINT REFERENCES employees(id);
