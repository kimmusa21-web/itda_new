-- ═══════════════════════════════════════════════════════════════════
-- itda — RLS Phase 2: 전체 보안 강화
--
-- 변경 목적:
--   1. SECURITY DEFINER helper 함수 도입
--      → profiles 재귀 쿼리 버그 수정 + 정책 성능 개선
--   2. 기존 정책을 helper 함수 기반으로 교체
--   3. pay_info_v2 RLS 신규 적용 (치명적 보안 갭)
--   4. employee_requests / companies / company_admin_requests
--      column_mappings / upload_logs RLS 신규 적용
--   5. profiles.role + company_id 변조 방지 트리거
--   6. employee_verification_codes admin 접근 패치
--
-- 실행 전 확인:
--   - Supabase SQL Editor 또는 CLI (supabase db push)
--   - IF NOT EXISTS / DROP POLICY IF EXISTS 사용으로 멱등성 보장
--   - 기존 RLS가 이미 적용된 테이블은 안전하게 교체
-- ═══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- SECTION 1. SECURITY DEFINER Helper 함수
--
-- 목적: profiles 테이블 RLS 정책 내에서 profiles를 다시 쿼리하면
--       PostgreSQL RLS 재귀 문제가 발생할 수 있고,
--       employees/pay_info 정책에서도 매 행마다 profiles 서브쿼리가
--       실행되어 성능이 저하됩니다.
--
--       SECURITY DEFINER 함수는 함수 소유자(postgres) 권한으로
--       실행되므로 RLS 를 우회해 profiles를 직접 읽습니다.
--       auth.uid() 기준 '현재 로그인한 사용자 자신의' role/company_id만
--       조회하므로 보안상 안전합니다.
--
-- SECURITY DEFINER 사용 시 주의:
--   ① SET search_path = public, auth — 경로 인젝션 방지 필수
--   ② 함수 내부에서 auth.uid()를 사용해 현재 세션에만 한정
--   ③ STABLE — 같은 트랜잭션 내 결과 캐시 허용 (성능)
--   ④ 이 함수 자체에는 GRANT 별도 불필요 (RLS policy에서 사용)
-- ──────────────────────────────────────────────────────────────────

-- 현재 사용자의 role 반환 (NULL = 미인증)
CREATE OR REPLACE FUNCTION auth_user_role()
  RETURNS TEXT
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, auth
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- 현재 사용자의 company_id 반환 (NULL = admin 또는 미인증)
CREATE OR REPLACE FUNCTION auth_user_company_id()
  RETURNS INT
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, auth
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$;

-- 현재 사용자가 admin인가 (미인증 → false)
CREATE OR REPLACE FUNCTION is_admin()
  RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- 현재 사용자가 manager인가
CREATE OR REPLACE FUNCTION is_manager()
  RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'manager'
  )
$$;

-- 현재 사용자가 employee인가
CREATE OR REPLACE FUNCTION is_employee()
  RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'employee'
  )
$$;

COMMENT ON FUNCTION auth_user_role      IS 'SECURITY DEFINER: profiles 재귀 없이 현재 사용자 role 조회';
COMMENT ON FUNCTION auth_user_company_id IS 'SECURITY DEFINER: profiles 재귀 없이 현재 사용자 company_id 조회';
COMMENT ON FUNCTION is_admin            IS 'RLS 정책용 shorthand — admin 여부';
COMMENT ON FUNCTION is_manager          IS 'RLS 정책용 shorthand — manager 여부';
COMMENT ON FUNCTION is_employee         IS 'RLS 정책용 shorthand — employee 여부';


-- ──────────────────────────────────────────────────────────────────
-- SECTION 2. profiles 정책 교체 (재귀 쿼리 제거)
-- ──────────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 기존 재귀 정책 제거 후 helper 함수 기반으로 재작성
DROP POLICY IF EXISTS "users can view own profile"          ON profiles;
DROP POLICY IF EXISTS "admins can view all profiles"        ON profiles;
DROP POLICY IF EXISTS "managers can view company profiles"  ON profiles;
DROP POLICY IF EXISTS "users can update own profile"        ON profiles;
DROP POLICY IF EXISTS "service role manages all profiles"   ON profiles;

-- 본인 프로필 조회 (모든 인증 사용자)
CREATE POLICY "profiles: self select"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- admin: 전체 조회 (is_admin() → SECURITY DEFINER → 재귀 없음)
CREATE POLICY "profiles: admin select all"
  ON profiles FOR SELECT
  USING (is_admin());

