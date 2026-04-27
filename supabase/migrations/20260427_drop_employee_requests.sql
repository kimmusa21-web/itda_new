-- ═══════════════════════════════════════════════════════════════════
-- itda — employee_requests 플로우 제거
--
-- 직원 초대는 employee_invites 기반 직접 초대 플로우로 통일.
-- 어드민 승인 단계(employee_requests)는 회사 가입 신청에만 사용.
-- ═══════════════════════════════════════════════════════════════════

-- 1. employee_invites의 FK 컬럼 제거
ALTER TABLE employee_invites DROP COLUMN IF EXISTS employee_request_id;

-- 2. employee_verification_codes 테이블 제거 (employee_requests에 종속)
DROP TABLE IF EXISTS employee_verification_codes;

-- 3. employee_requests 테이블 제거
DROP TABLE IF EXISTS employee_requests;
