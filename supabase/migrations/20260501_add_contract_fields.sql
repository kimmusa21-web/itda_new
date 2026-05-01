-- 직원 테이블에 계약직 여부 및 계약만료일 추가
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS is_contract      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS contract_end_date DATE;

COMMENT ON COLUMN employees.is_contract       IS '계약직 여부 (true = 계약직, false = 정규직)';
COMMENT ON COLUMN employees.contract_end_date IS '계약만료일 (계약직인 경우)';