-- manager: 같은 회사 프로필 조회
CREATE POLICY "profiles: manager select company"
  ON profiles FOR SELECT
  USING (
    is_manager()
    AND auth_user_company_id() = profiles.company_id
  );

-- 본인 프로필 수정 (role, company_id는 트리거로 보호 — Section 3 참고)
CREATE POLICY "profiles: self update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- service_role: 전체 관리 (초대, 승인, 역할 변경 등)
CREATE POLICY "profiles: service role all"
  ON profiles FOR ALL
  USING (auth.role() = 'service_role');


-- ──────────────────────────────────────────────────────────────────
-- SECTION 3. profiles.role / company_id 변조 방지 트리거
--
-- 문제: profiles UPDATE 정책에서 WITH CHECK (auth.uid() = id)만으로는
--       로그인한 사용자가 자신의 role을 'admin'으로 바꾸는 것을 막을 수 없음.
-- 해결: BEFORE UPDATE 트리거로 JWT role이 'service_role'이 아닌 경우
--       role, company_id를 OLD 값으로 강제 복원 (silently revert).
--
-- 동작:
--   - JWT role = 'authenticated' (일반 로그인) → role/company_id 변경 무시
--   - JWT role = 'service_role'               → 변경 허용
--   - JWT 컨텍스트 없음 (마이그레이션/DB 직접 접속) → 변경 허용
-- ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION profiles_protect_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_jwt_role TEXT;
BEGIN
  -- JWT 역할 읽기 (오류 시 NULL — 마이그레이션 등 비 HTTP 컨텍스트)
  BEGIN
    v_jwt_role := (
      current_setting('request.jwt.claims', true)::jsonb ->> 'role'
    );
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;

  -- service_role 또는 DB 직접 접속(NULL)은 변경 허용
  IF v_jwt_role IS NULL OR v_jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 일반 인증 사용자: role / company_id 강제 복원
  NEW.role       := OLD.role;
  NEW.company_id := OLD.company_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_sensitive ON profiles;
CREATE TRIGGER profiles_protect_sensitive
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION profiles_protect_sensitive_fields();

COMMENT ON FUNCTION profiles_protect_sensitive_fields IS
  'role/company_id를 일반 사용자가 직접 변경하지 못하도록 강제 복원.
   service_role 또는 직접 DB 접속만 허용.';


-- ──────────────────────────────────────────────────────────────────
-- SECTION 4. employees 정책 교체 (helper 함수 기반)
-- ──────────────────────────────────────────────────────────────────

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees: admin sees all"               ON employees;
DROP POLICY IF EXISTS "employees: manager sees own company"     ON employees;
DROP POLICY IF EXISTS "employees: employee sees self"           ON employees;
DROP POLICY IF EXISTS "employees: admin manages all"            ON employees;
DROP POLICY IF EXISTS "employees: manager manages own company"  ON employees;
DROP POLICY IF EXISTS "employees: service role manages all"     ON employees;

-- admin: 전체 조회
CREATE POLICY "employees: admin select all"
  ON employees FOR SELECT
  USING (is_admin());

-- manager: 본인 회사 직원만 조회
CREATE POLICY "employees: manager select own company"
  ON employees FOR SELECT
  USING (
    is_manager()
    AND auth_user_company_id() = employees.company_id
  );

-- employee: 본인 레코드만 조회 (user_id 기준)
--   → user_id는 invite 수락 후 설정됨 (미링크 직원은 조회 불가 — 의도적)
CREATE POLICY "employees: employee select self"
  ON employees FOR SELECT
  USING (employees.user_id = auth.uid());

-- admin: 전체 쓰기
CREATE POLICY "employees: admin all"
  ON employees FOR ALL
  USING (is_admin());

-- manager: 본인 회사 직원 INSERT/UPDATE
--   (DELETE는 admin만 — manager는 퇴사 처리 정도만 허용)
CREATE POLICY "employees: manager insert update own company"
  ON employees FOR INSERT
  WITH CHECK (
    is_manager()
    AND auth_user_company_id() = employees.company_id
  );

CREATE POLICY "employees: manager update own company"
  ON employees FOR UPDATE
  USING (
    is_manager()
    AND auth_user_company_id() = employees.company_id
  );

