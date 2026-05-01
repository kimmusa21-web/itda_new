ALTER TABLE pay_info_v2
  ADD COLUMN IF NOT EXISTS basic_work_time NUMERIC;

COMMENT ON COLUMN pay_info_v2.basic_work_time IS '기본근로시간(h) — CSV 직접 입력값, null이면 근무일수 기반 계산';
