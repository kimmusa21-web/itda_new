-- ═══════════════════════════════════════════════════════════════════
-- itda — 매니저 직접 초대 플로우 지원
--
-- 1. employee_invites에 employee_id, invited_by 컬럼 추가
-- 2. manager가 자기 회사 invites INSERT/SELECT/UPDATE 가능하도록 RLS 추가
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. employee_invites 컬럼 추가 ───────────────────────────────────
ALTER TABLE employee_invites
  ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS invited_by  UUID;

CREATE INDEX IF NOT EXISTS idx_employee_invites_employee_id
  ON employee_invites(employee_id);

-- ── 2. manager RLS 정책 추가 ─────────────────────────────────────────
-- manager: 본인 회사의 invites 조회 허용
CREATE POLICY "manager_select_invites" ON employee_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'manager'
        AND company_id = employee_invites.company_id
    )
  );

-- manager: 본인 회사에 초대 생성 허용
CREATE POLICY "manager_insert_invites" ON employee_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'manager'
        AND company_id = employee_invites.company_id
    )
  );

-- manager: 본인 회사 초대 만료 처리(used_at 업데이트) 허용
CREATE POLICY "manager_update_invites" ON employee_invites
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'manager'
        AND company_id = employee_invites.company_id
    )
  );