-- service_role: 전체 관리 (초대/인증/bulk upload API)
CREATE POLICY "employees: service role all"
  ON employees FOR ALL
  USING (auth.role() = 'service_role');


-- ──────────────────────────────────────────────────────────────────
-- SECTION 5. pay_info 정책 교체 (helper 함수 기반)
-- ──────────────────────────────────────────────────────────────────

ALTER TABLE pay_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pay_info: admin sees all"               ON pay_info;
DROP POLICY IF EXISTS "pay_info: manager sees own company"     ON pay_info;
DROP POLICY IF EXISTS "pay_info: employee sees self"           ON pay_info;
DROP POLICY IF EXISTS "pay_info: admin manages all"            ON pay_info;
DROP POLICY IF EXISTS "pay_info: manager manages own company"  ON pay_info;
DROP POLICY IF EXISTS "pay_info: service role manages all"     ON pay_info;

-- admin: 전체 조회
CREATE POLICY "pay_info: admin select all"
  ON pay_info FOR SELECT
  USING (is_admin());

-- manager: 본인 회사 급여만 조회
CREATE POLICY "pay_info: manager select own company"
  ON pay_info FOR SELECT
  USING (
    is_manager()
    AND auth_user_company_id() = pay_info.company_id
  );

-- employee: 본인 급여만 (employees.user_id 경유)
CREATE POLICY "pay_info: employee select self"
  ON pay_info FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = pay_info.employee_id
        AND e.user_id = auth.uid()
    )
  );

-- admin: 전체 쓰기
CREATE POLICY "pay_info: admin all"
  ON pay_info FOR ALL
  USING (is_admin());

-- manager: 본인 회사 급여 INSERT/UPDATE (CSV 업로드 경유)
CREATE POLICY "pay_info: manager insert update own company"
  ON pay_info FOR INSERT
  WITH CHECK (
    is_manager()
    AND auth_user_company_id() = pay_info.company_id
  );

CREATE POLICY "pay_info: manager update own company"
  ON pay_info FOR UPDATE
  USING (
    is_manager()
    AND auth_user_company_id() = pay_info.company_id
  );

-- service_role: 전체 관리 (CSV 업로드, 이메일 발송 서버 액션)
CREATE POLICY "pay_info: service role all"
  ON pay_info FOR ALL
  USING (auth.role() = 'service_role');


