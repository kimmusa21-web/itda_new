-- ═══════════════════════════════════════════════════════════════════
-- itda — RLS 검증 쿼리 모음
-- 실행: Supabase SQL Editor에서 개별 쿼리 실행
-- 주의: SET LOCAL은 트랜잭션 내에서만 유효. BEGIN/ROLLBACK으로 감싸야 안전.
-- ═══════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════
-- [CHECK 1] RLS 활성화 상태 전체 확인
-- ════════════════════════════════════════════════
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'employees', 'pay_info', 'pay_info_v2',
    'companies', 'employee_requests', 'company_admin_requests',
    'column_mappings', 'upload_logs', 'notifications',
    'employee_verification_codes', 'employee_upload_logs',
    'payroll_batches'
  )
ORDER BY tablename;
-- 기대값: rls_enabled = true for all rows


-- ════════════════════════════════════════════════
-- [CHECK 2] Helper 함수 존재 + SECURITY DEFINER 확인
-- ════════════════════════════════════════════════
SELECT
  proname          AS function_name,
  prosecdef        AS is_security_definer,
  provolatile      AS volatility   -- 's' = STABLE
FROM pg_proc
WHERE proname IN (
    'is_admin', 'is_manager', 'is_employee',
    'auth_user_role', 'auth_user_company_id',
    'profiles_protect_sensitive_fields'
  )
  AND pronamespace = 'public'::regnamespace
ORDER BY proname;
-- 기대값: is_security_definer = true for 5 helper functions


-- ════════════════════════════════════════════════
-- [CHECK 3] 정책 목록 전체 확인
-- ════════════════════════════════════════════════
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual      AS using_expr,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ════════════════════════════════════════════════
-- [SCENARIO 1] employee — 본인 급여만 보이는지
--
-- 준비: 아래 UUID를 실제 employee 역할 사용자로 교체
-- ════════════════════════════════════════════════
/*
BEGIN;

-- employee 사용자 컨텍스트 시뮬레이션
SELECT set_config('request.jwt.claims',
  json_build_object(
    'sub',  '<employee-user-uuid>',
    'role', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

-- 본인 pay_info_v2만 반환되어야 함 (다른 직원 급여 = 0건)
SELECT count(*) AS my_payslips FROM pay_info_v2;

-- 다른 직원 id로 직접 조회 시도 → 0건 기대
SELECT count(*) AS should_be_zero
FROM pay_info_v2
WHERE employee_id = <다른-직원-id>;

-- 본인 employees 행만 보여야 함 (1건)
SELECT count(*) AS my_employee_rows FROM employees;

ROLLBACK;
*/


-- ════════════════════════════════════════════════
-- [SCENARIO 2] manager — 본인 회사 데이터만
-- ════════════════════════════════════════════════
/*
BEGIN;

SELECT set_config('request.jwt.claims',
  json_build_object(
    'sub',  '<manager-user-uuid>',
    'role', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

-- 본인 회사 직원만 나와야 함
SELECT count(*) AS company_employees FROM employees;

-- 본인 회사 급여만 나와야 함
SELECT count(*) AS company_payroll FROM pay_info_v2;

-- 본인 회사 정보만 나와야 함 (1건)
SELECT count(*) AS my_company FROM companies;

-- 다른 회사 급여 직접 조회 → 0건 기대
SELECT count(*) AS should_be_zero
FROM pay_info_v2
WHERE company_id = <다른-회사-id>;

ROLLBACK;
*/


-- ════════════════════════════════════════════════
-- [SCENARIO 3] admin — 전체 접근 확인
-- ════════════════════════════════════════════════
/*
BEGIN;

SELECT set_config('request.jwt.claims',
  json_build_object(
    'sub',  '<admin-user-uuid>',
    'role', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

-- 전체 테이블 카운트 (>1이어야 함)
SELECT count(*) AS all_employees   FROM employees;
SELECT count(*) AS all_payroll     FROM pay_info_v2;
SELECT count(*) AS all_companies   FROM companies;
SELECT count(*) AS all_requests    FROM employee_requests;

ROLLBACK;
*/


-- ════════════════════════════════════════════════
-- [SCENARIO 4] anon — 민감 데이터 접근 불가
-- ════════════════════════════════════════════════
/*
BEGIN;

SET LOCAL ROLE anon;

SELECT count(*) AS should_be_zero FROM employees;
SELECT count(*) AS should_be_zero FROM pay_info_v2;
SELECT count(*) AS should_be_zero FROM pay_info;
SELECT count(*) AS should_be_zero FROM profiles;
SELECT count(*) AS should_be_zero FROM employee_requests;

-- company_admin_requests INSERT는 가능해야 함 (회사 가입신청)
-- (실제 INSERT 테스트는 별도 진행)

ROLLBACK;
*/


-- ════════════════════════════════════════════════
-- [SCENARIO 5] profiles.role 변조 방지 확인
-- ════════════════════════════════════════════════
/*
BEGIN;

-- employee 사용자가 자신의 role을 admin으로 바꾸려 시도
SELECT set_config('request.jwt.claims',
  json_build_object(
    'sub',  '<employee-user-uuid>',
    'role', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

-- role 변경 시도 — 트리거가 OLD.role로 복원해야 함
UPDATE profiles
SET role = 'admin'
WHERE id = '<employee-user-uuid>';

-- 실제 role 확인 → 'employee' 그대로이어야 함
SELECT role FROM profiles WHERE id = '<employee-user-uuid>';

ROLLBACK;
*/


-- ════════════════════════════════════════════════
-- [SCENARIO 6] 기존 기능 흐름 점검 쿼리
-- 실제 프로덕션 데이터로 각 역할 기준 카운트 확인
-- ════════════════════════════════════════════════

-- 현재 각 테이블 행 수 (service_role 기준 — 전체)
SELECT 'employees'              AS tbl, count(*) AS cnt FROM employees
UNION ALL
SELECT 'pay_info'               AS tbl, count(*) AS cnt FROM pay_info
UNION ALL
SELECT 'profiles'               AS tbl, count(*) AS cnt FROM profiles
UNION ALL
SELECT 'companies'              AS tbl, count(*) AS cnt FROM companies
UNION ALL
SELECT 'notifications'          AS tbl, count(*) AS cnt FROM notifications;
-- pay_info_v2, employee_requests 등은 존재할 경우 추가
