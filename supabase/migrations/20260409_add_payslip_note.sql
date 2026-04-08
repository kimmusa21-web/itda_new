-- ═══════════════════════════════════════════════════════════════════
-- itda — companies.payslip_note 추가
-- 급여명세서 하단 "산출 근거" 영역을 회사별로 커스터마이징할 수 있도록
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS payslip_note TEXT;

COMMENT ON COLUMN companies.payslip_note IS
  '급여명세서 하단 산출 근거 텍스트.
   NULL 또는 빈 값이면 시스템 기본값 사용.
   줄바꿈(\n) 기준으로 항목 구분.';