-- ──────────────────────────────────────────────────────────────────
-- SECTION 6. pay_info_v2 RLS (신규 — 치명적 보안 갭 수정)
--
-- pay_info_v2는 현재 실제 급여 데이터 저장에 사용되는 테이블로,
-- earnings/deductions JSONB 구조를 가짐.
-- 기존 마이그레이션에서 pay_info (레거시) 만 RLS 적용되고
-- pay_info_v2는 완전히 누락된 상태 — 인증된 모든 사용자가 전체 조회 가능.
-- ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- pay_info_v2 테이블이 존재하는 경우만 RLS 적용
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pay_info_v2'
  ) THEN

    -- RLS 활성화
    ALTER TABLE pay_info_v2 ENABLE ROW LEVEL SECURITY;

    -- 기존 정책 초기화 (재실행 안전)
    DROP POLICY IF EXISTS "pay_info_v2: admin select all"                ON pay_info_v2;
    DROP POLICY IF EXISTS "pay_info_v2: manager select own company"      ON pay_info_v2;
    DROP POLICY IF EXISTS "pay_info_v2: employee select self"            ON pay_info_v2;
    DROP POLICY IF EXISTS "pay_info_v2: admin all"                       ON pay_info_v2;
    DROP POLICY IF EXISTS "pay_info_v2: manager insert update own company" ON pay_info_v2;
    DROP POLICY IF EXISTS "pay_info_v2: manager update own company"      ON pay_info_v2;
    DROP POLICY IF EXISTS "pay_info_v2: service role all"                ON pay_info_v2;

    -- admin: 전체 조회
    EXECUTE $pol$
      CREATE POLICY "pay_info_v2: admin select all"
        ON pay_info_v2 FOR SELECT
        USING (is_admin())
    $pol$;

    -- manager: 본인 회사 급여만 조회
    EXECUTE $pol$
      CREATE POLICY "pay_info_v2: manager select own company"
        ON pay_info_v2 FOR SELECT
        USING (
          is_manager()
          AND auth_user_company_id() = pay_info_v2.company_id
        )
    $pol$;

    -- employee: 본인 급여만 (employees.user_id 경유)
    EXECUTE $pol$
      CREATE POLICY "pay_info_v2: employee select self"
        ON pay_info_v2 FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = pay_info_v2.employee_id
              AND e.user_id = auth.uid()
          )
        )
    $pol$;

    -- admin: 전체 쓰기
    EXECUTE $pol$
      CREATE POLICY "pay_info_v2: admin all"
        ON pay_info_v2 FOR ALL
        USING (is_admin())
    $pol$;

    -- manager: 본인 회사 급여 INSERT (CSV 업로드)
    EXECUTE $pol$
      CREATE POLICY "pay_info_v2: manager insert own company"
        ON pay_info_v2 FOR INSERT
        WITH CHECK (
          is_manager()
          AND auth_user_company_id() = pay_info_v2.company_id
        )
    $pol$;

    -- manager: 본인 회사 급여 UPDATE (덮어쓰기)
    EXECUTE $pol$
      CREATE POLICY "pay_info_v2: manager update own company"
        ON pay_info_v2 FOR UPDATE
        USING (
          is_manager()
          AND auth_user_company_id() = pay_info_v2.company_id
        )
    $pol$;

    -- service_role: 전체 관리 (CSV upsert, 이메일 발송)
    EXECUTE $pol$
      CREATE POLICY "pay_info_v2: service role all"
        ON pay_info_v2 FOR ALL
        USING (auth.role() = 'service_role')
    $pol$;

    -- 성능 인덱스 (없으면 추가)
    CREATE INDEX IF NOT EXISTS idx_pay_info_v2_company_id    ON pay_info_v2(company_id);
    CREATE INDEX IF NOT EXISTS idx_pay_info_v2_employee_id   ON pay_info_v2(employee_id);
    CREATE INDEX IF NOT EXISTS idx_pay_info_v2_accrual_month ON pay_info_v2(accrual_month);
    CREATE INDEX IF NOT EXISTS idx_pay_info_v2_company_month ON pay_info_v2(company_id, accrual_month);

    RAISE NOTICE 'pay_info_v2 RLS 정책 적용 완료';
  ELSE
    RAISE NOTICE 'pay_info_v2 테이블 없음 — 스킵';
  END IF;
END;
$$;


-- ──────────────────────────────────────────────────────────────────
-- SECTION 7. employee_requests RLS (신규)
--
-- 접근 권한:
--   manager : 본인 회사 요청 SELECT + INSERT
--   admin   : 전체 SELECT + UPDATE(승인/반려) + DELETE
--   employee: 접근 불가 (RLS 활성화 시 기본 차단)
-- ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'employee_requests'
  ) THEN
    ALTER TABLE employee_requests ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "employee_requests: admin select all"          ON employee_requests;
    DROP POLICY IF EXISTS "employee_requests: admin all"                 ON employee_requests;
    DROP POLICY IF EXISTS "employee_requests: manager select own"        ON employee_requests;
    DROP POLICY IF EXISTS "employee_requests: manager insert own"        ON employee_requests;
    DROP POLICY IF EXISTS "employee_requests: service role all"          ON employee_requests;

    -- admin: 전체 조회 (신청 목록)
    EXECUTE $pol$
      CREATE POLICY "employee_requests: admin select all"
        ON employee_requests FOR SELECT
        USING (is_admin())
    $pol$;

    -- admin: 전체 관리 (승인 UPDATE, 삭제 DELETE 포함)
    EXECUTE $pol$
      CREATE POLICY "employee_requests: admin all"
        ON employee_requests FOR ALL
        USING (is_admin())
    $pol$;

    -- manager: 본인 회사 요청 조회
    EXECUTE $pol$
      CREATE POLICY "employee_requests: manager select own"
        ON employee_requests FOR SELECT
        USING (
          is_manager()
          AND auth_user_company_id() = employee_requests.company_id
        )
    $pol$;

    -- manager: 본인 회사 요청 INSERT (직원 등록 신청)
    EXECUTE $pol$
      CREATE POLICY "employee_requests: manager insert own"
        ON employee_requests FOR INSERT
        WITH CHECK (
          is_manager()
          AND auth_user_company_id() = employee_requests.company_id
        )
    $pol$;

    -- service_role: 전체 관리 (invite/verify API)
    EXECUTE $pol$
      CREATE POLICY "employee_requests: service role all"
        ON employee_requests FOR ALL
        USING (auth.role() = 'service_role')
    $pol$;

    CREATE INDEX IF NOT EXISTS idx_employee_requests_company_id
      ON employee_requests(company_id);
    CREATE INDEX IF NOT EXISTS idx_employee_requests_status
      ON employee_requests(status);

    RAISE NOTICE 'employee_requests RLS 정책 적용 완료';
  ELSE
    RAISE NOTICE 'employee_requests 테이블 없음 — 스킵';
  END IF;
