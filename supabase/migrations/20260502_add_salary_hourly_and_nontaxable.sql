-- salary_type CHECK constraint에 hourly 추가
ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_salary_type_check;

ALTER TABLE employees
  ADD CONSTRAINT employees_salary_type_check
  CHECK (salary_type IS NULL OR salary_type = ANY (ARRAY['annual'::text, 'monthly'::text, 'hourly'::text]));

-- 비과세 항목 (JSON 배열: [{name, amount}, ...])
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS non_taxable_items JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN employees.non_taxable_items IS '비과세 항목 목록 [{name, amount}] — 4대보험 신고 기준액 산정용';

-- 과세총액합계 (salary_amount - 비과세 합계, 4대보험 신고 기준)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS taxable_total BIGINT;

COMMENT ON COLUMN employees.taxable_total IS '과세총액합계 (salary_amount − 비과세합계) — 4대보험 신고 기준액';
