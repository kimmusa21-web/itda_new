/* ================================================================
   pay_info → pay_info_v2 완전 흡수 마이그레이션
   1. pay_info_v2에 누락 컬럼 추가 (Number_of_days, Total_tax_salary)
   2. pay_info 데이터 전체 백필 (7행)
   3. pay_info를 deprecated 상태로 표시
================================================================ */

-- ── 1. 누락 컬럼 추가 ─────────────────────────────────────────
ALTER TABLE pay_info_v2
  ADD COLUMN IF NOT EXISTS "Number_of_days"   NUMERIC,
  ADD COLUMN IF NOT EXISTS "Total_tax_salary"  NUMERIC;

COMMENT ON COLUMN pay_info_v2."Number_of_days"  IS '해당 급여 정산 기간의 총 일수 (pay_info.Number_of_days 이관)';
COMMENT ON COLUMN pay_info_v2."Total_tax_salary" IS '과세급여합계 (pay_info.Total_tax_salary 이관)';

-- ── 2. pay_info 데이터 백필 ────────────────────────────────────
--   충돌 조건: (company_id, employee_id, accrual_month) UNIQUE
--   우선순위: pay_info_v2 기존 값 > pay_info 이관값 (COALESCE)
--   TEXT → NUMERIC 변환: NULLIF(trim(v),'')::numeric (빈문자·NULL 안전)
--   음수 환급값 보존: income_tax_refund 등 음수 문자열 그대로 변환

INSERT INTO pay_info_v2 (
  company_id,
  employee_id,
  accrual_month,
  payment_date,
  start_date,
  end_date,
  "Number_of_days",
  work_days,
  overtime_hours,
  "Holiday_working_hours",
  night_work_hours,
  "Remaining_annual_leave_hours",
  earnings,
  deductions,
  total_earnings,
  total_deductions,
  net_pay,
  "Total_tax_salary",
  calculation_notes,
  upload_log_id
)
SELECT
  src.company_id,
  src.employee_id,
  src.accrual_month,
  src.payment_date,
  src."Start_date",
  src."End_date",
  src."Number_of_days",
  src.working_days,
  src."Overtime",
  src."Holiday_working_hours",
  src.night_work_hours,
  src."Remaining_annual_leave_hours",
  /* ── earnings JSONB 빌드 ── */
  (
    SELECT jsonb_object_agg(k, v)
    FROM (VALUES
      ('base_salary',            NULLIF(trim(src.base_salary), '')::numeric),
      ('overtime_pay_fixed',     NULLIF(trim(src.overtime_pay_fixed), '')::numeric),
      ('overtime_pay',           NULLIF(trim(src.overtime_pay), '')::numeric),
      ('holidaytime_pay',        NULLIF(trim(src.holidaytime_pay), '')::numeric),
      ('nighttime_pay',          NULLIF(trim(src.nighttime_pay), '')::numeric),
      ('meal_allowance',         NULLIF(trim(src.meal_allowance), '')::numeric),
      ('incentive',              NULLIF(trim(src.incentive), '')::numeric),
      ('annual_leave_allowance', NULLIF(trim(src.annual_leave_allowance), '')::numeric),
      ('Other_allowances',       NULLIF(trim(src."Other_allowances"), '')::numeric),
      ('Other_allowances2',      NULLIF(trim(src."Other_allowances2"), '')::numeric),
      ('Holiday_bonus',          NULLIF(trim(src."Holiday_bonus"), '')::numeric)
    ) AS t(k, v)
    WHERE v IS NOT NULL AND v <> 0
  ),
  /* ── deductions JSONB 빌드 (음수 환급값 보존) ── */
  (
    SELECT jsonb_object_agg(k, v)
    FROM (VALUES
      ('national_pension',            NULLIF(trim(src.national_pension), '')::numeric),
      ('health_insurance',            NULLIF(trim(src.health_insurance), '')::numeric),
      ('longterm_care',               NULLIF(trim(src.longterm_care), '')::numeric),
      ('employment_insurance',        NULLIF(trim(src.employment_insurance), '')::numeric),
      ('income_tax',                  NULLIF(trim(src.income_tax), '')::numeric),
      ('resident_tax',                NULLIF(trim(src.resident_tax), '')::numeric),
      ('student_loan',                NULLIF(trim(src.student_loan), '')::numeric),
      ('income_tax_refund',           NULLIF(trim(src.income_tax_refund), '')::numeric),
      ('resident_tax_refund',         NULLIF(trim(src.resident_tax_refund), '')::numeric),
      ('health_insurance_adjustment', NULLIF(trim(src.health_insurance_adjustment), '')::numeric),
      ('Other_deductions',            NULLIF(trim(src."Other_deductions"), '')::numeric)
    ) AS t(k, v)
    WHERE v IS NOT NULL AND v <> 0
  ),
  /* ── 합계 ── */
  COALESCE(NULLIF(trim(src."Total_payment"), '')::numeric, 0),
  COALESCE(NULLIF(trim(src."Total_deductible"), '')::numeric, 0),
  COALESCE(NULLIF(trim(src.net_pay), '')::numeric, 0),
  /* ── 과세급여합계 ── */
  NULLIF(trim(src."Total_tax_salary"), '')::numeric,
  /* ── 이관 메모 ── */
  jsonb_build_array('pay_info 이관'),
  NULL   -- upload_log_id 없음