END;
$$;


-- ──────────────────────────────────────────────────────────────────
-- SECTION 8. companies RLS (신규)
--
-- 접근 권한:
--   admin   : 전체 CRUD
--   manager : 본인 회사 1개만 SELECT
--   employee: 본인 회사 1개만 SELECT (급여명세서 회사명 표시용)
--   anon    : 접근 불가
--
-- 주의: companies에 JOIN되는 쿼리 (pay_info_v2 → employees → companies)도
--       RLS 정책이 적용되므로 각 역할이 자신의 범위만 볼 수 있음.
-- ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) THEN
    ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "companies: admin all"            ON companies;
    DROP POLICY IF EXISTS "companies: manager select own"   ON companies;
    DROP POLICY IF EXISTS "companies: employee select own"  ON companies;
    DROP POLICY IF EXISTS "companies: service role all"     ON companies;

    -- admin: 전체 CRUD
    EXECUTE $pol$
      CREATE POLICY "companies: admin all"
        ON companies FOR ALL
        USING (is_admin())
    $pol$;

    -- manager: 본인 회사만 SELECT
    EXECUTE $pol$
      CREATE POLICY "companies: manager select own"
        ON companies FOR SELECT
        USING (
          is_manager()
          AND id = auth_user_company_id()
        )
    $pol$;

    -- employee: 본인 회사만 SELECT (급여명세서 company name 표시)
    EXECUTE $pol$
      CREATE POLICY "companies: employee select own"
        ON companies FOR SELECT
        USING (
          is_employee()
          AND id = auth_user_company_id()
        )
    $pol$;

    -- service_role: 전체 관리
    EXECUTE $pol$
      CREATE POLICY "companies: service role all"
        ON companies FOR ALL
        USING (auth.role() = 'service_role')
    $pol$;

    RAISE NOTICE 'companies RLS 정책 적용 완료';
  ELSE
    RAISE NOTICE 'companies 테이블 없음 — 스킵';
  END IF;
END;
$$;


-- ──────────────────────────────────────────────────────────────────
-- SECTION 9. company_admin_requests RLS (신규)
--
-- 접근 권한:
--   anon/authenticated: INSERT 허용 (로그인 화면에서 회사 가입신청)
--   admin: 전체 SELECT + 승인/반려 UPDATE
--   manager/employee: 접근 불가
-- ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'company_admin_requests'
  ) THEN
    ALTER TABLE company_admin_requests ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "company_admin_requests: public insert"    ON company_admin_requests;
    DROP POLICY IF EXISTS "company_admin_requests: admin select all" ON company_admin_requests;
    DROP POLICY IF EXISTS "company_admin_requests: admin all"        ON company_admin_requests;
    DROP POLICY IF EXISTS "company_admin_requests: service role all" ON company_admin_requests;

    -- 누구나 INSERT 가능 (로그인 페이지 회사 가입신청 폼)
    -- 가입신청은 민감 정보가 아니며 admin이 직접 검토함
    EXECUTE $pol$
      CREATE POLICY "company_admin_requests: public insert"
        ON company_admin_requests FOR INSERT
        WITH CHECK (true)
    $pol$;

    -- admin: 전체 SELECT (신청 목록 조회)
    EXECUTE $pol$
      CREATE POLICY "company_admin_requests: admin select all"
        ON company_admin_requests FOR SELECT
        USING (is_admin())
    $pol$;

    -- admin: 전체 관리 (승인/반려 UPDATE, 삭제)
    EXECUTE $pol$
      CREATE POLICY "company_admin_requests: admin all"
        ON company_admin_requests FOR ALL
        USING (is_admin())
    $pol$;

    -- service_role: 전체 관리 (approve-request API)
    EXECUTE $pol$
      CREATE POLICY "company_admin_requests: service role all"
        ON company_admin_requests FOR ALL
        USING (auth.role() = 'service_role')
    $pol$;

    RAISE NOTICE 'company_admin_requests RLS 정책 적용 완료';
  ELSE
    RAISE NOTICE 'company_admin_requests 테이블 없음 — 스킵';
  END IF;
