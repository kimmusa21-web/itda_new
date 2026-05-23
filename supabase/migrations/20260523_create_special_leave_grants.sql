CREATE TABLE special_leave_grants (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_kind  TEXT NOT NULL,
  days        NUMERIC(4,1) NOT NULL CHECK (days > 0),
  note        TEXT,
  grant_date  DATE NOT NULL,
  expires_at  DATE,
  granted_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE special_leave_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manager_all_special_leave_grants"
  ON special_leave_grants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','admin') AND (company_id = special_leave_grants.company_id OR role = 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','admin') AND (company_id = special_leave_grants.company_id OR role = 'admin')));

CREATE POLICY "employee_select_own_special_leave_grants"
  ON special_leave_grants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM employees WHERE id = special_leave_grants.employee_id AND user_id = auth.uid()));
