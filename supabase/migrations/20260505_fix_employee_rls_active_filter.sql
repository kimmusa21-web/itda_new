-- ================================================================
-- get_my_employee_id / employee_own_record RLS 수정
-- 재입사 시 이전 회사 급여 데이터 노출 방지
-- is_active = true 조건 추가
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_my_employee_id()
  RETURNS bigint
  LANGUAGE sql
  STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.employees
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

DROP POLICY IF EXISTS "employee_own_record" ON employees;
CREATE POLICY "employee_own_record" ON employees
  FOR SELECT
  USING (user_id = auth.uid() AND is_active = true);