FROM pay_info src
ON CONFLICT (company_id, employee_id, accrual_month) DO UPDATE SET
  -- 날짜/기간: v2 값 우선, 없으면 pay_info 값
  payment_date                 = COALESCE(pay_info_v2.payment_date,                 EXCLUDED.payment_date),
  start_date                   = COALESCE(pay_info_v2.start_date,                   EXCLUDED.start_date),
  end_date                     = COALESCE(pay_info_v2.end_date,                     EXCLUDED.end_date),
  "Number_of_days"             = COALESCE(pay_info_v2."Number_of_days",             EXCLUDED."Number_of_days"),
  work_days                    = COALESCE(pay_info_v2.work_days,                    EXCLUDED.work_days),
  overtime_hours               = COALESCE(pay_info_v2.overtime_hours,               EXCLUDED.overtime_hours),
  "Holiday_working_hours"      = COALESCE(pay_info_v2."Holiday_working_hours",      EXCLUDED."Holiday_working_hours"),
  night_work_hours             = COALESCE(pay_info_v2.night_work_hours,             EXCLUDED.night_work_hours),
  "Remaining_annual_leave_hours" = COALESCE(pay_info_v2."Remaining_annual_leave_hours", EXCLUDED."Remaining_annual_leave_hours"),
  -- earnings: v2 데이터 있으면 유지, 없으면(빈 {}) pay_info 이관값 사용
  earnings    = CASE
    WHEN pay_info_v2.earnings IS NOT NULL AND pay_info_v2.earnings <> '{}'::jsonb
    THEN pay_info_v2.earnings
    ELSE COALESCE(EXCLUDED.earnings, '{}'::jsonb)
  END,
  -- deductions: 동일 원칙
  deductions  = CASE
    WHEN pay_info_v2.deductions IS NOT NULL AND pay_info_v2.deductions <> '{}'::jsonb
    THEN pay_info_v2.deductions
    ELSE COALESCE(EXCLUDED.deductions, '{}'::jsonb)
  END,
  -- 합계: v2 값이 0이 아니면 유지
  total_earnings   = CASE WHEN pay_info_v2.total_earnings  <> 0 THEN pay_info_v2.total_earnings  ELSE EXCLUDED.total_earnings  END,
  total_deductions = CASE WHEN pay_info_v2.total_deductions <> 0 THEN pay_info_v2.total_deductions ELSE EXCLUDED.total_deductions END,
  net_pay          = CASE WHEN pay_info_v2.net_pay          <> 0 THEN pay_info_v2.net_pay          ELSE EXCLUDED.net_pay          END,
  -- 신규 컬럼: v2 값 없으면 pay_info 값 채움
  "Total_tax_salary" = COALESCE(pay_info_v2."Total_tax_salary", EXCLUDED."Total_tax_salary"),
  -- calculation_notes: 이관 메모 병합
  calculation_notes = (
    COALESCE(pay_info_v2.calculation_notes, '[]'::jsonb)
    || CASE
         WHEN pay_info_v2.calculation_notes @> '["pay_info 이관"]'::jsonb THEN '[]'::jsonb
         ELSE '["pay_info 이관"]'::jsonb
       END
  ),
  updated_at = now();

-- ── 3. pay_info 테이블 deprecated 표시 ────────────────────────
COMMENT ON TABLE pay_info IS
  '@deprecated — 2026-04-14 pay_info_v2로 완전 이관 완료. 신규 코드는 pay_info_v2를 사용하세요. 이 테이블은 롤백 보험용으로만 유지되며 추후 삭제 예정입니다.';
