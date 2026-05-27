-- ================================================================
-- itda — 보안 취약점 수정 (2026-05-27)
--
-- 수정 항목:
--   1. push_subscriptions — RLS 활성화
--   2. profile_summary 뷰 — SECURITY INVOKER 변경
--   3. 내부 함수 — anon EXECUTE 권한 회수
--   4. 함수 search_path — 고정
--   5. biz-docs 스토리지 — 파일 목록 조회 제한
-- ================================================================


-- ── 1. push_subscriptions RLS ────────────────────────────────────

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- employee: 본인 구독만 조회/등록/삭제
CREATE POLICY "push_subscriptions: employee select own"
  ON push_subscriptions FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "push_subscriptions: employee insert own"
  ON push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "push_subscriptions: employee delete own"
  ON push_subscriptions FOR DELETE TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- service_role: 전체 관리 (푸시 알림 발송 API)
CREATE POLICY "push_subscriptions: service role all"
  ON push_subscriptions FOR ALL
  USING (auth.role() = 'service_role');


-- ── 2. profile_summary 뷰 — SECURITY INVOKER 변경 ────────────────
-- 기존 뷰가 SECURITY DEFINER로 동작해 RLS를 우회하므로
-- security_invoker = true로 재생성 (PostgreSQL 15+)

CREATE OR REPLACE VIEW profile_summary
  WITH (security_invoker = true)
AS
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

COMMENT ON VIEW profile_summary IS '어드민 전용 사용자 현황 뷰 (security_invoker=true — RLS 정책 적용됨)';


-- ── 3. 내부 함수 — anon EXECUTE 권한 회수 ────────────────────────
-- anon(비로그인) 사용자가 내부 함수를 REST API로 직접 호출할 수 없도록 제한

REVOKE EXECUTE ON FUNCTION public.accrue_monthly_leave_daily()        FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_company_request(bigint)     FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_employee_email_exists(text, bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_company_id()                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_employee_id()                FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_role()                       FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user()              FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                   FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_link()              FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin()                          FROM anon;


-- ── 4. 함수 search_path 고정 ─────────────────────────────────────
-- search_path가 고정되지 않으면 search_path 인젝션 취약점이 발생할 수 있음
-- SECURITY DEFINER 함수는 특히 고정이 중요

ALTER FUNCTION public.approve_company_request(bigint)           SET search_path = 'public';
ALTER FUNCTION public.check_employee_email_exists(text, bigint) SET search_path = 'public';
ALTER FUNCTION public.get_my_company_id()                       SET search_path = 'public';
ALTER FUNCTION public.get_my_employee_id()                      SET search_path = 'public';
ALTER FUNCTION public.get_my_role()                             SET search_path = 'public';
ALTER FUNCTION public.handle_new_user()                         SET search_path = 'public';
ALTER FUNCTION public.handle_new_user_link()                    SET search_path = 'public';
ALTER FUNCTION public.handle_updated_at()                       SET search_path = 'public';
ALTER FUNCTION public.set_updated_at()                          SET search_path = 'public';
ALTER FUNCTION public.set_updated_at_v2()                       SET search_path = 'public';
ALTER FUNCTION public.update_updated_at_column()                SET search_path = 'public';


-- ── 5. biz-docs 버킷 — 파일 목록 조회 제한 ──────────────────────
-- 기존 정책은 anon 포함 전체 공개(TO public)라 파일 목록이 노출됨.
-- 직접 URL 접근은 public 버킷이므로 그대로 가능하고,
-- 목록 조회(listing)는 admin/service_role만 허용.

DROP POLICY IF EXISTS "public can read biz docs" ON storage.objects;

CREATE POLICY "admin can list biz docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'biz-docs' AND public.is_admin());

CREATE POLICY "service_role can list biz docs"
  ON storage.objects FOR SELECT TO service_role
  USING (bucket_id = 'biz-docs');
