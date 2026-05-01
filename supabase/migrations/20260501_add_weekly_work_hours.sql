-- 직원 테이블에 1주 소정근로시간 추가
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS weekly_work_hours SMALLINT;

COMMENT ON COLUMN employees.weekly_work_hours IS '1주 소정근로시간 (단위: 시간)';