END;
$$;


-- ──────────────────────────────────────────────────────────────────
-- SECTION 10. column_mappings RLS (신규)
--
-- 접근 권한:
--   admin   : 전체 CRUD (매핑 설정 관리)
--   manager : 본인 회사 매핑만 SELECT (CSV 업로드 시 필요)
--   employee: 접근 불가
-- ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'column_mappings'
  ) THEN
    ALTER TABLE column_mappings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "column_mappings: admin all"           ON column_mappings;
    DROP POLICY IF EXISTS "column_mappings: manager select own"  ON column_mappings;
    DROP POLICY IF EXISTS "column_mappings: service role all"    ON column_mappings;

    -- admin: 전체 CRUD
    EXECUTE $pol$
      CREATE POLICY "column_mappings: admin all"
        ON column_mappings FOR ALL
        USING (is_admin())
    $pol$;

    -- manager: 본인 회사 매핑만 SELECT
    EXECUTE $pol$
      CREATE POLICY "column_mappings: manager select own"
        ON column_mappings FOR SELECT
        USING (
          is_manager()
          AND auth_user_company_id() = column_mappings.company_id
        )
    $pol$;

    -- service_role: 전체 관리
    EXECUTE $pol$
      CREATE POLICY "column_mappings: service role all"
        ON column_mappings FOR ALL
        USING (auth.role() = 'service_role')
    $pol$;

    RAISE NOTICE 'column_mappings RLS 정책 적용 완료';
  ELSE
    RAISE NOTICE 'column_mappings 테이블 없음 — 스킵';
  END IF;
END;
$$;


-- ──────────────────────────────────────────────────────────────────
-- SECTION 11. upload_logs RLS (신규, 급여 업로드 이력)
--
-- 접근 권한:
--   admin   : 전체
--   manager : 본인 회사 이력 SELECT + INSERT (CSV 업로드 액션 경유)
--   employee: 접근 불가
-- ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'upload_logs'
  ) THEN
    ALTER TABLE upload_logs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "upload_logs: admin all"                ON upload_logs;
    DROP POLICY IF EXISTS "upload_logs: manager select own"       ON upload_logs;
    DROP POLICY IF EXISTS "upload_logs: manager insert own"       ON upload_logs;
    DROP POLICY IF EXISTS "upload_logs: manager update own"       ON upload_logs;
    DROP POLICY IF EXISTS "upload_logs: service role all"         ON upload_logs;

    -- admin: 전체
    EXECUTE $pol$
      CREATE POLICY "upload_logs: admin all"
        ON upload_logs FOR ALL
        USING (is_admin())
    $pol$;

    -- manager: 본인 회사 이력 SELECT
    EXECUTE $pol$
      CREATE POLICY "upload_logs: manager select own"
        ON upload_logs FOR SELECT
        USING (
          is_manager()
          AND auth_user_company_id() = upload_logs.company_id
        )
    $pol$;

    -- manager: 본인 회사 이력 INSERT (CSV 업로드 로그 기록)
    EXECUTE $pol$
      CREATE POLICY "upload_logs: manager insert own"
        ON upload_logs FOR INSERT
        WITH CHECK (
          is_manager()
          AND auth_user_company_id() = upload_logs.company_id
        )
    $pol$;

    -- manager: 본인 회사 이력 UPDATE (업로드 실패 시 status 수정)
    EXECUTE $pol$
      CREATE POLICY "upload_logs: manager update own"
        ON upload_logs FOR UPDATE
        USING (
          is_manager()
          AND auth_user_company_id() = upload_logs.company_id
        )
    $pol$;

    -- service_role: 전체
    EXECUTE $pol$
      CREATE POLICY "upload_logs: service role all"
        ON upload_logs FOR ALL
        USING (auth.role() = 'service_role')
    $pol$;

    CREATE INDEX IF NOT EXISTS idx_upload_logs_company_id
      ON upload_logs(company_id);
    CREATE INDEX IF NOT EXISTS idx_upload_logs_accrual_month
      ON upload_logs(accrual_month);

    RAISE NOTICE 'upload_logs RLS 정책 적용 완료';
  ELSE
    RAISE NOTICE 'upload_logs 테이블 없음 — 스킵';
  END IF;
END;
$$;


