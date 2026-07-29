-- ================================================================
-- itda — 근태 위치 주소(역지오코딩) 저장 컬럼 추가
-- 외근/재택 등록 시 현재 위치를 주소로 변환하여 별도 보관한다.
-- (좌표는 기존 check_in_latitude/longitude 컬럼에 계속 저장)
-- ================================================================

ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS check_in_address  TEXT,
  ADD COLUMN IF NOT EXISTS check_out_address TEXT;

COMMENT ON COLUMN attendance_logs.check_in_address  IS '출근 시각 현재 위치의 역지오코딩 주소 (외근/재택 위치 기록용)';
COMMENT ON COLUMN attendance_logs.check_out_address IS '퇴근 시각 현재 위치의 역지오코딩 주소';
