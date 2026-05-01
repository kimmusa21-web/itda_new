-- 직원 테이블에 주민(외국인)등록번호 추가
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS registration_number TEXT;

COMMENT ON COLUMN employees.registration_number IS '주민(외국인)등록번호 (13자리, 하이픈 포함)';
