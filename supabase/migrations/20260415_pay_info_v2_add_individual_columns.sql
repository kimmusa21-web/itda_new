/* ================================================================
   pay_info_v2 — pay_info 개별 급여 항목 컬럼 추가 + 백필
   earnings/deductions JSONB와 1:1 대응하는 개별 NUMERIC 컬럼
================================================================ */

-- ── 1. 지급 항목 개별 컬럼 추가 ─────────────────────────────
ALTER TABLE pay_info_v2
  ADD COLUMN IF NOT EXISTS base_salary               NUMERIC,
  ADD COLUMN IF NOT EXISTS overtime_pay_fixed         NUMERIC,
  ADD COLUMN IF NOT EXISTS overtime_pay               NUMERIC,
  ADD COLUMN IF NOT EXISTS holidaytime_pay            NUMERIC,
  ADD COLUMN IF NOT EXISTS nighttime_pay              NUMERIC,
  ADD COLUMN IF NOT EXISTS meal_allowance             NUMERIC,
  ADD COLUMN IF NOT EXISTS incentive                  NUMERIC,
  ADD COLUMN IF NOT EXISTS annual_leave_allowance     NUMERIC,
  ADD COLUMN IF NOT EXISTS "Other_allowances"         NUMERIC,
  ADD COLUMN IF NOT EXISTS "Other_allowances2"        NUMERIC,
  ADD COLUMN IF NOT EXISTS "Holiday_bonus"            NUMERIC,
  ADD COLUMN IF NOT EXISTS "Total_payment"            NUMERIC;

-- ── 2. 공제 항목 개별 컬럼 추가 ─────────────────────────────
ALTER TABLE pay_info_v2
  ADD COLUMN IF NOT EXISTS national_pension           NUMERIC,
  ADD COLUMN IF NOT EXISTS health_insurance           NUMERIC,
  ADD COLUMN IF NOT EXISTS longterm_care              NUMERIC,
  ADD COLUMN IF NOT EXISTS employment_insurance       NUMERIC,
  ADD COLUMN IF NOT EXISTS income_tax                 NUMERIC,
  ADD COLUMN IF NOT EXISTS resident_tax               NUMERIC,
  ADD COLUMN IF NOT EXISTS student_loan               NUMERIC,
  ADD COLUMN IF NOT EXISTS income_tax_refund          NUMERIC,
  ADD COLUMN IF NOT EXISTS resident_tax_refund        NUMERIC,
  ADD COLUMN IF NOT EXISTS "Total_deductible"         NUMERIC,
  ADD COLUMN IF NOT EXISTS "Other_deductions"         NUMERIC,
  ADD COLUMN IF NOT EXISTS health_insurance_adjustment NUMERIC;

-- ── 3. 기존 데이터 백필 (earnings/deductions JSONB → 개별 컬럼) ──
UPDATE pay_info_v2 SET
  -- 지급 항목
  base_salary               = NULLIF((earnings->>'base_salary')::text, '')::numeric,
  overtime_pay_fixed        = NULLIF((earnings->>'overtime_pay_fixed')::text, '')::numeric,
  overtime_pay              = NULLIF((earnings->>'overtime_pay')::text, '')::numeric,
  holidaytime_pay           = NULLIF((earnings->>'holidaytime_pay')::text, '')::numeric,
  nighttime_pay             = NULLIF((earnings->>'nighttime_pay')::text, '')::numeric,
  meal_allowance            = NULLIF((earnings->>'meal_allowance')::text, '')::numeric,
  incentive                 = NULLIF((earnings->>'incentive')::text, '')::numeric,
  annual_leave_allowance    = NULLIF((earnings->>'annual_leave_allowance')::text, '')::numeric,
  "Other_allowances"        = NULLIF((earnings->>'Other_allowances')::text, '')::numeric,
  "Other_allowances2"       = NULLIF((earnings->>'Other_allowances2')::text, '')::numeric,
  "Holiday_bonus"           = NULLIF((earnings->>'Holiday_bonus')::text, '')::numeric,
  "Total_payment"           = CASE WHEN total_earnings <> 0 THEN total_earnings ELSE NULL END,
  -- 공제 항목
  national_pension          = NULLIF((deductions->>'national_pension')::text, '')::numeric,
  health_insurance          = NULLIF((deductions->>'health_insurance')::text, '')::numeric,
  longterm_care             = NULLIF((deductions->>'longterm_care')::text, '')::numeric,
  employment_insurance      = NULLIF((deductions->>'employment_insurance')::text, '')::numeric,
  income_tax                = NULLIF((deductions->>'income_tax')::text, '')::numeric,
  resident_tax              = NULLIF((deductions->>'resident_tax')::text, '')::numeric,
  student_loan              = NULLIF((deductions->>'student_loan')::text, '')::numeric,
  income_tax_refund         = NULLIF((deductions->>'income_tax_refund')::text, '')::numeric,
  resident_tax_refund       = NULLIF((deductions->>'resident_tax_refund')::text, '')::numeric,
  "Total_deductible"        = CASE WHEN total_deductions <> 0 THEN total_deductions ELSE NULL END,
  "Other_deductions"        = NULLIF((deductions->>'Other_deductions')::text, '')::numeric,
  health_insurance_adjustment = NULLIF((deductions->>'health_insurance_adjustment')::text, '')::numeric,
  updated_at = now()
WHERE earnings IS NOT NULL OR deductions IS NOT NULL;