-- ──────────────────────────────────────────────────────────────────
-- SECTION 12. employee_verification_codes — admin 접근 패치
--
-- 기존 정책: service_role만 전체 관리
-- 문제: approveEmployeeRequest / rejectEmployeeRequest에서
--       createClient()(ANON KEY)로 verification_codes.update()를 호출.
--       현재 RLS로는 이 업데이트가 실패하는 버그 존재.
-- 해결: admin에게 UPDATE 권한 추가 (기존 미사용 코드 무효화 목적)
-- ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'employee_verification_codes'
  ) THEN
    DROP POLICY IF EXISTS "evc: admin update"  ON employee_verification_codes;

    EXECUTE $pol$
      CREATE POLICY "evc: admin update"
        ON employee_verification_codes FOR UPDATE
        USING (is_admin())
    $pol$;

    RAISE NOTICE 'employee_verification_codes admin UPDATE 정책 추가 완료';
  ELSE
    RAISE NOTICE 'employee_verification_codes 테이블 없음 — 스킵';
  END IF;
END;
$$;


-- ──────────────────────────────────────────────────────────────────
-- SECTION 13. notifications — admin 관리 정책 추가
--
-- 기존: 본인 알림 조회/수정 + service_role
-- 추가: admin이 알림 INSERT (신청 알림 발송), SELECT 전체
-- ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    DROP POLICY IF EXISTS "notifications: admin all"    ON notifications;

    EXECUTE $pol$
      CREATE POLICY "notifications: admin all"
        ON notifications FOR ALL
        USING (is_admin())
    $pol$;

    RAISE NOTICE 'notifications admin 정책 추가 완료';
  ELSE
    RAISE NOTICE 'notifications 테이블 없음 — 스킵';
  END IF;
END;
$$;


-- ──────────────────────────────────────────────────────────────────
-- SECTION 14. payroll_batches (선택적 — 레거시 테이블)
-- ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payroll_batches'
  ) THEN
    ALTER TABLE payroll_batches ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "payroll_batches: admin all"           ON payroll_batches;
    DROP POLICY IF EXISTS "payroll_batches: manager select own"  ON payroll_batches;
    DROP POLICY IF EXISTS "payroll_batches: service role all"    ON payroll_batches;

    EXECUTE $pol$
      CREATE POLICY "payroll_batches: admin all"
        ON payroll_batches FOR ALL
        USING (is_admin())
    $pol$;

    EXECUTE $pol$
      CREATE POLICY "payroll_batches: manager select own"
        ON payroll_batches FOR SELECT
        USING (
          is_manager()
          AND auth_user_company_id() = payroll_batches.company_id
        )
    $pol$;

    EXECUTE $pol$
      CREATE POLICY "payroll_batches: service role all"
        ON payroll_batches FOR ALL
        USING (auth.role() = 'service_role')
    $pol$;

    RAISE NOTICE 'payroll_batches RLS 정책 적용 완료';
  ELSE
    RAISE NOTICE 'payroll_batches 테이블 없음 — 스킵 (레거시)';
  END IF;
END;
$$;


-- ──────────────────────────────────────────────────────────────────
-- SECTION 15. 최종 검증 쿼리
--
-- 아래 쿼리들을 Supabase SQL Editor에서 직접 실행해 정책 상태 확인
-- ──────────────────────────────────────────────────────────────────

-- [검증 1] 현재 RLS 활성화 테이블 목록
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- [검증 2] 현재 적용된 모든 RLS 정책
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- [검증 3] helper 함수 존재 확인
-- SELECT proname, prosecdef
-- FROM pg_proc
-- WHERE proname IN ('is_admin','is_manager','is_employee','auth_user_role','auth_user_company_id')
--   AND pronamespace = 'public'::regnamespace;

-- [검증 4] employee 시나리오 — 본인 급여만 보이는지
-- (특정 employee UUID로 set_config 시뮬레이션)
-- SET LOCAL request.jwt.claims = '{"sub":"<employee-uuid>","role":"authenticated"}';
-- SET LOCAL role = authenticated;
-- SELECT count(*) FROM pay_info_v2; -- 본인 것만 나와야 함

-- [검증 5] 미인증 사용자 — 민감 데이터 접근 불가
-- SET LOCAL role = anon;
-- SELECT count(*) FROM pay_info_v2;  -- 0 rows
-- SELECT count(*) FROM employees;    -- 0 rows
-- SELECT count(*) FROM profiles;     -- 0 rows
