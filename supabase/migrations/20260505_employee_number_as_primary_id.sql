-- ================================================================
-- Phase 1: 사번을 직원 식별 기준으로 변경
-- - 이메일 기반 유니크 제약 전체 제거
-- - employee_number NOT NULL 강제
-- - employee_number 유니크 인덱스를 전체(partial 제거) 유니크로 교체
-- ================================================================

-- 1. 이메일 기반 제약·인덱스 제거
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_company_email_unique;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_company_id_email_key;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_email_company_unique;
DROP INDEX IF EXISTS employees_active_email_company_unique;

-- 2. employee_number NOT NULL 강제
ALTER TABLE employees ALTER COLUMN employee_number SET NOT NULL;

-- 3. 기존 partial 유니크 인덱스(WHERE IS NOT NULL) 제거 후
--    전체 유니크 인덱스로 교체
DROP INDEX IF EXISTS idx_employees_company_employee_number;
CREATE UNIQUE INDEX idx_employees_company_employee_number
  ON employees (company_id, employee_number);

-- 4. 이메일 검색용 비유니크 인덱스는 유지 (idx_employees_company_email, idx_employees_email)
