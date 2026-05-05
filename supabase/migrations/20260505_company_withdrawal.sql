-- ================================================================
-- 회사 탈퇴신청 기능
-- ================================================================

-- 1. companies.status 에 'withdrawn' 추가
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_status_check;
ALTER TABLE companies ADD CONSTRAINT companies_status_check
  CHECK (status IN ('active', 'inactive', 'withdrawn'));

-- 2. companies 에 withdrawn_at 컬럼 추가
ALTER TABLE companies ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;

-- 3. 탈퇴신청 테이블 생성
CREATE TABLE IF NOT EXISTS company_withdrawal_requests (
  id               BIGSERIAL PRIMARY KEY,
  company_id       BIGINT       NOT NULL REFERENCES companies(id),
  requested_by     UUID         NOT NULL REFERENCES profiles(id),
  status           TEXT         NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
  note             TEXT,
  data_downloaded  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID         REFERENCES profiles(id)
);

-- 4. RLS
ALTER TABLE company_withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- 매니저: 자신의 회사 신청 삽입
CREATE POLICY "manager_insert_withdrawal_request"
  ON company_withdrawal_requests FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- 매니저/직원: 자신의 회사 신청 조회
CREATE POLICY "member_select_withdrawal_request"
  ON company_withdrawal_requests FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 어드민: 전체 CRUD
CREATE POLICY "admin_all_withdrawal_requests"
  ON company_withdrawal_requests FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
