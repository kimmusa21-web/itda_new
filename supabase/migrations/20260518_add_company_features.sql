-- 회사별 기능 활성화 관리
-- features JSONB 컬럼: 각 기능의 활성화 여부를 저장
-- 직원관리(employees)는 기본 기능으로 항상 true

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{
    "employees": true,
    "attendance": false,
    "leave": false,
    "documents": false,
    "payroll": false
  }'::jsonb;

-- 기존 회사들은 직원관리만 활성화된 상태로 초기화
UPDATE companies
SET features = '{
  "employees": true,
  "attendance": false,
  "leave": false,
  "documents": false,
  "payroll": false
}'::jsonb
WHERE features IS NULL OR features = '{}'::jsonb;
