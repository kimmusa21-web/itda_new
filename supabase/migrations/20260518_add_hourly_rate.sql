-- 시급제 직원 통상시급 저장
ALTER TABLE pay_info_v2 ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC;
