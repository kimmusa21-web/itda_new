-- 직원 테이블에 외국인 여부·국적·비자유형 추가
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS is_foreigner BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nationality  TEXT,
  ADD COLUMN IF NOT EXISTS visa_type    TEXT;

COMMENT ON COLUMN employees.is_foreigner IS '외국인 여부';
COMMENT ON COLUMN employees.nationality  IS '국적 (국가명)';
COMMENT ON COLUMN employees.visa_type    IS '비자 유형';
