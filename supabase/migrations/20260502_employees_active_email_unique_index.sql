-- 재직 직원(is_active=true) 기준 이메일 유니크 인덱스
-- 퇴사자(is_active=false)는 중복 이메일 허용 → 재입사 지원
CREATE UNIQUE INDEX IF NOT EXISTS employees_active_email_company_unique
ON employees (company_id, lower(email))
WHERE is_active = true;
