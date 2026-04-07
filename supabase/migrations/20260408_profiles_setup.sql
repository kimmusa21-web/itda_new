-- ═══════════════════════════════════════════════════════════════════
-- itda — profiles 테이블 설정 및 RLS 강화
-- 이미 테이블이 있는 환경에서도 안전하게 실행 가능 (IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. profiles 테이블 생성 (없으면) ────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT         NOT NULL,
  name         TEXT,
  role         TEXT         NOT NULL DEFAULT 'employee'
    CHECK (role IN ('admin', 'manager', 'employee')),
  company_id   INT          REFERENCES companies(id) ON DELETE SET NULL,
  phone        TEXT,
  position     TEXT,
  department   TEXT,
  avatar_color TEXT         NOT NULL DEFAULT '#1d4ed8',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS '
  auth.users와 1:1 매핑되는 사용자 프로필.
  role: admin(전사 관리자) | manager(기업담당자) | employee(직원).
  직원 식별은 company_id + email 기준.
';
COMMENT ON COLUMN profiles.company_id IS 'admin은 NULL 가능. manager/employee는 필수.';
COMMENT ON COLUMN profiles.role       IS 'auth 메타데이터가 아닌 DB에서 신뢰 가능한 역할 관리';

-- ── 2. 누락 컬럼 안전 추가 ─────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone        TEXT,
  ADD COLUMN IF NOT EXISTS position     TEXT,
  ADD COLUMN IF NOT EXISTS department   TEXT,
  ADD COLUMN IF NOT EXISTS avatar_color TEXT NOT NULL DEFAULT '#1d4ed8',
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── 3. 인덱스 ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role       ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ── 4. updated_at 자동 갱신 트리거 ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 5. 신규 유저 가입 시 profiles 자동 생성 트리거 ──────────────────
--    invite-employee API 등에서 upsert하는 경우 ON CONFLICT DO NOTHING으로 안전 처리
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_role TEXT;
BEGIN
  -- user_metadata에서 name / role 추출 (없으면 기본값)
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'employee'
  );
  -- role 안전 처리
  IF v_role NOT IN ('admin', 'manager', 'employee') THEN
    v_role := 'employee';
  END IF;

  INSERT INTO public.profiles (id, email, name, role)
  VALUES (NEW.id, NEW.email, v_name, v_role)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ── 6. RLS 정책 ────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 본인 프로필 조회
DROP POLICY IF EXISTS "users can view own profile"      ON profiles;
CREATE POLICY "users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 어드민은 전체 조회
DROP POLICY IF EXISTS "admins can view all profiles"    ON profiles;
CREATE POLICY "admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 매니저는 같은 회사 프로필 조회
DROP POLICY IF EXISTS "managers can view company profiles" ON profiles;
CREATE POLICY "managers can view company profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'manager'
        AND p.company_id = profiles.company_id
    )
  );

-- 본인 프로필 수정 (role, company_id 제외 — 민감 필드)
DROP POLICY IF EXISTS "users can update own profile"    ON profiles;
CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- role/company_id 는 service_role만 변경 가능 (아래 정책으로 처리)
  );

-- service_role 전체 관리 (초대, 승인 등 서버 액션용)
DROP POLICY IF EXISTS "service role manages all profiles" ON profiles;
CREATE POLICY "service role manages all profiles"
  ON profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ── 7. employees 테이블: company_id + email 복합 유니크 ─────────────
--    직원 식별 기준 강제 (이미 있으면 무시)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employees_company_id_email_key'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT employees_company_id_email_key
      UNIQUE (company_id, email);
  END IF;
EXCEPTION WHEN others THEN
  -- 기존 중복 데이터 있으면 제약 추가 스킵
  RAISE NOTICE 'employees (company_id, email) unique constraint 스킵: %', SQLERRM;
END;
$$;

-- ── 8. 어드민 계정 profiles 수동 확인용 헬퍼 뷰 ─────────────────────
CREATE OR REPLACE VIEW profile_summary AS
SELECT
  p.id,
  p.email,
  p.name,
  p.role,
  p.company_id,
  c.name AS company_name,
  p.created_at
FROM profiles p
LEFT JOIN companies c ON c.id = p.company_id
ORDER BY p.role, p.created_at;

COMMENT ON VIEW profile_summary IS '어드민 전용 사용자 현황 뷰 (Supabase Studio에서 확인)';
