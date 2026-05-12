-- 직원이 자신이 소속된 회사 정보를 조회할 수 있도록 RLS 정책 추가
-- (출퇴근 시 회사 위치·허용반경 조회에 필요)
CREATE POLICY "employee_view_own_company"
ON companies
FOR SELECT
TO authenticated
USING (
  id = get_my_company_id()
  AND get_my_role() = 'employee'
);
